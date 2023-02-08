import React from "react";
import { useState, useEffect, useRef } from 'react';
import Message from "../components/Message";
import UploadImages from "./UploadImages";
import {
  Box,
  Button,
  Stack,
  FormControl,
  Input,
  InputLabel,
  Paper,
  Typography,
} from "@mui/material";
import Send from "@mui/icons-material/Send";

var db = require("../database.js");

function MessageBox({user, socket, chatName, setDummy }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    async function getChats() {
      const msgs = await db.getChat(chatName);
      setMessages(msgs);
    }
    getChats();
  }, [chatName]);

  useEffect(() => {
    const handleMessageResponse = (data) => {
      console.log("messageResponse");
      console.log(data);
      setMessages((messages) => [...messages, data]);
      console.log("current chat name: ", chatName);
      db.addMessage(
        data.chatName,
        data.sender,
        data.isImage,
        data.text,
        data.timestamp
      );
    };
    socket.on("messageResponse", handleMessageResponse);
    return () => {
      socket.off("messageResponse", handleMessageResponse);
    };
  }, [chatName]);
  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function handleSend(e) {
    e.preventDefault();
    if (message.length === 0) {
      return;
    }
    setDummy((dummy) => dummy + 1);
    console.log("handleSend");
    console.log(chatName);
    socket.emit("message", {
      sender: user,
      text: message,
      isImage: false,
      timestamp: new Date().getTime(),
      chatName: chatName,
    });
    setMessage("");
  }
  const renderMessages = messages && messages.map((m, i) => {
    return <Message message={m} user={user} key={i}></Message>;
  });

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h5" align="center">
          {chatName.replace(/\[.*/, "").split("*").join(", ").toUpperCase()}
        </Typography>
      </Box>
      <Paper
        sx={{
          mb: "4rem",
          width: "100%",
          height: "40rem",
          overflow: "auto",
          backgroundColor: "#e6edf0",
        }}
      >
        <Stack direction="column" spacing={1}>
          {renderMessages}
        </Stack>
        <div ref={bottomRef} />
      </Paper>
      <Box>
        <form onSubmit={handleSend}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Stack direction="column" spacing={1}>
              <Stack direction="row" spacing={1}>
                <FormControl>
                  <InputLabel>Enter Message</InputLabel>
                  <Input
                    type="submit"
                    value={message}
                    onKeyPress={(event) => {
                      if (event.key === "Enter") {
                        handleSend(event);
                      }
                    }}
                    onChange={(e) => setMessage(e.target.value)}
                    sx={{ width: "100%" }}
                    multiline
                  />
                </FormControl>
                <Box sx={{ width: "2%" }} />
                <Button
                  variant="contained"
                  type="submit"
                  endIcon={<Send />}
                  sx={{ width: "38%" }}
                >
                  Send
                </Button>
              </Stack>
              <UploadImages chatName={chatName} sender={user} socket={socket} />
            </Stack>
          </Box>
        </form>
      </Box>
    </Box>
  );
}

export default MessageBox;