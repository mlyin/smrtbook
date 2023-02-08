import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from "axios";

var db = require("../database.js");

function Signup() {
  // declare states
  const [errorState, setErrorState] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [birthday, setBirthday] = useState('');

  const navigate = useNavigate()

  const categories = ["CRIME", "ENTERTAINMENT", "WORLD NEWS", "IMPACT", "POLITICS", "WEIRD NEWS", "BLACK VOICES", "WOMEN", "COMEDY", "QUEER VOICES", "sports", "business", "travel", "media", "tech", "religion", "science", "latino voices", "education", "college", "parents", "arts & culture", "style", "green", "taste", "healthy living", "the worldpost", "good news", "worldpost", "fifty", "arts", "wellness", "parenting", "home & living", "style & beauty", "divorce", "weddings", "food & drink", "money", "environment", "culture & arts"];
  categories.forEach(elt => elt.toUpperCase());

  const [checkedState, setCheckedState] = useState(
    new Array(categories.length).fill(false)
  );
  // handle state change
  const handleCheckboxChange = (position) => {
    const updatedCheckedState = checkedState.map((item, index) =>
      index === position ? !item : item
    );
    setCheckedState(updatedCheckedState);
  }

  // render checkboxes based off of checked state
  const renderInterests = categories.map((interest, i) => {
      return <label>
        <input type="checkbox" key={interest} checked={checkedState[i]} onChange={() => handleCheckboxChange(i)} />
        {interest}
      </label>
    });


  // inputs validation tests
  const handleValidation = function(selectedInterests) {
    console.log('handleValidation');
    const errors = [];
    if (!username) {
      errors.push("Empty username field");
    }
    const userRegex = /^[a-zA-Z0-9_]+$/;
    if(!username.match(userRegex)) {
      errors.push("Alphanumeric usernames only")
    }

    if (!password) {
      errors.push("Empty Password Field");
    }

    var passRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!password.match(passRegex)) {
      errors.push("Please enter a password that is at minimum eight characters, with at least one letter and one number");
    }

    if (!confirmPassword) {
      errors.push("Empty Confirm Password Field");
    }

    if (!confirmPassword.match(passRegex)) {
      errors.push("Please enter a confirming password that is at minimum eight characters, with at least one letter and one number");
    }

    if (!email) {
      errors.push("Empty Email");
    }

    if (!affiliation) {
      errors.push("Empty Affiliation");
    }

    if (!first) {
      errors.push("Empty First Name");
    }

    if (!last) {
      errors.push("Empty Last Name");
    }

    if (!birthday) {
      errors.push("Empty Birthday");
    }

    if (selectedInterests.length < 2) {
      errors.push("Select at least 2 news interests");
    }
    console.log('here are the errors' + errors);

    return errors;
  }

  // handle submit hook, called when user clicks submit
  function handleSubmit(e) {
    e.preventDefault();
    console.log("submitting");
    // check if input is valid
    var selectedInterests = [];
    checkedState.forEach((item, index) => {
      if (item) {
        selectedInterests.push(categories[index]);
        console.log('selected: ' + categories[index]);
      }
    });

    const error = handleValidation(selectedInterests);
    setErrorState(error);
    if (error.length === 0) {
      // call postUser!!!
      const full = first + " " + last;
      console.log("calling postUser");
      db.userAdd(username, password, full, affiliation, email, selectedInterests, birthday, function (err, data) {
        if (err) {
          console.log("error with creating new user");
          console.log(selectedInterests);
          console.log(err);
          setErrorState(["Error with creating new user"]);
        } else if (data) {
          axios
          .post("http://localhost:4000/login", { username }, { withCredentials: true })
          .then((res) => {
            console.log(res.data);
            navigate("/");
          });
        } else {
          setErrorState(["Username already taken."])
        }
      });
    }
  }

  // render html!
  return (
    <><h1>Sign Up</h1>
    <form onSubmit={(e) => handleSubmit}>
      <div>
        <label htmlFor="username">Username:</label>
        <input type="text" name="username" onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div>
        <label htmlFor="password">Password:</label>
        <input type="password" name="password" onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label htmlFor="confirmPassword">Confirm Password:</label>
        <input type="password" name="confirmPassword" onChange={(e) => setConfirmPassword(e.target.value)} />
      </div>
      <div>
        <label htmlFor="first">First Name:</label>
        <input type="text" name="first" onChange={(e) => setFirst(e.target.value)} />
      </div>
      <div>
        <label htmlFor="last">Last Name:</label>
        <input type="text" name="last" onChange={(e) => setLast(e.target.value)} />
      </div>
      <div>
        <label htmlFor="email">Email:</label>
        <input type="email" name="email" onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="affiliation">Affiliation:</label>
        <input type="text" name="affiliation" onChange={(e) => setAffiliation(e.target.value)} />
      </div>
      <div>
        <label htmlFor="birthday">Birthday:</label>
        <input type="date" name="birthday" onChange={(e) => setBirthday(e.target.value)} />
      </div>
      {
        errorState.map((err) => {
          return <div key={err}>{err}</div>;
        })
      }
      <div>
        <h2>News Interests</h2>
        <p>Please select at least two interests!</p>
        <ul className="list-group" id="categories">
          {renderInterests}
        </ul>
      </div>
      <input type="submit" value="Signup" onClick={e => handleSubmit(e)} />
    </form></>
  );
}

export default Signup;   