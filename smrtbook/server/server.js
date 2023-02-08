const express = require("express");
const sessions = require("express-session")
const app = express();
const http = require("http");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");
const cors = require("cors");
var db = require("../client/src/database.js");

app.use(cors({
  origin: "http://localhost:8080",
  credentials: true
}));

app.use(
  sessions({
    key: "smrtbookcookie",
    secret: "smrtbooksec",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 15 * 60 * 1000, // 15 minutes
      secure: false,
    },
  })
);
app.use(express.json());

app.post('/login', (req, res) => {
  console.log('we are in login');
  console.log('req body: ', req.body);
  const { username } = req.body;
  req.session.username = username;
  console.log(req.session);
  db.setOnline(username);
  res.send({ username: req.session.username });
});

app.get("/logout", (req, res) => {
  if (req.session) {
    const username = req.session.username;
    if (username) {
      db.setOffline(username);
    }
    req.session.destroy();
    res.send("user logged out");
  } else {
    res.send("");
  }
});

app.get("/user", (req, res) => {
  if (req.session.username) {
    const date = new Date();
    date.setMinutes(date.getMinutes() + 15); // extending by another 15 minutes every click
    req.session.cookie._expires = date;
    res.send({
      username: req.session.username,
    });
  } else {
    res.send({
      username: "",
    });
  }
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
    console.log(`${socket.id} connected`);
    socket.on("join", (data) => {
      socket.join(data);
    });

    socket.on("leave", (data) => {
      console.log("leave");
      console.log(data);
      socket.leave(data);
    });

    socket.on("message", (data) => {
      console.log('data');
      console.log(data);
      io.to(data.chatName).emit("messageResponse", data);
    });

    socket.on("event", () => {
      console.log("event");
      io.emit("eventResponse");
    });

    socket.on("disconnect", () => {
      console.log("a user disconnected");
      socket.disconnect();
    });
});

server.listen(4000, () => {
  console.log("SERVER IS RUNNING");
});