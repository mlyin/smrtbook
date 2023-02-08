import { useState, useEffect } from 'react';
import axios from "axios";
import { useNavigate } from 'react-router-dom';


var db = require("../database.js");

function UserSearch() {
    const [search, setSearch] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [pending, setPending] = useState([]);
    const [requests, setRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [error, setError] = useState("");
    const [user, setUser] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // wait a tiny amount of time before checking this so that the user has time to be set
        setTimeout(() => {
          axios
            .get("http://localhost:4000/user", { withCredentials: true })
            .then((res) => {
              if (res.data.username === "") {
                navigate("/login");
                return;
              }
              setUser(res.data.username);
            })
            .catch((err) => {
              console.error(err);
            });
        }, 100);
      }, []);

      // update state based off of entry in search input field
    const handleSearchChange = (e) => {
        setSearch(e.target.value);
    }

    const handleRequest = (e) => {
        db.requestFriend(user, e.target.id, function(err, data) {
            if (err) {
                console.log(err);
                setError("Error with requesting Friend");
            } else {
                setError("");
                setPending((pending) => {
                    return [...pending, e.target.id];
                });
            }
        })
    }

    // handle the accepptance of a friend request
    const handleAccept = (e) => {
        let newRequests = requests;
        const index = newRequests.indexOf(e.target.id);
        if (index > -1) { // only splice array when item is found
            newRequests.splice(index, 1); // 2nd parameter means remove one item only
        } else {
            setError("Cannot find Friend Request");
        }
        db.addFriend(user, e.target.id, function(err, data) {
            if (err) {
                console.log(err);
                setError("Error with accepting Friend Request");
            } else {
                setError("");
                setFriends((friends) => {
                    return [...friends, e.target.id];
                });
                setRequests(newRequests);
            }
        })
    }

    // load suggestions based off of search input
    const loadSuggestions = () => {
        console.log("the suggestions are")
        console.log(suggestions);
        var res = []
        suggestions.forEach((username) => {
            if (username === user) return;
            const url = "/user/" + username;
            // conditionally render based off of state: pending, request, friend, or N/A
            if (pending.indexOf(username) >= 0) {
                res.push (
                    <tr>
                        <th scope="row"><a href={url} class="link-dark">{username}</a></th>
                        <th scopr="row"><button type="button" id={username} className="btn btn-primary" disabled>Requested</button></th>
                    </tr>
                )
            } else if (requests.indexOf(username) >= 0) {
                res.push (
                    <tr>
                        <th scope="row"><a href={url} class="link-dark">{username}</a></th>
                        <th scopr="row"><button type="button" id={username} className="btn btn-success" onClick={(e) => handleAccept(e)}>Accept Request</button></th>
                    </tr>
                )
            } else if (friends.indexOf(username) >= 0) {
                res.push (
                    <tr>
                        <th scope="row"><a href={url} class="link-dark">{username}</a></th>
                        <th scopr="row"><button type="button" id={username} className="btn btn-success" disabled>Friends</button></th>
                    </tr>
                )
            } else {
                res.push(
                    <tr>
                        <th scope="row"><a href={url} class="link-dark">{username}</a></th>
                        <th scopr="row"><button type="button" id={username} className="btn btn-primary" onClick={(e) => handleRequest(e)}>Request Friend</button></th>
                    </tr>
                )
            }
            
        })
        return res;
    }

    useEffect(() => {
        if (search === "") return;
        db.getSuggestions(search, function (err, data) {
            if (err) {
                console.log("Search suggestions doesn't work")
                setError("Error with finding search suggestions");
            } else {
                var arry = [];
                try {
                    data.Items.forEach(e => {
                        arry.push(e.username.S);
                        if (arry.length >= 15) throw "break";
                    });
                } catch (e) {
                    if (e !== "break") throw e;
                }
                setError("");
                setSuggestions(arry);
                
            }
        })
        // dynamic updates on a timer
        const interval = setInterval(() => {
            console.log("Suggestions");
            console.log(suggestions);
            db.getFriends(user, function (err, data) {
                if (err) {
                    setError("Error with getting your friends");
                } else {
                    if (data.Items[0].friends) {
                        setFriends(data.Items[0].friends.SS);
                    }

                    if (data.Items[0].pending) {
                        setPending(data.Items[0].pending.SS);
                    }

                    if (data.Items[0].requests) {
                        setRequests(data.Items[0].requests.SS);
                    }
                    setError("");
                }
            })
        }, 5000)
    }, [search])

    // render html!
    return (
        <>
        {error && error.length > 0 && (
            <div className="alert alert-danger" id="error" role="alert">
            <div>{error}</div>
            </div>
        )}
        <div>
            <form style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="form-group w-75">
                    <label htmlFor="exampleInputEmail1"></label>
                    <input type="search" className="form-control" id="search" aria-describedby="search" placeholder="Search" onChange={handleSearchChange} value={search} />
                    <small id="emailHelp" className="form-text text-muted">Please search for users by username</small>
                </div>
            </form>
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th scope="col">Username</th>
                        <th scope="col">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {loadSuggestions()}
                </tbody>
            </table>
        </div>
        </>
        
    )
}

export default UserSearch;