import React from "react";
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from "axios";

var db = require("../database.js");
function FriendList() {
    // initialize states
    const [friends, setFriends] = useState(new Map());
    const [requests, setRequests] = useState([]);
    const [pending, setPending] = useState([]);
    const [error, setError] = useState("");
    const [user, setUser] = useState("");
    const navigate = useNavigate();

    // get user
    useEffect(() => {
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

    // dynamically update friendlist on an interval
    useEffect(() => {
      if (user === "") {
        return;
      }
      performUpdates();
      const interval = setInterval(() => {
        performUpdates();
      }, 3000);
      return () => clearInterval(interval);
    }, [user]);

    // handler to remove a friend
    const handleRemove = e => {
        // console.log(e);
        let newFriends = friends;
        newFriends.delete(e.target.id);
        db.removeFriend(user, e.target.id, function(err, data) {
            if (err) {
                console.log(err);
                setError("Error with removing friend");
            } else {
                setError("");
                setFriends(newFriends);
            }
        })
    }

    // handler ot accept a friend
    const handleAccept = e => {
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
                db.getStatus(e.target.id, function(err, data) {
                    if (err || !data) {
                        console.log("Error looking up " + e.target.id);
                        setError("Error looking up " + e.target.id);
                        //console.log(err);
                        //console.log(data);
                    } else {
                        console.log(data.BOOL);
                        setError("");
                        setFriends(friends.set(e.target.id, data.BOOL));
                    }
                });
                setError("");
                setFriends(friends.set(e.target.id, false));
                setRequests(newRequests);
            }
        })
    }

    // ahndler to reject a friend request
    const handleReject = e => {
        let newRequests = requests;
        const index = newRequests.indexOf(e.target.id);
        if (index > -1) { // only splice array when item is found
            newRequests.splice(index, 1); // 2nd parameter means remove one item only
        } else {
            setError("Cannot find Friend Request");
        }

        db.rejectFriend(user, e.target.id, function(err, data) {
            if (err) {
                console.log("Error looking up " + e.target.id);
                setError("Error rejecting friend request");
            } else {
                setError("");
                setRequests(newRequests);
            }
        })
    }

    // update data from database, pending friend requests and current firends as well as their activity
    const performUpdates = useCallback(() => {
        // console.log("user: " + user.username)
        if (user === "") return
        db.getFriends(user, function(err, data) {
            if (err) {
                console.log(err);
                setError("Error getting friends")
            } else {
                if (!data.Items[0].friends) {
                    console.log("No friends");
                    setError("No Friends found");
                    setFriends(new Map());
                } else {
                    console.log("here");
                    const dbRes = new Set(); //stores who is returned from database
                    const tempFriends = new Map();
                    console.log(data.Items[0].friends);
                    data.Items[0].friends.SS.forEach((friend) => {
                        dbRes.add(friend);
                        if (!tempFriends.has(friend)) setFriends(new Map(tempFriends.set(friend, true)));
                    })
                    console.log("dbRes");
                    console.log(dbRes);
                    const toRemove = new Set(); //stores who needs to be removed from frontend map
                    tempFriends.forEach((val, key) => {
                        if (!dbRes.has(key)) {
                            toRemove.add(key);
                        }
                    });
                    console.log("To remove: ")
                    console.log(toRemove);
                    //toRemove.forEach((e) => console.log(e));
                    console.log("a")
                    toRemove.forEach((f) => {
                        tempFriends.delete(f);
                        setFriends(new Map(tempFriends));
                    });
                    console.log("b")
                    data.Items[0].friends.SS.forEach((friend) => {
                        db.getStatus(friend, function(err, data) {
                            if (err) {
                                console.log("error looking up " + friend);
                                //console.log(err);
                                //console.log(data);
                            } else if (!data) {
                                if (false !== tempFriends.get(friend)) {
                                    setFriends(new Map(tempFriends.set(friend, false)));
                                }
                            } else {
                                console.log(data.BOOL);
                                if (data.BOOL !== tempFriends.get(friend)) {
                                    setFriends(new Map(tempFriends.set(friend, data.BOOL)));
                                }
                            }
                        });
                        console.log("status of friends: ");
                        console.log(tempFriends);
                        setFriends(tempFriends);
                    })
                    dbRes.clear();
                    toRemove.clear();
                }

                if (!data.Items[0].requests) {
                    console.log("No requests");
                    setError("");
                    setRequests([]);
                } else {
                    setError("");
                    setRequests(data.Items[0].requests.SS);
                }
                if (!data.Items[0].pending) {
                    console.log("No pending");
                    setPending([]);
                } else {
                    setPending(data.Items[0].pending.SS);
                }
            }
        })
    }, [user])

    // render html!
    return (
        <>
        {error && error.length > 0 && (
            <div className="alert alert-danger" id="error" role="alert">
            <div>{error}</div>
            </div>
        )}
            <h1>Friends List</h1>
            <table className="table table-striped table-hover">
                <thead className="thead light">
                    <tr>
                        <th>Username</th>
                        <th>Status</th>
                        <th>Remove Friend</th>
                    </tr>
                </thead>   
                <tbody>
                    {friends && [...friends.keys()].map((key) => <FriendRow username={key} isOnline={friends.get(key)} handleClick={handleRemove} />)}    
                </tbody>
            </table>
            <h1>Pending Friend Requests</h1>
            <table className="table table-striped table-hover">
                <thead className="thead light">
                    <tr>
                        <th>Username</th>
                        <th>Accept Request</th>
                        <th>Reject Request</th>
                    </tr>
                </thead>   
                <tbody>
                    {requests && [...requests].map((key) => <RequestsFriendRow username={key} handleAccept={handleAccept} handleReject={handleReject} />)}    
                </tbody>
            </table>
        </>
    );
}
// component for each row in friend table
function FriendRow(props) {
    const url = "/user/" + props.username;
    return (
        <>
            <tr>
                <td><a href={url} class="link-dark">{props.username}</a></td>
                <td>{props.isOnline ? "online" : "offline"}</td>
                <td><button type="button" id={props.username} className="btn btn-danger" onClick={(e) => props.handleClick(e)}>Remove</button></td>
            </tr>
        </>
    )
}
// component for each row in the friend request table
function RequestsFriendRow(props) {
    const url = "/user/" + props.username;
    return (
        <>
            <tr>
                <td><a href={url} class="link-dark">{props.username}</a></td>
                <td><button type="button" id={props.username} className="btn btn-success" onClick={(e) => props.handleAccept(e)}>Accept</button></td>
                <td><button type="button" id={props.username} className="btn btn-warning" onClick={(e) => props.handleReject(e)}>Reject</button></td>
            </tr>
        </>
    )
}

export default FriendList;