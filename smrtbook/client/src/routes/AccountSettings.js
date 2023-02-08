import { useState, useContext, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { isEqual } from 'lodash';
import axios from "axios";
import { IoTRoboRunner } from 'aws-sdk';

var db = require('../database.js');

function AccountSettings() {

  const navigate = useNavigate();

  // set up states
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [email, setEmail] = useState('');
  const [interests, setInterests] = useState([]);
  const [oldInterests, setOldInterests] = useState([]);
  const [affiliation, setAffiliation] = useState('');
  const [oldAffiliation, setOldAffiliation] = useState('');
  const [wallVisibility, setWallVisibility] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true)

  const categories = ["CRIME", "ENTERTAINMENT", "WORLD NEWS", "IMPACT", "POLITICS", "WEIRD NEWS", "BLACK VOICES", "WOMEN", "COMEDY", "QUEER VOICES", "SPORTS", "BUSINESS", "TRAVEL", "MEDIA", "TECH", "RELIGION", "SCIENCE", "LATINO VOICES", "EDUCATION", "COLLEGE", "PARENTS", "ARTS & CULTURE", "STYLE", "GREEN", "TASTE", "HEALTHY LIVING", "THE WORLDPOST", "GOOD NEWS", "WORLDPOST", "FIFTY", "ARTS", "WELLNESS", "PARENTING", "HOME & LIVING", "STYLE & BEAUTY", "DIVORCE", "WEDDINGS", "FOOD & DRINK", "MONEY", "ENVIRONMENT", "CULTURE & ARTS"];

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
          setLoading(false)
        })
        .catch((err) => {
          console.error(err);
        });
    }, 100);
  }, []);

  // handle changes to input fields so that they update state
  const handlePasswordChange = (e) => {
    setOldPassword(e.target.value);
  };

  const handleNewPasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleAffiliationChange = (e) => {
    setAffiliation(e.target.value);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handleWallChange = (e) => {
    setWallVisibility(e.target.value);
  };

  const handleInterestChange = (e) => {
    const selectedInterest = e.target.value;
    if (interests.includes(selectedInterest)) {
      setInterests(interests.filter((interest) => interest !== selectedInterest));
    } else {
      setInterests([...interests, selectedInterest]);
    }
  };

  //initialization function to get the original user data from the database
  const initialize = useCallback(() => {
    db.userLookup(user, function (err, data) {
      if (err) {
        console.log('error getting user data');
        setError("Error getting user data");
        navigate("/login");
      } else if (data == null) {
        console.log("no user found");
        setError("Username not found");
        navigate("/login");
      } else {
        setEmail(data.email.S);
        setAffiliation(data.affiliation.S);
        setOldAffiliation(data.affiliation.S);
        setInterests(data.interests.SS);
        setOldInterests(data.interests.SS);
        setWallVisibility(data.wallVisibility.S);
      }
    })
  }, [loading])

  // call the initialization function in a useEffect Hook so that it is called once on render
  useEffect(() => {
    if (user === "") return;
    initialize();
  }, [loading]);

  // map function to render checked or unchecked interests based off of the state
  const renderInterests = categories.map(function (interest) {
    if (interests.indexOf(interest) !== -1) {
      return <li className='list-group-item rounded-0' key={interest}>
        <div className="form-check">
          <input className="form-check-input" type="checkbox" value={interest} id={interest} checked onChange={handleInterestChange}></input>
          <label className="form-check-label" htmlFor={interest}>
            {interest}
          </label>
        </div>
      </li>;
    } else {
      return <li className='list-group-item rounded-0' key={interest}>
        <div className="form-check">
          <input className="form-check-input" type="checkbox" value={interest} id={interest} onChange={handleInterestChange}></input>
          <label className="form-check-label" htmlFor={interest}>
            {interest}
          </label>
        </div>
      </li>;
    }
  })


  async function handleSubmit(e) {
    setError('');
    e.preventDefault();
    console.log("submitting");
    // check if input is valid
    if ((password !== '' && oldPassword === '') || (password === '' && oldPassword !== '')) {
      setError("One password field is empty and the other isn't");
      return;
    }
    if ((!email || email === "")) {
      setError('Empty email');
      return;
    }

    if ((!affiliation || affiliation === "")) {
      console.log("affiliation");
      setError('Empty affiliation');
      console.log(error);
      return;
    }

    console.log("interests");
    console.log(interests);
    if (interests.length < 2) {
      setError('Need at least 2 interests');
      return;
    }


    if (password !== "") {
      // confirm password by calling login route
      db.checkPassword(user, oldPassword, function (err, data) {
        if (err) {
          console.log(err);
        } else {
          console.log("No error");
          if (data) {
            db.updatePassword(user, password, function (err, data) {
              if (err) {
                console.log("update password doesn't work")
                console.log(err);
              } else {
                console.log("password updated");
                // call db route
                db.updateUserNew(user, affiliation, email, interests, wallVisibility, function (err, data) {
                  console.log("attempting to change WV to" + wallVisibility);
                  if (err) console.log(err);
                  else {
                    console.log("We returned to the frontend after a successful update");
                    // make autogenerated posts if the affiliation or interests changed
                    const timestamp = String(Math.floor(Date.now() / 1000));
                    if (oldAffiliation !== affiliation) {
                      setOldAffiliation(affiliation);
                      const id = uuid();
                      db.addPost(id, user, true, user + " is now affiliated with " + affiliation, timestamp, user, function(err, data) {
                        if (err) {
                          console.log("post could not be made");
                        }
                      })
                      db.addPostInverted(id, user, true, user + " is now affiliated with " + affiliation, timestamp, user, function(err, data) {
                        if (err) {
                          console.log("post could not be made");
                        }
                      })
                    }
                    if (!isEqual(oldInterests.sort(), interests.sort())) {
                      setOldInterests(interests);
                      const id = uuid();
                      db.addPost(id, user, true, user + " is now interested in " + interests.toString(), timestamp, user, function(err, data) {
                        if (err) {
                          console.log("post could not be made");
                        }
                      })
                      db.addPostInverted(id, user, true, user + " is now interested in " + interests.toString(), timestamp, user, function(err, data) {
                        if (err) {
                          console.log("post could not be made");
                        }
                      })
                    }
                    navigate("/");
                  }
                })
              }
            })
          } else {
            console.log("The passwords do not match");
            setError('The passwords do not match');
            return false;
          }
        }
      })
    } else {
      //if no passwords were entered, we do the same thing (just without password validation)
      db.updateUserNew(user, affiliation, email, interests, wallVisibility, function (err, data) {
        if (err) console.log(err);
        else {
          console.log("We returned to the frontend after a successful update");
          const timestamp = String(Math.floor(Date.now() / 1000));
          if (oldAffiliation !== affiliation) {
            setOldAffiliation(affiliation);
            const id = uuid();
            db.addPost(id, user, true, user + " is now affiliated with " + affiliation, timestamp, user, function(err, data) {
              if (err) {
                console.log(err);
              }
            })
            db.addPostInverted(id, user, true, user + " is now affiliated with " + affiliation, timestamp, user, function(err, data) {
              if (err) {
                console.log(err);
              }
            })
          }
          
          if (!isEqual(oldInterests.sort(), interests.sort())) {
            setOldInterests(interests);
            const id = uuid();
            db.addPost(id, user, true, user + " is now interested in " + interests.toString(), timestamp, user, function(err, data) {
              if (err) {
                console.log(err);
              }
            })
            db.addPostInverted(id, user, true, user + " is now interested in " + interests.toString(), timestamp, user, function(err, data) {
              if (err) {
                console.log(err);
              }
            })
          }
          navigate("/");
        }
      })
    }
  }

  // render the html!
  return (
    <>
      <h1>Account Settings</h1>
      {error && error.length > 0 && (
        <div className="alert alert-danger" id="error" role="alert">
          <div>{error}</div>
        </div>
      )}
      <div style={{ width:'40vw', margin:'auto' }}>
      <form onSubmit={handleSubmit}>
        <h2>Change Password</h2>
        <div className="form-group">
          <label htmlFor="currpassword">Current Password:</label>
          <input
            className="form-control"
            type="text"
            name="currpassword"
            onChange={handlePasswordChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="newpassword">New Password:</label>
          <input
            className="form-control"
            type="text"
            name="newpassword"
            onChange={handleNewPasswordChange}
          />
        </div>
        <h2>Change Affiliation</h2>
        <div className="form-group">
          <label htmlFor="affiliation">New Affiliation:</label>
          <input
            className="form-control"
            type="text"
            value={affiliation}
            name="affiliation"
            onChange={handleAffiliationChange}
          />
        </div>
        <h2>Change Email</h2>
        <div className="form-group">
          <label htmlFor="email">New Email:</label>
          <input
            className="form-control"
            type="text"
            value={email}
            name="email"
            onChange={handleEmailChange}
          />
        </div>
        <h2>Change Wall Visibility</h2>
        <div className="form-group">
          <label htmlFor="wallvisibility">New Wall Visbility Setting:</label>
          <div>
            <input
              type="radio"
              value="public"
              checked={wallVisibility === "public"}
              name="wallvisibility"
              onClick={handleWallChange}
            />
            <label for="pub">Public</label>
          </div>
          <div>
            <input
              type="radio"
              value="private"
              checked={wallVisibility === "private"}
              name="wallvisibility"
              onClick={handleWallChange}
            />
            <label for="priv">Private</label>
          </div>
          <div>
            <input
            type="radio"
            value="friends-only"
            checked={wallVisibility === "friends-only"}
            name="wallvisibility"
            onClick={handleWallChange}
            />
          <label for="fo">Friends Only</label>
        </div>
      </div>
        <h2>Change News Interests</h2>
        <p>Please select at least two interests!</p>
        <ul className="list-group" id="categories">
          {renderInterests}
        </ul>
        <input className="btn btn-primary" type="submit" value="Save Changes" />
      </form>
      </div>
    </>
  );
}

export default AccountSettings;           
