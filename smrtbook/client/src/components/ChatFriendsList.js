import React from "react";
import { useState, useEffect } from "react";
import Button from "@mui/material/Button";

var db = require("../database.js");

function ChatFriendsList({ chatName, setChatName, user, socket }) {
  const [friends, setFriends] = useState(new Map());
  const [invited, setInvited] = useState([]);
  useEffect(() => {
    performUpdates();
  }, [user]);

  function performUpdates() {
    if (user !== "") {
      db.getFriends(user, function (err, data) {
        if (err) {
          console.log(err);
        } else if (data == null) {
          console.log("Something went wrong");
        } else {
          const dbRes = new Set(); //stores who is returned from database
          if (!data.Items[0].friends) {
            return;
          }
          data.Items[0].friends.SS.forEach((friend) => {
            dbRes.add(friend);
            if (!friends.has(friend))
              setFriends(new Map(friends.set(friend, true)));
          });
          const toRemove = new Set(); //stores who needs to be removed from frontend map
          friends.forEach((val, key) => {
            if (!dbRes.has(key)) {
              toRemove.add(key);
            }
          });
          toRemove.forEach((f) => {
            friends.delete(f);
            setFriends(new Map(friends));
          });
          data.Items[0].friends.SS.forEach((friend) => {
            db.getStatus(friend, function (err, data) {
              if (err || !data) {
                console.log("error looking up " + friend);
                console.log(err);
                console.log(data);
              } else {
                if (data.BOOL !== friends.get(friend)) {
                  setFriends(new Map(friends.set(friend, data.BOOL)));
                }
              }
            });
          });
          dbRes.clear();
          toRemove.clear();
        }
      });
    }
  }

  useEffect(() => {
    performUpdates();

    const interval = setInterval(() => {
      performUpdates();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <table className="table table-striped table-hover">
        <thead className="thead light">
          <tr>
            <th>Username</th>
            <th>Status</th>
            <th>Direct Message</th>
            <th>Add to Chat</th>
            <th>Add to New Chat</th>
          </tr>
        </thead>
        <tbody>
          {[...friends.keys()].map((key) => (
            <FriendRow
              invited={invited}
              curUser={user}
              username={key}
              key={key}
              isOnline={friends.get(key)}
              chatName={chatName}
              socket={socket}
              performUpdates={performUpdates}
            />
          ))}
        </tbody>
      </table>
    </>
  );
}

function FriendRow(props) {
  function handleInvite() {
    console.log("invite sent");
    console.log(props.invited);
    db.inviteUserToChat(props.curUser, props.username, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        props.performUpdates();
        console.log("invite sent");
        props.socket.emit("event");
      }
    });
    console.log("invite sent");
  }
  async function handleAddToNewChat() {
    console.log("adding to chat");
    props.setChatName(await db.addToNewChat(props.chatName, props.username));
    props.performUpdates();
    console.log("added to chat");
  }

  async function handleAddToSameChat() {
    console.log("adding to chat");
    await db.addToSameChat(props.chatName, props.username);
    props.performUpdates();
    console.log("added to chat");
  }

  return (
    <>
      <tr>
        <td>{props.username}</td>
        <td>{props.isOnline ? "online" : "offline"}</td>
        <td>
          {props.invited.includes(props.username) ? (
            <Button variant="contained" sx={{ width: ".1rem" }} disabled>
              Pending
            </Button>
          ) : props.isOnline ? (
            <Button
              variant="contained"
              onClick={handleInvite}
              sx={{ width: ".1rem" }}
            >
              Invite
            </Button>
          ) : (
            <Button variant="contained" sx={{ width: ".1rem" }} disabled>
              Invite
            </Button>
          )}
        </td>
        <td>
          {props.isOnline &&
          props.chatName !== "" &&
          !props.chatName
            .replace(/\[.*/, "")
            .split("*")
            .includes(props.username) ? (
            <Button
              variant="contained"
              onClick={handleAddToSameChat}
              sx={{ width: ".1rem" }}
            >
              Add
            </Button>
          ) : (
            <Button variant="contained" sx={{ width: ".1rem" }} disabled>
              Add
            </Button>
          )}
        </td>
        <td>
          {props.isOnline &&
          props.chatName !== "" &&
          !props.chatName
            .replace(/\[.*/, "")
            .split("*")
            .includes(props.username) ? (
            <Button
              variant="contained"
              onClick={handleAddToNewChat}
              sx={{ width: ".1rem" }}
            >
              Add
            </Button>
          ) : (
            <Button variant="contained" sx={{ width: ".1rem" }} disabled>
              Add
            </Button>
          )}
        </td>
      </tr>
    </>
  );
}

export default ChatFriendsList;
