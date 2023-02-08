import { useState } from "react";
import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import axios from "axios";

const { v4: uuidv4 } = require('uuid');
var db = require("../database.js");


function Home() {
    const [postText, setPostText] = useState(""); //state to store current user input in the post input box
    const [commentText, setCommentText] = useState(""); //state to store current user comment input in the post input box
    const [isAnonymousComment, setIsAnonymousComment] = useState(false);
    const [posts, setPosts] = useState([]);
    const [postIDs, setPostIDs] = useState([]);
    const [user, setUser] = useState("");
    useEffect(() => {
      //wait a tiny amount of time before checking this so that the user has time to be set
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

     useEffect(() => {
      if (user === "") {
        return;
      }
      initialize();
      const interval = setInterval(() => { //every 10 seconds re check for new posts
        performUpdates();
      }, 500)
      return () => clearInterval(interval);
    }, [user]);
     
    const navigate = useNavigate();
    console.log(user);

    function handleLogout() {
      console.log("Logging out");
      axios
        .get("http://localhost:4000/logout", { withCredentials: true })
        .then((res) => {
          console.log("Logged out");
        });
      navigate("/login");
    }

    var mostRecentPosts = []; //tracks the most recent posts to see if there is an update that is needed

    const initialize = function() {
          var tempFriends = []; //store all friends in this array
          var tempPostIDs = []; //store all post ids we will retrieve in this array
          const getFriendsPromise = new Promise((resolve, reject) => { //chain promises together to get all friends, then get all posts linked to those friends, then merge all into one array
            db.getFriendsHomepage(user, (err, data) => {
              if (err) {
                reject(err);
              } else {
                resolve(data);
              }
            });
          });  
          getFriendsPromise
            .then((data) => {
              if (data === null || data[0].friends === undefined) {
                console.log("user has no friends");
              } else {
                tempFriends = data[0].friends.SS; //all friends are included in this data output
              }
              tempFriends.push(user); //we also want corresponding posts for this one user
            })
            .then(() => {
              var tempCombinedPostIDs = new Set(); //post IDs must be unique
              const postIDLookupPromises = tempFriends.map((tempUser) => {
                return new Promise((resolve, reject) => {
                  db.postIDLookup(tempUser, (err, data) => {
                    if (err) {
                      reject(err);
                    } else {
                      resolve(data);
                    }
                  });
                });
              });
          
              const postIDLookupInvertedPromises = tempFriends.map((tempUser) => { //for the other post
                return new Promise((resolve, reject) => {
                  db.postIDLookupInverted(tempUser, (err, data) => {
                    if (err) {
                      reject(err);
                    } else {
                      resolve(data);
                    }
                  });
                });
              });
          
              // Use the Promise.all method to wait for all the Promises to resolve
              Promise.all([...postIDLookupPromises, ...postIDLookupInvertedPromises])
                .then((results) => {
                  // Flatten the results array and extract the postIDs
                  const allPostIDs = results.flat().filter((item) => item != null).map((item) => item.postID.S);
          
                  // Add the postIDs to the tempCombinedPostIDs set
                  allPostIDs.forEach((item) => tempCombinedPostIDs.add(item)); //will store all opst IDs
                  tempCombinedPostIDs.forEach((item) => tempPostIDs.push(item)); //turn set back into an array to query on

                  const postPromises = tempPostIDs.map(id => {
                    var tempComments = [];
                    return new Promise((resolve, reject) => {
                      db.commentLookup(id, function(err, data) {
                        if (err) {
                          console.log(err);
                          reject(err);
                        } else {
                          if (data == null || data.length == 0) {
                              // console.log(id);
                              // console.log("this post id had no comments associated with it");
                          } else {
                              tempComments = data;
                          }
                          db.getPostByID(id, function(err, data) {
                            if (err) {
                              console.log(err);
                              <Navigate to="/" />
                              reject(err);
                            } else if (data == null) {
                              <Navigate to="/" />
                              reject(new Error('Error getting post ID data in promise'));
                            } else {
                              var postObj = { //create new post obj
                                postID: data.postID.S,
                                creator: data.creator.S,
                                comment: tempComments,
                                isStatusUpdate: data.isStatusUpdate.BOOL,
                                postText: data.postText.S,
                                timestamp: data.timestamp.S,
                                wallUsername: data.wallUsername.S
                              };
                              resolve(postObj);
                            }
                          });
                        }
                      });
                    });
                  });
                  
                  Promise.all(postPromises)
                    .then(results => {
                      // results is an array of post objects
                      const sortedPosts = results.sort((a, b) => (a.timestamp < b.timestamp) ? 1 : - 1); //sort all of them
                      mostRecentPosts = sortedPosts;
                      setPosts(sortedPosts);
                    })
                    .catch(err => {
                      console.error(err);
                    });
                })
                .catch((err) => {
                  console.log("An error occurred:", err);
                });
              });
    }

    const renderPosts = posts.map((post) => { //will be used to render posts, same as the way it is done in Wall.js
      var date = new Date(Number(post.timestamp) * 1000);
      var statusUpdate = post.isStatusUpdate;
      return (
      <div className="card">
          <div className="card-body">
              <span> {"Posted on " + (date.getMonth()+1) + "/" + date.getDate() + "/" + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()} </span>
              <h5 className="card-title">
                {statusUpdate ? `New status update by ${post.creator}!` : `New post on ${post.wallUsername}'s wall by ${post.creator}`}
              </h5>
              <p className="card-text">{post.postText}</p>
              <form>
                <div className="form-group">
                  <label htmlFor="commenttext">Comment text</label>
                  <input type="text" className="form-control" id="commenttextform" onChange = {event => setCommentText(String(event.target.value))} placeholder="Comment text goes here" />
                </div>
                <div className="form-check d-flex justify-content-center">
                  <input className="form-check-input" type="checkbox" value="" id="flexCheckDefault" onChange = {event => setIsAnonymousComment(event.target.checked)}/>
                  <label className="form-check-label" htmlFor="flexCheckDefault">Make comment anonymous</label>
                </div>
                <button onClick={() => {
                    var newUUID = uuidv4();
                    db.addCommentRevised(newUUID, post.postID, commentText, user, String(Math.floor(Date.now() / 1000)), isAnonymousComment, function(err, data) {
                      if (err) {
                          console.log(err);
                      } else if (data == null) {
                          console.log('error adding comment - data was null');
                      } else {
                          console.log('Successfully added comment!');
                      }
                    });
                    var newCommentObj = { //create the new comment obj
                        commentID: {
                          S: newUUID
                        },
                        postID: {
                          S: post.postID
                        },
                        commentText: {
                          S: commentText
                        },
                        isAnonymous: {
                          BOOL: isAnonymousComment
                        },
                        username: {
                          S: user 
                        },
                        timestamp: {
                          S: String(Math.floor(Date.now() / 1000))
                        }
                    };
                    const updatedPostsWithNewComment = posts.map(oldpost => {
                      if (oldpost.postID === post.postID) {
                        oldpost.comment.push(newCommentObj);
                      }
                      return oldpost;
                    });
                    setPosts(updatedPostsWithNewComment); //update the react so it'll pop up right after
                  }
                } 
                type="button" className="btn btn-primary">Add new comment</button>

                <br></br> <br></br>
                {(user === post.creator) &&
                  <button onClick={() => { //button to delete post
                      db.deletePost(post.postID, post.creator, function(err, data) {
                        if (err) {
                            console.log(err);
                        } else if (data == null) {
                            console.log('error deleting post - data was null');
                        } else {
                            console.log('Successfully deleted post!');
                        }
                      });
                      db.deletePostInverted(post.postID, post.wallUsername, function(err, data) {
                        if (err) {
                            console.log(err);
                        } else if (data == null) {
                            console.log('error deleting post - data was null');
                        } else {
                            console.log('Successfully deleted post!');
                        }
                      });
                      const updatedPostsAfterDeletion = posts.filter(oldpost => oldpost.postID !== post.postID);
                      setPosts(updatedPostsAfterDeletion); //update the react so it'll pop up right after
                    }
                  } 
                  type="button" className="btn btn-danger">Delete post
                  </button>
                }
              </form>

          </div>
          <div className="list-group">
              <a className="list-group-item list-group-item-action flex-column align-items-start">
                  {
                      post.comment.sort((a, b) => (a.timestamp.S < b.timestamp.S) ? 1 : - 1).map(singleComment => { //sorts and maps them all out
                        var date = new Date(Number(singleComment.timestamp.S) * 1000);
                        return (
                          <div>
                              <h5 className="mb-1"> {singleComment.isAnonymous.BOOL ? 'Anonymous' : singleComment.username.S} </h5>
                              <small className="text-muted">{(date.getMonth()+1) + "/" + date.getDate() + "/" + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()}</small>
                              <p className="mb-1">{singleComment.commentText.S}</p>
                              { (user === singleComment.username.S) && //make sure the user is the creator of comment
                                <button className="btn btn-danger btn-sm" onClick={() => {
                                      const updatedPostsAfterDeletedComment = posts.map(oldpost => {
                                        if (oldpost.postID === post.postID) {
                                          for (let i = 0; i < oldpost.comment.length; i++) {
                                            if (oldpost.comment[i].commentID.S === singleComment.commentID.S) { //iterate through to check which comment is the one we need to delete
                                              oldpost.comment.splice(i, 1);
                                            }
                                          }
                                        }
                                        return oldpost; //now it's without the comment if necessary
                                      });
                                      db.deleteCommentRevised(singleComment.commentID.S, post.postID, function(err, data) {
                                        if (err) {
                                          console.log(err);
                                        } else if (data == null) {
                                          console.log("error deleting comment - data was null");
                                        } else {
                                          console.log("successfully deleted comment!")
                                        }
                                      });
                                      setPosts(updatedPostsAfterDeletedComment);
                                    }
                                  }>
                                    Delete comment
                                </button>
                              }
                          </div>
                        )
                      })
                  }
              </a>
          </div>
      </div>
      )
    });

    const performUpdates = () => { //update using the same method as in initialize for all posts
      var tempFriends = [];
      var tempPostIDs = [];
      const getFriendsPromise = new Promise((resolve, reject) => { //chain all promises together to get all friends from db query definitively
        db.getFriendsHomepage(user, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });  
      getFriendsPromise
        .then((data) => {
          if (data === null || data[0].friends === undefined) {
            console.log("user has no friends");
          } else {
            tempFriends = data[0].friends.SS; //all friends are included in this data output
          }
          tempFriends.push(user); //we also want corresponding posts for this one user
        })
        .then(() => {
          var tempCombinedPostIDs = new Set();
          const postIDLookupPromises = tempFriends.map((tempUser) => {
            return new Promise((resolve, reject) => {
              db.postIDLookup(tempUser, (err, data) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(data);
                }
              });
            });
          });
      
          const postIDLookupInvertedPromises = tempFriends.map((tempUser) => {
            return new Promise((resolve, reject) => {
              db.postIDLookupInverted(tempUser, (err, data) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(data);
                }
              });
            });
          });
      
          // Use the Promise.all method to wait for all the Promises to resolve
          Promise.all([...postIDLookupPromises, ...postIDLookupInvertedPromises])
            .then((results) => {
              // Flatten the results array and extract the postIDs
              const allPostIDs = results.flat().filter((item) => item != null).map((item) => item.postID.S);
              // Add the postIDs to the tempCombinedPostIDs set
              allPostIDs.forEach((item) => tempCombinedPostIDs.add(item));
              tempCombinedPostIDs.forEach((item) => tempPostIDs.push(item)); //turn set back into an array

              const postPromises = tempPostIDs.map(id => {
                var tempComments = [];
                return new Promise((resolve, reject) => {
                  db.commentLookup(id, function(err, data) {
                    if (err) {
                      console.log(err);
                      reject(err);
                    } else {
                      if (data == null || data.length == 0) {
                          // console.log(id);
                          // console.log("this post id had no comments associated with it");
                      } else {
                          tempComments = data;
                      }
                      db.getPostByID(id, function(err, data) {
                        if (err) {
                          console.log(err);
                          <Navigate to="/" />
                          reject(err);
                        } else if (data == null) {
                          <Navigate to="/" />
                          reject(new Error('Error getting post ID data in promise'));
                        } else {
                          var postObj = { //create new post obj
                            postID: data.postID.S,
                            creator: data.creator.S,
                            comment: tempComments,
                            isStatusUpdate: data.isStatusUpdate.BOOL,
                            postText: data.postText.S,
                            timestamp: data.timestamp.S,
                            wallUsername: data.wallUsername.S
                          };
                          resolve(postObj);
                        }
                      });
                    }
                  });
                });
              });
              
              Promise.all(postPromises)
                .then(results => {
                  // results is an array of post objects
                  const sortedPosts = results.sort((a, b) => (a.timestamp < b.timestamp) ? 1 : - 1);
                  if (sortedPosts !== mostRecentPosts) {
                    mostRecentPosts = sortedPosts;
                    setPosts(sortedPosts);
                  }
                })
                .catch(err => {
                  console.error(err);
                });
            })
            .catch((err) => {
              console.log("An error occurred:", err);
            });
          });
    };

    return (
      <>
        <div>
          <h2>{user}'s Home Page</h2>
          <div>
            <div id="posts">{renderPosts}</div>
          </div>
        </div>
        <br></br>
        <br></br>
        <form>
          <div className="form-group">
            <label htmlFor="posttext">Post text</label>
            <input
              type="text"
              className="form-control"
              id="posttextform"
              onChange={(event) => setPostText(String(event.target.value))}
              placeholder="Post text goes here"
            />
          </div>
          <button
            onClick={() => {
              //butotn to add a new post
              var newUUID = uuidv4();
              db.addPost(
                newUUID,
                user,
                true,
                postText,
                String(Math.floor(Date.now() / 1000)),
                user,
                function (err, data) {
                  if (err) {
                    console.log(err);
                  } else if (data == null) {
                    console.log("error adding post - data was null");
                  } else {
                    console.log("successfully added post");
                  }
                }
              );
              db.addPostInverted(
                newUUID,
                user,
                true,
                postText,
                String(Math.floor(Date.now() / 1000)),
                user,
                function (err, data) {
                  if (err) {
                    console.log(err);
                  } else if (data == null) {
                    console.log("error adding post - data was null");
                  } else {
                    console.log("successfully added post");
                  }
                }
              );
              var newPostObj = {
                postID: newUUID,
                creator: user,
                comment: [],
                isStatusUpdate: true,
                postText: postText,
                timestamp: String(Math.floor(Date.now() / 1000)),
                wallUsername: user,
              };
              setPosts((previous) => [...previous, newPostObj]);
            }}
            type="button"
            className="btn btn-primary"
          >
            Create new post
          </button>
        </form>
        <br></br> <br></br>
        <button onClick={handleLogout}>Logout</button>
        <br></br> <br></br>
      </>
    );
}

export default Home;