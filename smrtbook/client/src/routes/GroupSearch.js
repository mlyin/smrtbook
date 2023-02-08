import { useState, useEffect } from 'react';
import axios from "axios";
import { useNavigate } from 'react-router-dom';

var db = require("../database.js");

function GroupSearch() {
    // initialize states
    const [search, setSearch] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [groups, setGroups] = useState([]);
    const [error, setError] = useState("");
    const [user, setUser] = useState("");
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

      // update state if the search term changes
    const handleSearchChange = (e) => {
        setSearch(e.target.value);
    }

    // handle when a user joins a group
    const handleJoin = (e) => {
        db.joinGroup(user, e.target.id, function(err, data) {
            if (err) {
                console.log(err);
                setError("Error with joining group");
            } else {
                setError("");
                setGroups((groups) => {
                    return [...groups, e.target.id];
                });
                db.getGroupSuggestions(search, function (err, data) {
                    if (err) {
                        console.log("Search suggestions doesn't work")
                        setError("Error with finding search suggestions");
                    } else {
                        var arry = [];
                        try {
                            data.Items.forEach(e => {
                                arry.push(e.group.S);
                                if (arry.length >= 15) throw "break";
                            });
                        } catch (e) {
                            if (e !== "break") throw e;
                        }
                        setError("");
                        setSuggestions(arry);
                        
                    }
                })
            }
        })
    }

    // handle when a user creates a group
    const handleCreate = (e) => {
        db.createGroup(user, search, function(err, data) {
            if (err) {
                console.log(err);
                setError("Error with creating group");
            } else if (data) {
                setError("");
                setGroups((groups) => {
                    return [...groups, e.target.id];
                });
                db.getGroupSuggestions(search, function (err, data) {
                    if (err) {
                        console.log("Search suggestions doesn't work")
                        setError("Error with finding search suggestions");
                    } else {
                        var arry = [];
                        try {
                            data.Items.forEach(e => {
                                arry.push(e.group.S);
                                if (arry.length >= 15) throw "break";
                            });
                        } catch (e) {
                            if (e !== "break") throw e;
                        }
                        setError("");
                        setSuggestions(arry);
                        
                    }
                })
            } else {
                setError("Cannot create groups with the same name as a user. Please try again.")
            }
        })
    }

    // create html from data
    const loadSuggestions = () => {
        console.log("the suggestions are")
        console.log(suggestions);
        var res = []
        // if no results, opion to create group
        if (suggestions.length === 0 && search !== "") {
            res.push (
                <tr>
                    <th scope="row">No Results?</th>
                    <th scopr="row"><button type="button" className="btn btn-warning" onClick={(e) => handleCreate(e)}>Create a Group</button></th>
                </tr>
            )
        } else {
            // conditionally render based off of if youre in the group or not
            suggestions.forEach((group) => {
                const url = "/group/" + group;
                if (groups.indexOf(group) >= 0) {
                    res.push (
                        <tr>
                            <th scope="row"><a href={url} class="link-dark">{group}</a></th>
                            <th scopr="row"><button type="button" id={group} className="btn btn-primary" disabled>Joined</button></th>
                        </tr>
                    )
                } else {
                    res.push(
                        <tr>
                            <th scope="row"><a href={url} class="link-dark">{group}</a></th>
                            <th scopr="row"><button type="button" id={group} className="btn btn-primary" onClick={(e) => handleJoin(e)}>Join Group</button></th>
                        </tr>
                    )
                }
            })
        }
        return res;
    }

    useEffect(() => {
        if (user === "") return;
        console.log("Suggestions");
        console.log(suggestions);
        if (search === "") return;
        // get suggestions based off of search input
        db.getGroupSuggestions(search, function (err, data) {
            if (err) {
                console.log("Search suggestions doesn't work")
                setError("Error with finding search suggestions");
            } else {
                var arry = [];
                try {
                    data.Items.forEach(e => {
                        arry.push(e.group.S);
                        if (arry.length >= 15) throw "break";
                    });
                } catch (e) {
                    if (e !== "break") throw e;
                }
                setError("");
                setSuggestions(arry);
                
            }
        })
        // preload what groups you're already in
            db.getGroups(user, function (err, data) {
                if (err) {
                    setError("Error with getting your groups");
                } else {
                    if (data.Items[0].groups) {
                        setGroups(data.Items[0].groups.SS)
                        setError("");
                    } else {
                        setGroups([]);
                        setError("");
                    }
                    
                }
            })
    }, [search, user])

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
                    <small id="emailHelp" className="form-text text-muted">Please search for groups by group name</small>
                </div>
            </form>
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th scope="col">Name</th>
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

export default GroupSearch;