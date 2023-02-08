import { useState, useEffect } from "react";

import { stemmer } from "stemmer";

import axios from "axios";
import { useNavigate } from "react-router-dom";

var db = require("../database.js");

//just store the stopwords for validation
const stopwords = [
  "a",
  "able",
  "about",
  "above",
  "according",
  "accordingly",
  "across",
  "actually",
  "after",
  "afterwards",
  "again",
  "against",
  "all",
  "allow",
  "allows",
  "almost",
  "alone",
  "along",
  "already",
  "also",
  "although",
  "always",
  "am",
  "among",
  "amongst",
  "an",
  "and",
  "another",
  "any",
  "anybody",
  "anyhow",
  "anyone",
  "anything",
  "anyway",
  "anyways",
  "anywhere",
  "apart",
  "appear",
  "appreciate",
  "appropriate",
  "are",
  "aren't",
  "around",
  "as",
  "aside",
  "ask",
  "asking",
  "associated",
  "at",
  "available",
  "away",
  "awfully",
  "b",
  "back",
  "be",
  "became",
  "because",
  "become",
  "becomes",
  "becoming",
  "been",
  "before",
  "beforehand",
  "behind",
  "being",
  "believe",
  "below",
  "beside",
  "besides",
  "best",
  "better",
  "between",
  "beyond",
  "both",
  "brief",
  "but",
  "by",
  "c",
  "came",
  "can",
  "cannot",
  "cant",
  "can't",
  "cause",
  "causes",
  "certain",
  "certainly",
  "changes",
  "clearly",
  "co",
  "com",
  "come",
  "comes",
  "concerning",
  "consequently",
  "consider",
  "considering",
  "contain",
  "containing",
  "contains",
  "corresponding",
  "could",
  "couldn't",
  "course",
  "currently",
  "d",
  "dear",
  "definitely",
  "described",
  "despite",
  "did",
  "didn't",
  "different",
  "do",
  "does",
  "doesn't",
  "doing",
  "done",
  "don't",
  "down",
  "downwards",
  "during",
  "e",
  "each",
  "edu",
  "eg",
  "eight",
  "either",
  "else",
  "elsewhere",
  "enough",
  "entirely",
  "especially",
  "et",
  "etc",
  "even",
  "ever",
  "every",
  "everybody",
  "everyone",
  "everything",
  "everywhere",
  "ex",
  "exactly",
  "example",
  "except",
  "f",
  "far",
  "few",
  "fifth",
  "first",
  "five",
  "followed",
  "following",
  "follows",
  "for",
  "former",
  "formerly",
  "forth",
  "four",
  "from",
  "further",
  "furthermore",
  "g",
  "get",
  "gets",
  "getting",
  "given",
  "gives",
  "go",
  "goes",
  "going",
  "gone",
  "got",
  "gotten",
  "greetings",
  "h",
  "had",
  "hadn't",
  "happens",
  "hardly",
  "has",
  "hasn't",
  "have",
  "haven't",
  "having",
  "he",
  "he'd",
  "he'll",
  "hello",
  "help",
  "hence",
  "her",
  "here",
  "hereafter",
  "hereby",
  "herein",
  "here's",
  "hereupon",
  "hers",
  "herself",
  "he's",
  "hi",
  "high",
  "him",
  "himself",
  "his",
  "hither",
  "hopefully",
  "how",
  "howbeit",
  "however",
  "how's",
  "i",
  "i'd",
  "ie",
  "if",
  "ignored",
  "i'll",
  "i'm",
  "immediate",
  "in",
  "inasmuch",
  "inc",
  "indeed",
  "indicate",
  "indicated",
  "indicates",
  "inner",
  "insofar",
  "instead",
  "into",
  "inward",
  "is",
  "isn't",
  "it",
  "its",
  "it's",
  "itself",
  "i've",
  "j",
  "just",
  "k",
  "keep",
  "keeps",
  "kept",
  "know",
  "known",
  "knows",
  "l",
  "last",
  "lately",
  "later",
  "latter",
  "latterly",
  "least",
  "less",
  "lest",
  "let",
  "let's",
  "like",
  "liked",
  "likely",
  "little",
  "long",
  "look",
  "looking",
  "looks",
  "ltd",
  "m",
  "made",
  "mainly",
  "make",
  "many",
  "may",
  "maybe",
  "me",
  "mean",
  "meanwhile",
  "merely",
  "might",
  "more",
  "moreover",
  "most",
  "mostly",
  "much",
  "must",
  "mustn't",
  "my",
  "myself",
  "n",
  "name",
  "namely",
  "nd",
  "near",
  "nearly",
  "necessary",
  "need",
  "needs",
  "neither",
  "never",
  "nevertheless",
  "new",
  "next",
  "nine",
  "no",
  "nobody",
  "non",
  "none",
  "noone",
  "nor",
  "normally",
  "not",
  "nothing",
  "novel",
  "now",
  "nowhere",
  "o",
  "obviously",
  "of",
  "off",
  "often",
  "oh",
  "ok",
  "okay",
  "old",
  "on",
  "once",
  "one",
  "ones",
  "only",
  "onto",
  "or",
  "other",
  "others",
  "otherwise",
  "ought",
  "our",
  "ours",
  "ourselves",
  "out",
  "outside",
  "over",
  "overall",
  "own",
  "p",
  "particular",
  "particularly",
  "per",
  "perhaps",
  "placed",
  "please",
  "plus",
  "possible",
  "presumably",
  "probably",
  "provides",
  "put",
  "q",
  "que",
  "quite",
  "qv",
  "r",
  "rather",
  "rd",
  "re",
  "really",
  "reasonably",
  "regarding",
  "regardless",
  "regards",
  "relatively",
  "respectively",
  "right",
  "s",
  "said",
  "same",
  "saw",
  "say",
  "saying",
  "says",
  "second",
  "secondly",
  "see",
  "seeing",
  "seem",
  "seemed",
  "seeming",
  "seems",
  "seen",
  "self",
  "selves",
  "sensible",
  "sent",
  "serious",
  "seriously",
  "seven",
  "several",
  "shall",
  "shan't",
  "she",
  "she'd",
  "she'll",
  "she's",
  "should",
  "shouldn't",
  "since",
  "six",
  "so",
  "some",
  "somebody",
  "somehow",
  "someone",
  "something",
  "sometime",
  "sometimes",
  "somewhat",
  "somewhere",
  "soon",
  "sorry",
  "specified",
  "specify",
  "specifying",
  "still",
  "sub",
  "such",
  "sup",
  "sure",
  "t",
  "take",
  "taken",
  "tell",
  "tends",
  "th",
  "than",
  "thank",
  "thanks",
  "thanx",
  "that",
  "thats",
  "that's",
  "the",
  "their",
  "theirs",
  "them",
  "themselves",
  "then",
  "thence",
  "there",
  "thereafter",
  "thereby",
  "therefore",
  "therein",
  "theres",
  "there's",
  "thereupon",
  "these",
  "they",
  "they'd",
  "they'll",
  "they're",
  "they've",
  "think",
  "third",
  "this",
  "thorough",
  "thoroughly",
  "those",
  "though",
  "three",
  "through",
  "throughout",
  "thru",
  "thus",
  "tis",
  "to",
  "together",
  "too",
  "took",
  "toward",
  "towards",
  "tried",
  "tries",
  "truly",
  "try",
  "trying",
  "twas",
  "twice",
  "two",
  "u",
  "un",
  "under",
  "unfortunately",
  "unless",
  "unlikely",
  "until",
  "unto",
  "up",
  "upon",
  "us",
  "use",
  "used",
  "useful",
  "uses",
  "using",
  "usually",
  "uucp",
  "v",
  "value",
  "various",
  "very",
  "via",
  "viz",
  "vs",
  "w",
  "want",
  "wants",
  "was",
  "wasn't",
  "way",
  "we",
  "we'd",
  "welcome",
  "well",
  "we'll",
  "went",
  "were",
  "we're",
  "weren't",
  "we've",
  "what",
  "whatever",
  "what's",
  "when",
  "whence",
  "whenever",
  "when's",
  "where",
  "whereafter",
  "whereas",
  "whereby",
  "wherein",
  "where's",
  "whereupon",
  "wherever",
  "whether",
  "which",
  "while",
  "whither",
  "who",
  "whoever",
  "whole",
  "whom",
  "who's",
  "whose",
  "why",
  "why's",
  "will",
  "willing",
  "wish",
  "with",
  "within",
  "without",
  "wonder",
  "won't",
  "would",
  "wouldn't",
  "x",
  "y",
  "yes",
  "yet",
  "you",
  "you'd",
  "you'll",
  "your",
  "you're",
  "yours",
  "yourself",
  "yourselves",
  "you've",
  "z",
  "zero",
];

function NewsSearch() {
  const [user, setUser] = useState("");
  const [input, setInput] = useState("");
  const [resultIDs, setResultIDs] = useState([]);
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [day, setDay] = useState(new Date().getDate());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [likes, setLikes] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate()

  //check authenticated
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
  }, [])


  //refresh the date occassionally
  useEffect(() => {
    const interval = setInterval(() => {
      var date = new Date();
      setDay(date.getDate());
      setYear(date.getFullYear());
      setMonth(date.getMonth() + 1);
    }, 10000);
  }, []);
  //const date = new Date();
  //var year = date.getFullYear();

  const set = new Set();
  stopwords.forEach((s) => set.add(s));

  //upon submission, get the results from the news article database first, upon cleaning entry
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(input);
    var split = input.split(" ");
    const cnts = new Map();
    cnts.clear();
    const ps = [];
    split.forEach((word) => {
      var lower = word.toLowerCase();
      if (!set.has(lower)) {
        var stemmed = stemmer(lower);
        var p = new Promise((resolve, reject) => {
          db.newsSearch(stemmed, function (err, data) {
            if (err) {
              console.log(err);
              reject(err);
            } else {
              console.log("that worked");
              data.Items.forEach((elt) => {
                if (elt.date) {
                  var helper = elt.date.S.split("-");
                  var aYear = parseInt(helper[0]);
                  var aMonth = parseInt(helper[1]);
                  var aDay = parseInt(helper[2]);
                  var check = false;
                  if (aYear < year) check = true;
                  else if (aYear === year) {
                    if (aMonth < month) check = true;
                    else if (aMonth === month) {
                      check = aDay <= day;
                    }
                  }
                  if (check) {
                    if (cnts.has(elt.id.N))
                      cnts.set(elt.id.N, cnts.get(elt.id.N) + 1);
                    else cnts.set(elt.id.N, 1);
                  }
                }
              });
              resolve(data);
            }
          });
        });
        ps.push(p);
      }
    });
    Promise.all(ps).then((x) => {
      var newResults = [...cnts.keys()];

      const idToWeight = new Map();

      //get article weights
      var getWeights = new Promise((resolve, reject) => {
        db.getWeights(user, function (err, data) {
          if (err || !data) {
            console.log(err);
            reject(err);
          } else {
            data.Items.forEach((item) => {
              var id = item.article.S;
              var weight = item.weight.N;
              idToWeight.set(id, weight);
            });
            resolve(data);
          }
        });
      });
      //need to sort as per the specification
      getWeights.then(() => {
        console.log(idToWeight);
        newResults.sort((a, b) => {
          if (cnts.get(b) !== cnts.get(a)) return cnts.get(b) - cnts.get(a);
          if (idToWeight.has(b) && !idToWeight.has(a)) return 1;
          if (idToWeight.has(a) && !idToWeight.has(b)) return -1;
          if (idToWeight.has(a) && idToWeight.has(b))
            return idToWeight.get(b) - idToWeight.get(a);
          return 0;
        });
        //render the first few results right away from sorted list
        console.log("sorted");
        console.log(newResults);
        setResultIDs(newResults);
        newResults = newResults.slice(0, 75);
        var toAdd = [];
        var ps2 = [];
        for (var i = 0; i < newResults.length; i++) {
          const index = i;
          var p = new Promise((resolve, reject) => {
            const id = newResults[index];
            console.log(id);
            db.getArticle(id, function (err, data) {
              if (err || !data) {
                console.log("issue with getting article " + id);
                reject(err);
              } else {
                console.log(data);
                newResults[index] = {
                  headline:
                    data.Item && data.Item.headline
                      ? data.Item.headline.S
                      : "No headline available",
                  description:
                    data.Item && data.Item.short_description
                      ? data.Item.short_description.S
                      : "No description available",
                  link: data.Item && data.Item.link ? data.Item.link.S : "",
                  id: id,
                };
                resolve(data);
              }
            });
          });
          ps2.push(p);
        }
        Promise.all(ps2).then(() => {
          console.log("finished dynamo work");
          //console.log(newResults)
          console.log(newResults);
          console.log("ids");
          console.log(resultIDs);
          setResults(newResults);
          setPage(1);
        });
        //console.log(newResults);
      });
    });
  };

  //update likes in newsfeed regularly, and only load newsfeed upon authentication
  useEffect(() => {
    if (user === "") return;
    db.getNewsfeed(user, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        if (data.Items[0].likes) {
          setLikes(data.Items[0].likes.SS);
          console.log(likes);
        }
      }
    });
    const interval = setInterval(() => {
      db.getNewsfeed(user, function (err, data) {
        if (err) {
          console.log(err);
        } else {
          if (data.Items[0].likes) {
            setLikes(data.Items[0].likes.SS);
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [user]);

  //checking where user is for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  //set next page of results
  useEffect(() => {
    if (
      scrollPosition > 0 &&
      scrollPosition + window.innerHeight >= document.body.offsetHeight
    ) {
      setPage(page + 1);
    }
  }, [scrollPosition]);

  //render the next page after user scrolls to bottom in the exact same was as before
  useEffect(() => {
    console.log("used effect on the page changing to " + page);
    var pss = [];
    var newResults = [...results];
    for (
      var i = page * 75;
      i < Math.min(page * 75 + 75, resultIDs.length);
      i++
    ) {
      const index = i;
      const p = new Promise((resolve, reject) => {
        const id = resultIDs[index];
        console.log("id");
        console.log(id);
        db.getArticle(id, function (err, data) {
          if (err || !data) {
            console.log("issue with getting article " + id);
            reject(err);
          } else {
            console.log(data);
            newResults[index] = {
              id: id,
              headline: data.Item.headline.S,
              description:
                data.Item && data.Item.short_description
                  ? data.Item.short_description.S
                  : "No description available",
              link: data.Item && data.Item.link ? data.Item.link.S : "",
            };
            resolve(data);
          }
        });
      });
    }

    Promise.all(pss).then(setResults(newResults));
  }, [page]);

  const handleChange = (e) => {
    setInput(e.target.value);
  };

  // click of button for likes/unlikes
  const handleClick = (e) => {
    if (likes.indexOf(e.target.id) < 0) {
      db.likeArticle(e.target.id, user, function (err, data) {
        if (err) {
          setError("Error liking article");
        } else {
          setLikes((likes) => [...likes, e.target.id]);
          console.log(likes);
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

  //render the table with all the articles in it
  return (
    <div className="parent-div">
      <form onSubmit={handleSubmit}>
        <div className="w-75 form-group col-lg-8 offset-lg-2 mt-5 mb-5">
          <input
            className="form-control"
            placeholder="Search for news articles"
            type="text"
            onChange={handleChange}
            value={input}
            name="input"
          ></input>
        </div>
      </form>
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
          {results &&
            results.map((elt) =>
              elt ? (
                <ArticleRow
                  id={elt.id}
                  likes={likes}
                  link={elt.link}
                  headline={elt.headline}
                  description={elt.description}
                  handleClick={handleClick}
                ></ArticleRow>
              ) : (
                <></>
              )
            )}
        </tbody>
      </table>
    </div>
  );
}

//render each individual article and the correct button for it
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

export default NewsSearch;
