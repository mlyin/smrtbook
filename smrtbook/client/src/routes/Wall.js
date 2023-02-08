import { useState } from "react";
import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import axios from "axios";

const { v4: uuidv4 } = require('uuid');
var db = require("../database.js");


function Wall() {
 // Compile the regular expression to find the username
 const [userExists, setUserExists] = useState(false);
 const [postText, setPostText] = useState("");
 const [commentText, setCommentText] = useState("");
 const [posts, setPosts] = useState([]);
 const [isAnonymousComment, setIsAnonymousComment] = useState(false);
 const [wallUsername, setWallUsername] = useState("");
 const [wallVisibility, setWallVisibility] = useState("private");
 const [visible, setVisible] = useState(false);
 const [buddies, setBuddies] = useState(false); //state to track if the current wall's username is friends with the user logged in
 const [combinedPostIDs, setCombinedPostIDs] = useState(new Set());

 var mostRecentPosts = []; //tracks the most recent posts to see if there is an update that is needed
 
 const [user, setUser] = useState("");
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
 setTimeout(() => {
 initialize();
 const regex = new RegExp("^.*user/([^/]+)$");
 const url = window.location.href;
 const matches = regex.exec(url);
 if (matches) {
 //initially set the username of the wall we want to visit
 setWallUsername(matches[1]);
 }
 const interval = setInterval(() => {
 //check every 10 seconds to reset
 performUpdates(matches[1]);
 }, 10000);
 return () => clearInterval(interval);
 }, 100);
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
 // setUser(null);
 navigate("/login");
 }
 
 const initialize = function() { //initialize call
 const regex = new RegExp("^.*user\/([^/]+)$");
 const url = window.location.href;
 const matches = regex.exec(url);
 var matchedUsername = matches[1];

 var tempFriends = []; //store all friends in an array
 const getFriendsPromise = new Promise((resolve, reject) => { //get all friends in a promise since we need this to be done instantly
 db.getFriendsHomepage(matchedUsername, (err, data) => { //check to see if we can comment
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
 if (user === matchedUsername) {
 console.log(user + "is visiting their own wall, displaying wall");
 setBuddies(true); //they're buddies (friends)
 }
 } else {
 if (data[0].length !== 0) {
 tempFriends = data[0].friends.SS;
 if (tempFriends.includes(user)) {
 console.log(user + " is a friend of " + matchedUsername + ", displaying wall");
 setBuddies(true); //they're buddies (friends)
 }
 }
 }
 });

 //need to check if the user exists to render anything
 db.checkUserExists(matchedUsername, (err, data) => {
 // console.log(data);
 if (data === false) {
 setUserExists(false);
 } else {
 setUserExists(true); //now we need to get the visibility status of the user
 db.getWallVisibility(matchedUsername, (err, data) => {
 var tempVisibility = "";
 if (data === null || data.wallVisibility === undefined) {
 tempVisibility = "public"; //is set to public
 } else if (data.wallVisibility.S === "private") {
 tempVisibility = "private"; //is set to private
 } else if (data.wallVisibility.S === 'friends-only') {
 tempVisibility = "friends-only"; //is set to FO
 } else {
 tempVisibility = "public"; //is set to public
 }
 setWallVisibility(tempVisibility);
 if (tempVisibility === "public") {
 setVisible(true);
 } else if (tempVisibility === "friends-only") {
 console.log("friends-only", tempFriends, 'user', user);
 console.log("user");
 //console.log(user)
 if (tempFriends.includes(user) || (user === matchedUsername)) {
 setVisible(true);
 } else {
 setVisible(false);
 }
 } else { //must be private
 if (user === matchedUsername) {
 setVisible(true);
 } else {
 setVisible(false);
 }
 }
 })
 }
 });

 db.postIDLookup(matchedUsername, function(err, data) { //chain the promises to get all post ids together and convert to set
 if (err) {
 console.log(err);
 <Navigate to="/" />
 } else {
 var wallUsernameIDs = [];
 if (!(data == null || data.length == 0)) { //make sure it actually has information
 wallUsernameIDs = data.map(item => item.postID.S);
 }
 db.postIDLookupInverted(matchedUsername, function(err, data) { //query for the second table
 if (err) {
 console.log(err);
 <Navigate to="/" />
 } else { 
 var creatorIDs = [];
 if (!(data === null || data.length === 0)) { //make sure it actually has information
 creatorIDs = data.map(item => item.postID.S);
 }
 var combined = [...new Set([...wallUsernameIDs, ...creatorIDs])]; //set of all ids
 setCombinedPostIDs(combined); // set it to be in the react state
 const postPromises = combined.map(id => {
 var tempComments = [];
 return new Promise((resolve, reject) => {
 db.commentLookup(id, function(err, data) {
 if (err) {
 console.log(err);
 reject(err);
 } else {
 if (data == null || data.length == 0) {
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
 const sortedPosts = results.sort((a, b) => (a.timestamp < b.timestamp) ? 1 : - 1); //sort them
 mostRecentPosts = sortedPosts;
 setPosts(sortedPosts);
 })
 .catch(err => {
 console.error(err);
 });

 }
 });
 }
 });
 }

 const renderPosts = posts.map((post) => { //render posts, is updated whenever posts change to dynamically set
 var date = new Date(Number(post.timestamp) * 1000); //will be used for the timestamp
 var statusUpdate = post.isStatusUpdate; //check if it's a stauts update (a user posts on his/her own wall)
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
 <button onClick={() => { //button to add comment
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
 type="button" className="btn btn-primary">Add new comment
 </button>

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
 post.comment.sort((a, b) => (a.timestamp.S < b.timestamp.S) ? 1 : - 1).map(singleComment => { //display for all comments
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
 // index = i;
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




 const performUpdates = (userToCheck) => { //re-fetch information every 10 seconds and make updates accordingly
 db.postIDLookup(userToCheck, function(err, data) { 
 if (err) {
 console.log(err);
 <Navigate to="/" />
 } else {
 var wallUsernameIDs = [];
 if (!(data == null || data.length == 0)) { //make sure it actually has information
 wallUsernameIDs = data.map(item => item.postID.S);
 }
 db.postIDLookupInverted(userToCheck, function(err, data) { //chain the second lookup
 if (err) {
 console.log(err);
 } else { 
 var creatorIDs = [];
 if (!(data == null || data.length == 0)) { //make sure it actually has information
 creatorIDs = data.map(item => item.postID.S);
 }
 var combined = [...new Set([...wallUsernameIDs, ...creatorIDs])];
 setCombinedPostIDs(combined);
 const postPromises = combined.map(id => { //promise for the combined array o fall IDs
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
 }
 });
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
 });
 });
 
 Promise.all(postPromises)
 .then(results => {
 // results is an array of post objects
 const sortedPosts = results.sort((a, b) => (a.timestamp < b.timestamp) ? 1 : - 1);
 if ((sortedPosts !== mostRecentPosts)) { //check to see if there's a difference in posts structure
 mostRecentPosts = sortedPosts;
 // console.log("setting posts in performUPDATES");
 // console.log(sortedPosts);
 setPosts(sortedPosts);
 }
 })
 .catch(err => {
 console.error(err);
 });

 }
 });
 }
 });
 };
 
 return userExists ? (
 visible ? (
 <>
 <div>
 <h2>{wallUsername}'s Wall</h2>
 <div>
 <div id="posts">
 {renderPosts}
 </div>
 </div>
 </div>

 <br></br> 
 <br></br>

 { buddies && //they have to be friends to be able to post on each other's walls
 <form>
 <div className="form-group">
 <label htmlFor="posttext">Post text</label>
 <input type="text" className="form-control" id="posttextform" onChange = {event => setPostText(String(event.target.value))} placeholder="Post text goes here" />
 </div>
 <button onClick={() => {
 //alert
 var newUUID = uuidv4();
 db.addPost(newUUID, user, false, postText, String(Math.floor(Date.now() / 1000)), wallUsername, function(err, data) { //post to two tables
 if (err) {
 console.log(err);
 // <Navigate to="/" />
 } else if (data == null) {
 console.log('error adding post - data was null');
 // <Navigate to="/" />
 } else {
 console.log('successfully added post');
 }
 });
 db.addPostInverted(newUUID, user, false, postText, String(Math.floor(Date.now() / 1000)), wallUsername, function(err, data) {
 if (err) {
 console.log('error adding post');
 console.log(err);
 // <Navigate to="/" />
 } else if (data == null) {
 console.log('error adding post - data was null');
 // <Navigate to="/" />
 } else {
 console.log('successfully added post');
 }
 });
 var newPostObj = {
 postID: newUUID,
 creator: user,
 comment: [],
 isStatusUpdate: false,
 postText: postText,
 timestamp: String(Math.floor(Date.now() / 1000)),
 wallUsername: wallUsername
 };
 console.log("trying to add new post");
 console.log(posts);
 setPosts(previous => [...previous, newPostObj]); //update with state in react
 }
 } 
 type="button" className="btn btn-primary">Create new post</button>
 </form>
 }
 <br></br> <br></br>
 <button onClick={handleLogout}>Logout</button>
 <br></br> <br></br>
 </>
 ) : (
 <div> This user has set their wall visibility to {wallVisibility} </div>
 )
 ) : (
 <div> This user does not exist. </div>
 // <Navigate to="/login" />
 );
 
}

export default Wall;