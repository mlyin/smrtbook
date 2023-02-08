import { useState } from "react";
import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import axios from "axios";

const { v4: uuidv4 } = require("uuid");
var db = require("../database.js");

function Group() {
  // initialize states
  const [user, setUser] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [postText, setPostText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [posts, setPosts] = useState([]);
  const [isAnonymousComment, setIsAnonymousComment] = useState(false);
  const [group, setGroup] = useState("");
  const navigate = useNavigate();

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
        })
        .catch((err) => {
          console.error(err);
        });
    }, 100);
  }, []);

  useEffect(() => {
    if (user === "") return;
    // Update the document title using the browser API and grab username
    const regex = new RegExp("^.*group/([^/]+)$");
    const url = window.location.href;
    const matches = regex.exec(url);
    var matchedGroup = matches[1];
    console.log(matchedGroup);
    setGroup(matchedGroup);

    //need to check if the user exists to render anything
    db.checkGroupExists(matchedGroup, (err, data) => {
      console.log(data);
      if (!data) {
        // groupExists = false;
      } else {
        if (data.users && data.users.SS.includes(user)) {
          //woah we're in the group!
          console.log("found user");
          tempInGroup = true;
          setIsMember(true);
          performUpdates(); //first initial call
        } else {
          setIsMember(false);
        }
      }
    });
    const interval = setInterval(() => {
      //check every 10 seconds to reset
      performUpdates(group);
    }, 10000);
    return () => clearInterval(interval);
  }, [user]);


  const renderPosts = posts.map((post) => {
    //render posts, is updated whenever posts change to dynamically set
    var date = new Date(Number(post.timestamp) * 1000); //will be used for the timestamp
    var statusUpdate = post.isStatusUpdate; //check if it's a stauts update (a user posts on his/her own wall)
    return (
      <div className="card">
        <div className="card-body">
          <span>
            {" "}
            {"Posted on " +
              (date.getMonth() + 1) +
              "/" +
              date.getDate() +
              "/" +
              date.getFullYear() +
              " " +
              date.getHours() +
              ":" +
              date.getMinutes() +
              ":" +
              date.getSeconds()}{" "}
          </span>
          <h5 className="card-title">
            {statusUpdate
              ? `New status update by ${post.creator}!`
              : `New post on ${post.wallUsername}'s wall by ${post.creator}`}
          </h5>
          <p className="card-text">{post.postText}</p>
          <form>
            <div className="form-group">
              <label htmlFor="commenttext">Comment text</label>
              <input
                type="text"
                className="form-control"
                id="commenttextform"
                onChange={(event) => setCommentText(String(event.target.value))}
                placeholder="Comment text goes here"
              />
            </div>
            <div className="form-check d-flex justify-content-center">
              <input
                className="form-check-input"
                type="checkbox"
                value=""
                id="flexCheckDefault"
                onChange={(event) =>
                  setIsAnonymousComment(event.target.checked)
                }
              />
              <label className="form-check-label" htmlFor="flexCheckDefault">
                Make comment anonymous
              </label>
            </div>
            <button
              onClick={() => {
                //button to add comment
                var newUUID = uuidv4();
                db.addCommentRevised(
                  newUUID,
                  post.postID,
                  commentText,
                  user,
                  String(Math.floor(Date.now() / 1000)),
                  isAnonymousComment,
                  function (err, data) {
                    if (err) {
                      console.log(err);
                    } else if (data == null) {
                      console.log("error adding comment - data was null");
                    } else {
                      console.log("Successfully added comment!");
                    }
                  }
                );
                var newCommentObj = {
                  //create the new comment obj
                  commentID: {
                    S: newUUID,
                  },
                  postID: {
                    S: post.postID,
                  },
                  commentText: {
                    S: commentText,
                  },
                  isAnonymous: {
                    BOOL: isAnonymousComment,
                  },
                  username: {
                    S: user,
                  },
                  timestamp: {
                    S: String(Math.floor(Date.now() / 1000)),
                  },
                };
                const updatedPostsWithNewComment = posts.map((oldpost) => {
                  if (oldpost.postID === post.postID) {
                    oldpost.comment.push(newCommentObj);
                  }
                  return oldpost;
                });
                setPosts(updatedPostsWithNewComment); //update the react so it'll pop up right after
              }}
              type="button"
              className="btn btn-primary"
            >
              Add new comment
            </button>
            <br></br> <br></br>
            {user === post.creator && (
              <button
                onClick={() => {
                  //button to delete post
                  db.deleteGroupPost(
                    post.postID,
                    post.creator,
                    function (err, data) {
                      if (err) {
                        console.log(err);
                      } else if (data == null) {
                        console.log("error deleting post - data was null");
                      } else {
                        console.log("Successfully deleted post!");
                      }
                    }
                  );
                  const updatedPostsAfterDeletion = posts.filter(
                    (oldpost) => oldpost.postID !== post.postID
                  );
                  setPosts(updatedPostsAfterDeletion); //update the react so it'll pop up right after
                }}
                type="button"
                className="btn btn-danger"
              >
                Delete post
              </button>
            )}
          </form>
        </div>
        <div className="list-group">
          <a className="list-group-item list-group-item-action flex-column align-items-start">
            {post.comment
              .sort((a, b) => (a.timestamp.S < b.timestamp.S ? 1 : -1))
              .map((singleComment) => {
                //display for all comments
                var date = new Date(Number(singleComment.timestamp.S) * 1000);
                return (
                  <div>
                    <h5 className="mb-1">
                      {" "}
                      {singleComment.isAnonymous.BOOL
                        ? "Anonymous"
                        : singleComment.username.S}{" "}
                    </h5>
                    <small className="text-muted">
                      {date.getMonth() +
                        1 +
                        "/" +
                        date.getDate() +
                        "/" +
                        date.getFullYear() +
                        " " +
                        date.getHours() +
                        ":" +
                        date.getMinutes() +
                        ":" +
                        date.getSeconds()}
                    </small>
                    <p className="mb-1">{singleComment.commentText.S}</p>
                    {user === singleComment.username.S && ( //make sure the user is the creator of comment
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          const updatedPostsAfterDeletedComment = posts.map(
                            (oldpost) => {
                              if (oldpost.postID === post.postID) {
                                for (
                                  let i = 0;
                                  i < oldpost.comment.length;
                                  i++
                                ) {
                                  if (
                                    oldpost.comment[i].commentID.S ===
                                    singleComment.commentID.S
                                  ) {
                                    //iterate through to check which comment is the one we need to delete
                                    // index = i;
                                    oldpost.comment.splice(i, 1);
                                  }
                                }
                              }
                              return oldpost; //now it's without the comment if necessary
                            }
                          );
                          db.deleteCommentRevised(
                            singleComment.commentID.S,
                            post.postID,
                            function (err, data) {
                              if (err) {
                                console.log(err);
                              } else if (data == null) {
                                console.log(
                                  "error deleting comment - data was null"
                                );
                              } else {
                                console.log("successfully deleted comment!");
                              }
                            }
                          );
                          setPosts(updatedPostsAfterDeletedComment);
                        }}
                      >
                        Delete comment
                      </button>
                    )}
                  </div>
                );
              })}
          </a>
        </div>
      </div>
    );
  });

  const performUpdates = () => {
    //re-fetch information every 10 seconds and make updates accordingly
    const regex = new RegExp("^.*group/([^/]+)$");
    const url = window.location.href;
    const matches = regex.exec(url);
    var matchedGroupName = matches[1];
    db.groupPostLookup(matchedGroupName, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        var postArray = [];
        if (data) {
          postArray = data;
        }
        const postObjPromises = postArray.map((id) => {
          var tempComments = [];
          return new Promise((resolve, reject) => {
            db.commentLookup(id.postID.S, function (err, data) {
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
                db.getGroupPostByID(id.postID.S, function (err, data) {
                  if (err) {
                    console.log(err);
                    <Navigate to="/" />;
                    reject(err);
                  } else if (data == null) {
                    <Navigate to="/" />;
                    reject(new Error("Error getting post ID data in promise"));
                  } else {
                    var postObj = {
                      //create new post obj
                      postID: data.postID.S,
                      wallUsername: data.wallUsername.S,
                      comment: tempComments,
                      isStatusUpdate: data.isStatusUpdate.BOOL,
                      postText: data.postText.S,
                      timestamp: data.timestamp.S,
                      creator: data.creator.S,
                    };
                    resolve(postObj);
                  }
                });
              }
            });
          });
        });

        Promise.all(postObjPromises)
          .then((results) => {
            const sortedPosts = results.sort((a, b) =>
              a.timestamp < b.timestamp ? 1 : -1
            );
            setPosts(sortedPosts);
          })
          .catch((err) => {
            console.error(err);
          });
      }
    });
  };

  return isMember ? (
    <>
      <div>
        <h2>Group {group}</h2>
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
            //alert
            var newUUID = uuidv4();
            db.addGroupPost(
              newUUID,
              group,
              false,
              postText,
              String(Math.floor(Date.now() / 1000)),
              user,
              function (err, data) {
                //post to two tables
                if (err) {
                  console.log(err);
                  // <Navigate to="/" />
                } else if (data == null) {
                  console.log("error adding post - data was null");
                  // <Navigate to="/" />
                } else {
                  console.log("successfully added post");
                }
              }
            );
            var newPostObj = {
              postID: newUUID,
              wallUsername: group,
              comment: [],
              isStatusUpdate: false,
              postText: postText,
              timestamp: String(Math.floor(Date.now() / 1000)),
              creator: user,
            };
            console.log("trying to add new post");
            console.log(posts);
            setPosts((previous) => [...previous, newPostObj]); //update with state in react
          }}
          type="button"
          className="btn btn-primary"
        >
          Create new post
        </button>
      </form>
    </>
  ) : (
    <div> You are not in Group {group} </div>
  );
}

export default Group;
