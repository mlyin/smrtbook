import React from "react";
import { useState, useContext, useEffect } from 'react';
import UserContext from "../UserContext";

var db = require("../database.js");

function ChatFriends(props) {
    const [friends, setFriends] = useState(props.friends);
    const [chatUsers, setChatUsers] = useState(props.chatUsers);

    const { user, setUser } = useContext(UserContext);


    // unsure what to do here??
    function performUpdates() {
        props.socket.on('newUserResponse', (data) => setFriends(data));
    }

    useEffect(() => {

        performUpdates();

        const interval = setInterval(() => {
            performUpdates();
        }, 10000)

        return () => clearInterval(interval);

    }, [props.socket, props.friends])

    return (
        <>
        <div className="card-body">
    
        <ul className="list-unstyled mb-0">
            {friends.map((friend) => <FriendRow username={friend} isInChat={friends.findIndex(friend) > -1} onClick={props.addHandler}></FriendRow>)}
        </ul>
    
        </div>
            
        </>
    );
}

function FriendRow(props) {
    let add;
    if (props.isInChat) {
        add = <div className="pt-1">
        <button type="button" className="btn btn-success btn-floating" disabled>
          <i className="fas fa-plus"></i>
        </button>
        </div>;
    } else {
        add = <div className="pt-1">
        <button type="button" className="btn btn-success btn-floating" onClick={props.clickHandler(props.username)}>
          <i className="fas fa-plus"></i>
        </button>
        </div>;
    }
    return (
        <>
            <li className="p-2 border-bottom">
                <a href="#!" className="d-flex justify-content-between">
                  <div className="d-flex flex-row">
                    <div className="pt-1">
                      <p className="fw-bold mb-0">{props.username}</p>
                    </div>
                  </div>
                  {add}
                </a>
            </li>
        </>
    )
}

export default ChatFriends;