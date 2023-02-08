import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from "axios";

var db = require("../database.js");

function Login ({socket}) {
  // initialize states
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // get user
  useEffect(() => {
    axios
      .get("http://localhost:4000/user", { withCredentials: true })
      .then((res) => {
        if (res.data.username !== "") {
          console.log(res);
          navigate("/");
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  // handle the submission of the login form
  const handleSubmit = e => { 
    e.preventDefault()
    if (username.length === 0 || password.length === 0) {
      setError('Username and password cannot be empty');
      return;
    }
    // check the password by first checking if the user exists
    db.checkPassword(username, password, function (err, data) {
      if (err) {
        console.log("Problem");
        setError("Error looking up your username")
        setUsername('')
        setPassword('')
      } else if (data == null) {
        console.log("No user");
        setError("Username does not exist");
        setUsername('');
        setPassword('');
      } else if (data) {
        console.log("Password is correct");
        axios
          .post("http://localhost:4000/login", { username }, { withCredentials: true })
          .then((res) => {
            console.log(res.data);
          });
        navigate("/");
      } else {
        setError("Incorrect password");
        setUsername('');
        setPassword('');
      }
    });
  };

  // render html!
  return (
    <>
      <form onSubmit={handleSubmit}>
        <input
          className='form-control'
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
        />
        <input
          className='form-control'
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
        />
        <button type="submit">Login</button>
      </form>
      {
        error && <p>{error}</p>
      }
    </>
  );
}

export default Login;