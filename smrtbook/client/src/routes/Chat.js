import React from "react";
import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import MessageBox from "../components/MessageBox";
import { Grid, Box, Stack, Button, ListItem, Typography } from "@mui/material";
import PlaceholderChat from "../components/PlaceholderChat";
import ChatFriendsList from "../components/ChatFriendsList";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import axios from "axios";
var db = require("../database.js");

function Chat({socket}) {
    const [messages, setMessages] = useState([]);
    const [chatName, setChatName] = useState("");
    const [invites, setInvites] = useState([]);
    const [chatNames, setChatNames] = useState([]);
    const [user, setUser] = useState("");
    const [dummy, setDummy] = useState(0);
    const navigate = useNavigate();

    function getChatNames(curUser) {
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
          setChatNames(chats.Items[0].chats.SS);
          chats.Items[0].chats.SS.forEach((c) => {
            socket.emit("join", c);
          });
        }
      });
    }

    function performUpdates() {
      // short time delay
      setTimeout(() => {
        var curUser = "";
        axios
          .get("http://localhost:4000/user", { withCredentials: true })
          .then((res) => {
            if (res.data.username === "") {
              navigate("/login");
            }
            setUser(res.data.username);
            curUser = res.data.username;
            if (curUser === "") {
              return;
            }
            getChatNames(curUser);
            db.getChatInvites(curUser, (err, data) => {
              if (err) {
                console.log(err);
              } else {
                if (data.Items[0].chatIncomingInvites) {
                  setInvites(data.Items[0].chatIncomingInvites.SS);
                } else {
                  setInvites([]);
                }
              }
            });
          })
          .catch((err) => {
            console.error(err);
          });
      }, 250);
    }

    useEffect(() => {
      // perform updates every 1 second
      const interval = setInterval(() => {
        performUpdates();
      }, 200);
      return () => clearInterval(interval);
    }, []);
    
    const renderChatNames = chatNames.map(c => {
      return (
        <Button
          key={c}
          sx={{
            backgroundColor: "lightgray",
            // borderRadius: "20px",
            padding: "8px 16px",
            cursor: "pointer",
          }}
          onClick={() => setChatName(c)}
        >
          {c.replace(/\[.*/, "").split("*").join(", ")}
        </Button>
      );
    });

    return (
      <div className="container py-5">
        <div className="row">
          <div>
            <Stack direction="row" spacing={5}>
              <Stack direction="column" spacing={0.2} alignSelf="flex-start">
                {renderChatNames}
                <Typography variant="h6" sx={{ mt: 2 }}>
                  Invites
                </Typography>
                {invites.length === 0 ? (
                  <Typography variant="body1" sx={{ mt: 2 }}>
                    No invites
                  </Typography>
                ) : (
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box width="100%" overflow="auto" maxHeight={300}>
                        {invites.map((invite) => (
                          <div key={invite}>
                            {invite}
                            <Button
                              onClick={() => {
                                db.acceptChatInvite(
                                  invite,
                                  user,
                                  performUpdates
                                );
                                setDummy((dummy) => dummy + 1);
                              }}
                            >
                              Accept
                            </Button>
                          </div>
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                )}
                <Button
                  color="error"
                  variant="contained"
                  endIcon={<ExitToAppIcon />}
                  sx={{
                    width: "100%",
                    ml: "2%",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                  onClick={() => {
                    console.log("leave chat");
                    setDummy((dummy) => dummy + 1);
                    socket.emit("leave", chatName);
                    socket.emit("event");
                    const curChatName = chatName;
                    const curUser = user;
                    if (curChatName === "") {
                      return;
                    }
                    db.removeUserFromChat(curChatName, user, (err, data) => {
                      if (err) {
                        console.log(err);
                      } else {
                        console.log(data);
                        getChatNames(curUser);
                      }
                    });
                    setChatName("");
                  }}
                >
                  Leave Chat
                </Button>
              </Stack>
              {chatName == "" ? (
                <PlaceholderChat />
              ) : (
                <MessageBox
                  user={user}
                  messages={messages}
                  setMessages={setMessages}
                  chatName={chatName}
                  setChatName={setChatName}
                  socket={socket}
                  setDummy={setDummy}
                />
              )}
            </Stack>
          </div>
          <div className="col-md-6 col-lg-5 col-xl-4 mb-4 mb-md-0">
            <Stack direction="row" spacing={25} alignSelf="flex-start">
              <Grid item xs={6}>
                <Box maxHeight={300}>
                  <ChatFriendsList
                    chatName={chatName}
                    setChatName={setChatName}
                    user={user}
                    socket={socket}
                  />
                </Box>
              </Grid>
            </Stack>
          </div>
        </div>
      </div>
    );

};

export default Chat;