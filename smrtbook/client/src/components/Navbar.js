import { Snackbar } from "@mui/material";
import axios from "axios";
import { useState, useEffect } from "react";
import Fade from "@mui/material/Fade";
var db = require("../database.js");

function Navbar({ socket }) {
  const [open, setOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState("");
  function getChatNames(curUser) {
    if (curUser === "") {
      return;
    }
    db.getChatNames(curUser, function (err, chats) {
      if (err) {
        console.log(err);
      } else {
        if (chats.length === 0) {
          return;
        }
        if (!chats.Items[0].chats) {
          return;
        }
        chats.Items[0].chats.SS.forEach((c) => {
          socket.emit("join", c);
        });
      }
    });
  }

  const handleMessageResponse = (data) => {
    if (data.sender === user) {
      return;
    }
    setOpen(true);
    setMessage(() => {
      const message = `[${data.chatName
        .replace(/\[.*/, "")
        .split("*")
        .join(", ")}] ${data.sender}: ${data.text}`;
      if (message.length > 75) {
        return message.substring(0, 75) + "...";
      }
      return message;
    });
  };

  useEffect(() => {
    axios
      .get("http://localhost:4000/user", { withCredentials: true })
      .then((res) => {
        console.log(res.data);
        if (res.data.username === "") {
          console.log("no user");
        }
        if (res.data && res.data.username) {
          setUser(res.data.username);
        }
        getChatNames(res.data.username);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  useEffect(() => {
    socket.on("messageResponse", handleMessageResponse);
    return () => {
      socket.off("messageResponse", handleMessageResponse);
    };
  }, [user]);
  const wallURL = "/user/" + user;
  return (
    <>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        autoHideDuration={7000}
        TransitionComponent={Fade}
        open={open && message !== ""}
        onClose={() => setOpen(false)}
        message={message}
        maxwidth={20}
      />
      <nav className="navbar navbar-expand-sm navbar-light bg-secondary">
        <div className="container">
          <a href="/#" className="navbar-brand mb-0 h1">
            <img
              className="d-inline-block align-top"
              src="https://getbootstrap.com/docs/4.0/assets/brand/bootstrap-solid.svg"
              alt="Logo"
              width="40"
              height="40"
            />
          </a>
          <span className="navbar-brand mb-0 h1">smrtbook</span>
          <div className="collapse.navbar-collapse" id="navbarNav">
            <ul className="navbar-nav">
              <li className="nav-item active">
                <a href="/visualizer" className="nav-link">
                  Friend Network
                </a>
              </li>
              <li className="nav-item active">
                <a href="/friends" className="nav-link">
                  Friend List
                </a>
              </li>
              <li className="nav-item active">
                <a href="/settings" className="nav-link">
                  Account Settings
                </a>
              </li>
              <li className="nav-item active">
                <a href="/search" className="nav-link">
                  User Search
                </a>
              </li>
              <li className="nav-item active">
                <a href="/signup" className="nav-link">
                  Signup
                </a>
              </li>
              <li className="nav-item active">
                <a href="/newssearch" className="nav-link">
                  News Search
                </a>
              </li>
              <li className="nav-item active">
                <a href="/newsfeed" className="nav-link">
                  Newsfeed
                </a>
              </li>
              <li className="nav-item active">
                <a href="/chat" className="nav-link">
                  Chat
                </a>
              </li>
              <li className="nav-item active">
                <a href="/groupsearch" className="nav-link">
                  Group search</a> 
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}

export default Navbar;
