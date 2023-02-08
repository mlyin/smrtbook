import { useState, useEffect } from "react";
import { propTypes } from "react-bootstrap/esm/Image.js";
import axios from "axios";
import { useNavigate } from "react-router-dom";


var db = require("../database.js");

function Newsfeed() {
  //const user = "thakers";

  const [articles, setArticles] = useState(new Set());
  const [likes, setLikes] = useState([]);
  const [error, setError] = useState("");
  const [user, setUser] = useState("");
  const navigate = useNavigate();

  //normal check of logged in?
  useEffect(() => {
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

  //once logged in, initialize the newsfeed for the current user,
  //getting newsfeed and then each article in it
  const initialize = () => {
    console.log("called initialize");
    db.getNewsfeed(user, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log("data");
        console.log(data.Items);
        if (data.Items[0].likes) {
          setLikes(data.Items[0].likes.SS);
        }
        if (data.Items[0].newsfeed) {
          console.log("here");
          var toShow = data.Items[0].newsfeed.L;
          console.log("after here");
          const articlePromises = toShow.map((elt) => {
            return new Promise((resolve, reject) => {
              db.getArticle(elt.S, function (err, data) {
                if (err) {
                  reject(err);
                } else if (!data.Item) {
                  reject(new Error("No article data to show"));
                } else {
                  const json = {
                    id: elt.S,
                    headline: data.Item.headline
                      ? data.Item.headline.S
                      : "No headline available",
                    description: data.Item.short_description
                      ? data.Item.short_description.S
                      : "No description available",
                    link: data.Item.link ? data.Item.link.S : "",
                  };
                  resolve(json);
                }
              });
            });
          });

          Promise.all(articlePromises)
            .then((results) => {
              const toAdd = new Set(results);
              setArticles(toAdd);
            })
            .catch((err) => {
              setError(err);
            });
        } else {
          setError("No Articles to show");
        }
      }
    });
  };

  //check constantly for whether user has authenticated
  useEffect(() => {
    if (user === "") return;
    initialize();
    const interval = setInterval(() => {
      initialize();
    }, 1000);

    return () => clearInterval(interval);
  }, [user]);

  //handle likes through database calls and frontend updates
  const handleClick = (e) => {
    if (likes.indexOf(e.target.id) < 0) {
      db.likeArticle(e.target.id, user, function (err, data) {
        if (err) {
          setError("Error liking article");
        } else {
          setLikes((likes) => [...likes, e.target.id]);
        }
      });
    } else {
      db.unlikeArticle(e.target.id, user, function (err, data) {
        if (err) {
          setError("Error unliking article");
        } else {
          const index = likes.indexOf(e.target.id);
          const newLikes = likes;
          newLikes.splice(index, 1);
          setLikes((likes) => likes.filter((like) => like !== e.target.id));
        }
      });
    }
  };

  //render table for component
  return (
    <>
      <div className="parent-div">
        {error && error.length > 0 && (
          <div className="alert alert-danger" id="error" role="alert">
            <div>{error}</div>
          </div>
        )}
        <div className="alert alert-secondary mb-0">
          <h2>News Articles Picked for {user}</h2>
        </div>
        <table className="table table-hover table-light">
          <thead>
            <tr>
              <th scope="col" style={{ width: "40%" }}>
                Headline
              </th>
              <th scope="col" style={{ width: "40%" }}>
                Description
              </th>
              <th scope="col">Like</th>
            </tr>
          </thead>
          <tbody>
            {articles &&
              Array.from(articles).map((elt) => (
                <ArticleRow
                  id={elt.id}
                  likes={likes}
                  link={elt.link}
                  headline={elt.headline}
                  description={elt.description}
                  handleClick={handleClick}
                ></ArticleRow>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

//helper to render each article and its appropriate like button
function ArticleRow(props) {
  if (props.likes.indexOf(props.id) < 0) {
    return (
      <>
        <tr key={props.id}>
          <th scope="row">
            <a href={props.link}>{props.headline}</a>
          </th>
          <th scope="row">{props.description}</th>
          <th scope="row">
            <button
              type="button"
              id={props.id}
              className="btn btn-primary"
              data-bs-toggle="button"
              onClick={(e) => props.handleClick(e)}
            >
              Like
            </button>
          </th>
        </tr>
      </>
    );
  } else {
    return (
      <tr key={props.id}>
        <th scope="row">
          <a href={props.link}>{props.headline}</a>
        </th>
        <th scope="row">{props.description}</th>
        <th scope="row">
          <button
            type="button"
            id={props.id}
            className="btn btn-primary active"
            data-bs-toggle="button"
            aria-pressed="true"
            onClick={(e) => props.handleClick(e)}
          >
            Unlike
          </button>
        </th>
      </tr>
    );
  }
}

export default Newsfeed;
