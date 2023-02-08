const uuid = require('uuidv4');
const { v4: uuidv4 } = require("uuid");
const SHA3 = require('crypto-js/sha3');

var AWS = require("aws-sdk");
const { DocumentClient } = require("aws-sdk/clients/dynamodb");
AWS.config.update({ region: "us-east-1" });
// set aws credentials
const accessKeyId = '';
const secretAccessKey = '';

AWS.config.update({
  accessKeyId,
  secretAccessKey
});
var db = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();

/* The function below is an example of a database method. Whenever you need to 
   access your database, you should define a function (myDB_addUser, myDB_getPassword, ...)
   and call that function from your routes - don't just call DynamoDB directly!
   This makes it much easier to make changes to your database schema. */

// lookup user
var user_lookup = function (username, callback) {
  var params = {
    KeyConditions: {
      username: {
        ComparisonOperator: "EQ",
        AttributeValueList: [{ S: username }],
      },
    },
    TableName: "users",
  };

  // query the database
  db.query(params, function (err, data) {
    if (err || data.Items.length === 0) {
      callback(err, null);
    } else {
      console.log("data");
      console.log(data.Items);
      callback(err, data.Items[0]);
    }
  });
};

// does this route serve any purpose?
var user_Initialize = function (username) {
  console.log("Looking up: " + username);

  var params = {
    KeyConditions: {
      username: {
        ComparisonOperator: "EQ",
        AttributeValueList: [{ S: username }],
      },
    },
    TableName: "users",
  };

  // query the database
  db.query(params);
};

var user_add = function (username, password, fullname, affiliation, email, interests, birthday, callback) {
  console.log("Adding: " + username);
  // adding a new user to the database
  // hashing the password
  const hashedPassword = SHA3(password).toString();
  const capsInterests = interests.map((interest) => interest.toUpperCase());
  var params = {
    TableName: "users",
    Item: {
      username: { S: username },
      password: { S: hashedPassword },
      fullname: { S: fullname },
      affiliation: {S: affiliation},
      email: {S: email},
      interests: {SS: capsInterests},
      birthday: {S: birthday},
    },
  };

  var searchParams = {
    TableName: "user_search",
    Item: {
      id: {S: "placeholder"},
      username: {S: username },
    }
  };
  
  var checkParams = {
    TableName: "users",
    Key: {
      "username" : {
        "S": username
      }
    }
  }

  db.getItem(checkParams, function (err, data) {
    if (err) {
      console.log(err);
      callback(err, null);
    } else if (!data.Item) {
      db.putItem(params, function (err, data) {
        if (err) {
          console.log(err);
          callback(err, null);
        } else {
          db.putItem(searchParams, function (err, data) {
            if (err) {
              console.log(err);
              callback(err, null);
            } else {
              callback(null, data);
            }
          });
        }
      });
    } else {
      callback(null, null);
    }
  })
};


// Remove user's friend
var friend_remove = function (username, friend, callback) {
  console.log("Remove friend: " + friend);
  var params = {
    TableName: "users",
    Key: {
      "username": {"S": username}
    },
    AttributeUpdates: {
      "friends": {
        Action: "DELETE",
        Value: {"SS": [friend]}
      }
    }
  };
  db.updateItem(params, function (err, data) {
    if (err) {
      callback(err, null);
    } else {
      var params = {
        TableName: "users",
        Key: {
          "username": {"S": friend}
        },
        AttributeUpdates: {
          "friends": {
            Action: "DELETE",
            Value: {"SS": [username]}
          }
        }
      };
      db.updateItem(params, function(err, data) {
        if (err) {
          callback(err, null);
        } else {
          callback(err, data)
        }
      })
    }
  });
};

// Add a friend for user, also involves removing friend from the pending list
var friend_add = function (username, friend, callback) {
  console.log("Add friend: " + friend);
  // adding a new friend to the database
  var myParams = {
    TableName: "users",
    Key: {
      "username": {"S": username}
    },
    AttributeUpdates: {
      "friends": {
        Action: "ADD",
        Value: {"SS": [friend]}
      },
      "requests": {
        Action: "DELETE",
        Value: {"SS": [friend]}
      }
    }
  };

  var yourParams = {
    TableName: "users",
    Key: {
      "username": {"S": friend}
    },
    AttributeUpdates: {
      "friends": {
        Action: "ADD",
        Value: {"SS": [username]}
      },
      "pending": {
        Action: "DELETE",
        Value: {"SS": [username]}
      }
    }
  };
  
  db.updateItem(myParams, function (err, data) {
    if (err) {
      callback(err, null);
    } else {
      db.updateItem(yourParams, function (err, data) {
        if (err) {
          callback(err, null);
        } else {
          const timestamp = String(Math.floor(Date.now() / 1000));
          const id = uuid();
          add_post(id, username, true, username + " is now friends with " + friend, timestamp, username, function(err, data) {
            if (err) {
              callback(err, null);
            }
          });
          add_post_inverted(id, username, true, username + " is now friends with " + friend, timestamp, username, function(err, data) {
            if (err) {
              callback(err, null);
            }
          });
          const id2 = uuid();
          add_post(id2, friend, true, friend + " is now friends with " + username, timestamp, friend, function(err, data) {
            if (err) {
              callback(err, null);
            }
          });
          add_post_inverted(id2, friend, true, friend + " is now friends with " + username, timestamp, friend, function(err, data) {
            if (err) {
              callback(err, null);
            }
          });
          callback(null, data);
        }
      });
    }
  });
};

// Request a friend for user, add friend to the pending list
var friend_request = function (username, friend, callback) {
  console.log("Request friend: " + friend);
  // adding a new friend to the pending db
  var myParams = {
    TableName: "users",
    Key: {
      "username": {"S": username}
    },
    AttributeUpdates: {
      "pending": {
        Action: "ADD",
        Value: {"SS": [friend]}
      }
    }
  };

  var yourParams = {
    TableName: "users",
    Key: {
      "username": {"S": friend}
    },
    AttributeUpdates: {
      "requests": {
        Action: "ADD",
        Value: {"SS": [username]}
      }
    }
  };
  
  db.updateItem(myParams, function (err, data) {
    if (err) {
      callback(err, null);
    } else {
      db.updateItem(yourParams, function (err, data) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, data);
        }
      });
    }
  });
};

// reject the friend request
var friend_reject = function (username, friend, callback) {
  console.log("Deny friend: " + friend);
  var myParams = {
    TableName: "users",
    Key: {
      "username": {"S": username}
    },
    AttributeUpdates: {
      "requests": {
        Action: "DELETE",
        Value: {"SS": [friend]}
      }
    }
  };

  var yourParams = {
    TableName: "users",
    Key: {
      "username": {"S": friend}
    },
    AttributeUpdates: {
      "pending": {
        Action: "DELETE",
        Value: {"SS": [username]}
      }
    }
  };
  
  db.updateItem(myParams, function (err, data) {
    if (err) {
      callback(err, null);
    } else {
      db.updateItem(yourParams, function (err, data) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, data);
        }
      });
    }
  });
}

// we add the user to the database and redirect accordingly
var create_account = function (req, res, setError, setUser) {
  var username = "thakers";
  var password = "ilovefood";
  var fullname = "Sachin Thaker";
  var email = "thakers@seas.upenn.edu";
  var interests = ["fashion", "food", "travel"];
  var affiliation = "UCSD";
  var friends = ["tars", "sarah", "joe"];
  var isOnline = true;
  user_add(
    username,
    password,
    fullname,
    interests,
    affiliation,
    email,
    friends,
    isOnline,
    function (err, data) {
      if (err) {
        res.render("results.ejs", {
          theInput: username,
          message: err,
          result: null,
        });
      } else {
        setUser(username);
        res.redirect("/");
      }
    }
  );
};

// delete the user
var delete_user = function (username, callback) {
  var params = {
    TableName: "users",
    username: {
      username: { N: username },
    },
  };
  db.deleteItem(params, function (err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data);
    }
  });
};

var get_friends_chat = function (username, callback) {
  var params = {
    ExpressionAttributeValues: {
      ":u": { S: username },
    },
    KeyConditionExpression: "username = :u",
    ProjectionExpression: "friends",
    TableName: "users",
  };
  db.query(params, function (err, data) {
    if (err) {
      console.log(err);
      callback(err, null);
    } else {
      callback(err, data);
    }
  });
};

// get user's friends
var get_friends = function(username, callback) {
  console.log("getting friends for " + username);
  if (!username || username == "") {
    return [];
  }
  var params = {
    ExpressionAttributeValues: {
      ':u': {S : username},
    },
    KeyConditionExpression: 'username = :u',
    ProjectionExpression: 'friends, requests, pending, affiliation',
    TableName: 'users'
  };
  db.query(params, function(err, data) {
    if (err) {
      console.log(err);
      callback(err, null);
    } else {
      callback(null, data);
      console.log(data);
    }
  });
}

// get user's affiliation (for use in the friend visualizer)
var get_affiliation = function(username, callback) {
  console.log("getting affiliation for " + username);
  var params = {
    ExpressionAttributeValues: {
      ':u': {S : username},
    },
    KeyConditionExpression: 'username = :u',
    ProjectionExpression: 'affiliation',
    TableName: 'users'
  };
  db.query(params, function(err, data) {
    if (err) {
      console.log(err);
      callback(err, null);
    } else {
      console.log(data);
      callback(null, data);
    }
  });
}

// update user from acct settings
var update_user = function(username, affiliation, email, interests, callback) {
  console.log("Updating " + username);
  const capsInterests = interests.map((interest) => interest.toUpperCase());
  var params = {
    TableName: "users",
    Key: {
      "username" : username
    },
    UpdateExpression: "set affiliation = :a, email = :e, interests = :i",
    ExpressionAttributeValues: {
      ":a" : affiliation,
      ":e" : email,
      ":i" : docClient.createSet(capsInterests),
    },
  };
  docClient.update(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data);
    }
  });
}

var update_user_new = function(username, affiliation, email, interests, wallvisibility, callback) {
  console.log("Updating " + username);
  const capsInterests = interests.map((interest) => interest.toUpperCase());
  var params = {
    TableName: "users",
    Key: {
      "username" : username
    },
    UpdateExpression: "set affiliation = :a, email = :e, interests = :i, wallVisibility = :w",
    ExpressionAttributeValues: {
      ":a" : affiliation,
      ":e" : email,
      ":i" : docClient.createSet(capsInterests),
      ":w" : wallvisibility
    },
  };
  docClient.update(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data);
    }
  });
}

// get user status
var get_status = function (username, callback) {
  console.log("Looking up status of: " + username);

  var params = {
    KeyConditions: {
      username: {
        ComparisonOperator: "EQ",
        AttributeValueList: [{ S: username }],
      },
    },
    TableName: "users",
    AttributesToGet: ["isOnline"],
  };

  // query the database
  db.query(params, function (err, data) {
    console.log(err);
    console.log(data);
    if (err || data.Items.length === 0) {
      callback(err, null);
    } else {
      console.log(data.Items[0]);
      callback(err, data.Items[0].isOnline);
    }
  });
};


var set_online = async (username) => {
  var params = {
    TableName: "users",
    Key: {
      username: { S: username },
    },
    UpdateExpression: "SET isOnline = :isOnline",
    ExpressionAttributeValues: {
      ":isOnline": { BOOL: true },
    },
  };
  await db.updateItem(params).promise();
};

var set_offline = async (username) => {
  var params = {
    TableName: "users",
    Key: {
      username: { S: username },
    },
    UpdateExpression: "SET isOnline = :isOnline",
    ExpressionAttributeValues: {
      ":isOnline": { BOOL: false },
    },
  };
  await db.updateItem(params).promise();
};

var post_lookup = function (username, callback) { //used to query the posts_new table using GSI (Global Secondary Index) to get all POSTS with wallUsername equal to username
  var params = {
    TableName: "posts_new",
    IndexName: "wallUsername-index",
    KeyConditionExpression  : "#user = :username",
    ExpressionAttributeNames: {
        "#user": "wallUsername"
    },
    ExpressionAttributeValues: {
      ":username" : {
        S: username
      }
    },
  };

  // query the database
  db.query(params, function (err, data) {
    if (err || data.Items.length === 0) {
      callback(err, null);
    } else {
      callback(err, data.Items);
    }
  });
};

var post_lookup_inverted = function (username, callback) { //used to query the posts table using GSI (Global Secondary Index) to get all POSTS with wallUsername equal to username
  // console.log("Looking up posts for creator: " + username);
  var params = {
    TableName: "posts",
    IndexName: "creator-index",
    KeyConditionExpression  : "#user = :username",
    ExpressionAttributeNames: {
        "#user": "creator"
    },
    ExpressionAttributeValues: {
      ":username" : {
        S: username
      }
    },
  };

  // query the database
  db.query(params, function (err, data) {
    if (err || data.Items.length === 0) {
      callback(err, null);
    } else {
      callback(err, data.Items);
    }
  });
};

var post_id_lookup = function (username, callback) { //used to query the posts_new table using GSI (Global Secondary Index) to get all POST IDs with wallUsername equal to username
  // console.log("Looking up posts for wall username equal to : " + username); 

  var params = {
    TableName: "posts_new",
    IndexName: "wallUsername-index",
    KeyConditionExpression  : "#user = :username",
    ExpressionAttributeNames: {
        "#user": "wallUsername"
    },
    ExpressionAttributeValues: {
      ":username" : {
        S: username
      }
    },
    ProjectionExpression: "postID"
  };

  // query the database
  db.query(params, function (err, data) {
    if (err || data.Items.length === 0) {
      callback(err, null);
    } else {
      callback(err, data.Items);
    }
  });
};

// get all the posts and users in a group by the group name
var group_lookup = function(group, callback) {
  console.log("Getting all posts for group: " + group);
  const params = {
    TableName: "groups",
    Key: {
      "group" : {
        S: group
      }
    },
  }

  db.getItem(params, function (err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, data);
    }
  })
}

// call to join a group
var join_group = function(username, group, callback) {
  console.log("Joining group " + group);
  const groupParams = {
    TableName: "groups",
    Key: {
      "id": {
        "S": "placeholder"
      },
      "group": {
        "S": group
      }
    },
    AttributeUpdates: {
      "users": {
        Action: "ADD",
        Value: {"SS": [username]}
      },
    }
  }
  const userParams = {
    TableName: "users",
    Key: {
      "username": {
        "S": username
      }
    },
    AttributeUpdates: {
      "groups": {
        Action: "ADD",
        Value: {"SS": [group]}
      },
    }
  }

  db.updateItem(groupParams, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      db.updateItem(userParams, function(err, data) {
        if (err) {
          callback(err, null);
        } else {
          callback(err, data);
        }
      })
    }
  })
}

// create a group if the group anme isn't already taken
var create_group = function (username, group, callback) {
  console.log("Adding: " + group);
  const checkParams = {
    TableName: "users",
    Key: {
      "username" : {
        "S": group
      }
    }
  }

  const params = {
    TableName: "groups",
    Item: {
      id: { S: "placeholder" },
      group: { S: group },
      users: { SS: [username] },
    },
  };

  const userParams = {
    TableName: "users",
    Key: {
      "username": {
        "S": username
      }
    },
    AttributeUpdates: {
      "groups": {
        Action: "ADD",
        Value: {"SS": [group]}
      },
    }
  }

  db.getItem(checkParams, function(err, data) {
    if (err) {
      console.log(err);
    } else if (!data.Item) {
      console.log(data);
      db.putItem(params, function (err, data) {
        if (err) {
          console.log(err);
          callback(err, null);
        } else {
          db.updateItem(userParams, function(err, data) {
            if (err) {
              callback(err, null);
            } else {
              console.log(data);
              callback(err, data);
            }
          })
        }
      })
    } else {
      callback(null, null);
    }
  })
  
}

// get group suggestions fromt he search bar
var get_group_suggestions = function(search, callback) {
  console.log("getting suggestions for " + search);
  const params = {
    TableName: "groups",
    ExpressionAttributeValues: {":s" : {S: search}, ":p" : {S: "placeholder"}},
    ExpressionAttributeNames: {"#g" : "group", "#i" : "id"},
    KeyConditionExpression: "#i = :p and begins_with(#g, :s)"
  }
  db.query(params, function(err, data) {
    if (err) {
      console.log("Failed to get suggestions");
      console.log(err);
      callback(err, null);
    } else {
      console.log("Got suggestions");
      console.log(data);
      callback(err, data);
    }
  })
}

// get user's groups
var get_groups = function(username, callback) {
  console.log("getting groups for " + username);
  var params = {
    ExpressionAttributeValues: {
      ':u': {S : username},
    },
    KeyConditionExpression: 'username = :u',
    ProjectionExpression: 'groups',
    TableName: 'users'
  };
  db.query(params, function(err, data) {
    if (err) {
      console.log(err);
      callback(err, null);
    } else {
      callback(null, data);
      console.log(data);
    }
  })
}

// update the user's password
var update_password = function(username, password, callback) {
  console.log("Updating password for " + username)
  // hashing the password
  const hashedPassword = SHA3(password).toString();
  const params = {
    TableName: "users",
    Key: {
      "username" : username
    },
    UpdateExpression: "set password = :p",
    ExpressionAttributeValues: {
      ":p" : hashedPassword
      //":u" : {S: username}
    },
  };
  docClient.update(params, function(err, data) {
    if (err) {
      console.log("Update user did not work");
      callback(err, null);
    } else {
      console.log("Ig the update worked? ");
      callback(err, data);
    }
  });
}

// verify user's password in hashed form
var check_password = function(username, password, callback) {
  console.log("checking password for " + username);
  // hashing the password
  const hashedPassword = SHA3(password).toString();
  const params = {
    TableName: "users",
    ExpressionAttributeValues: {":u" : {S: username}},
    KeyConditionExpression: "username = :u"
  };
  db.query(params, function(err, data) {
    if (err) {
      console.log("failed to check password");
      console.log(err);
      callback(err, null);
    } else if (!data.Items[0]) {
      callback(null, null);
    } else {
      console.log(data.Items[0]);
      if (hashedPassword === data.Items[0].password.S) callback(null, true);
      else callback(null, false);
    }
  });
}

//used to query the posts table using GSI (Global Secondary Index) to get all POST IDs with wallUsername equal to username
var post_id_lookup_inverted = function (username, callback) { 
  var params = {
    TableName: "posts",
    IndexName: "creator-index",
    KeyConditionExpression  : "#user = :username",
    ExpressionAttributeNames: {
        "#user": "creator"
    },
    ExpressionAttributeValues: {
      ":username" : {
        S: username
      }
    },
    ProjectionExpression: "postID"

  };

  // query the database
  db.query(params, function (err, data) {
    if (err || data.Items.length === 0) {
      callback(err, null);
    } else {
      callback(err, data.Items);
    }
  });
}

var add_post = function (uuid, creator, isStatusUpdate, postText, timestamp, wallUsername, callback) { //add post to posts db, should always be used in conjunction with the next add post inverted
  // secondary key is creator - this 
  // console.log("Adding post created by: " + creator);
  // adding a new user to the database
  var params = {
    TableName: "posts",
    Item: {
      postID: {S: uuid},
      creator: { S: creator },
      isStatusUpdate: { BOOL: isStatusUpdate },
      postText: { S: postText },
      timestamp: { S: timestamp },
      wallUsername: { S: wallUsername }
    },
  };

  db.putItem(params, function (err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data);
    }
  });
};

// get message from messageID
var get_message = function (messageID, callback) {
  console.log("Looking up Message: " + messageID);

  var params = {
    Key: {
      "id": {
        S: messageID
       }
     }, 
    TableName: "messages"
  };

  // query the database
  db.getItem(params, function (err, data) {
    console.log(err);
    console.log(data);
    if (err || !data.Item) {
      callback(err, null);
    } else {
      callback(err, data.Item);
    };
  });
}

//add post to posts_new db, should always be used in conjunction with the add post call
var add_post_inverted = function (uuid, creator, isStatusUpdate, postText, timestamp, wallUsername, callback) {  
  // console.log("Adding post created by: " + creator);
  // adding a new user to the database
  var params = {
    TableName: "posts_new",
    Item: {
      postID: {S: uuid},
      wallUsername: { S: wallUsername },
      isStatusUpdate: { BOOL: isStatusUpdate },
      postText: { S: postText },
      timestamp: { S: timestamp },
      creator: { S: creator }
    },
  };

  db.putItem(params, function (err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data);
    }
  });
};

var get_chat_names = function (username, callback) {
  var params = {
    KeyConditions: {
      username: {
        ComparisonOperator: "EQ",
        AttributeValueList: [{ S: username }],
      },
    },
    TableName: "users",
    AttributesToGet: ["chats"],
  };
  db.query(params, function (err, data) {
    if (err || data.Items.length === 0) {
      console.log(err);
      callback(err, []);
    } else {
      callback(err, data);
    }
  });
};

var get_chat = async function (chatName, callback) {
  var params = {
    KeyConditions: {
      chatID: {
        ComparisonOperator: "EQ",
        AttributeValueList: [{ S: chatName }],
      },
    },
    TableName: "chats1",
    AttributesToGet: ["messages"],
  };
  const data = await db.query(params).promise().then((data) => {
    if (data.Items[0] && data.Items[0].messages) {
      return data.Items[0].messages.SS;
    }
    return [];
  }).catch((err) => {
    console.log(err);
    return [];
  })
  var msgs = data.map((msg) => {
    return get_message(msg);
  });
  msgs = await Promise.all(msgs).then((values) => {
    return values.map((msg) => {
      const curMsg = msg.Items[0];
      if (curMsg.sender) {
        return {
          sender: curMsg.sender.S,
          text: curMsg.text.S,
          isImage: curMsg.isImage.BOOL,
          timestamp: curMsg.timestamp.S,
        };
      }
      return null;
    });
  });
  // maintain consistent ordering
  msgs.sort((a, b) => {
    return a.timestamp - b.timestamp;
  });
  return msgs;
};

var check_group_exists = function(group, callback) {
  var params = {
    TableName: "groups",
    Key: {
      "id": {
          S: "placeholder"
       },
       "group": {
          S: group
       }
     }
  }

  db.getItem(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, data.Item);
    }
  })
};

var get_message = (uuid) => {
  var params = {
    KeyConditions: {
      uuid: {
        ComparisonOperator: "EQ",
        AttributeValueList: [{ S: uuid }],
      },
    },
    TableName: "messages",
    AttributesToGet: ["isImage", "sender", "text", "timestamp"],
  };
  return db.query(params).promise();
}

var get_chat_invites = function (username, callback) {
  var params = {
    KeyConditions: {
      username: {
        ComparisonOperator: "EQ",
        AttributeValueList: [{ S: username }],
      },
    },
    TableName: "users",
    AttributesToGet: ["chatIncomingInvites"],
  };
  db.query(params, function (err, data) {
    if (err) {
      console.log(err);
      callback(err, []);
    } else {
      callback(err, data);
    }
  });
};

const get_chat_sent_invites = (username) => {
  const params = {
    KeyConditions: {
      username: {
        ComparisonOperator: "EQ",
        AttributeValueList: [{ S: username }],
      },
    },
    TableName: "users",
    AttributesToGet: ["chatOutgoingInvites"],
  };
  try {
    return db.query(params).promise();
  } catch (err) {
    console.log(err);
    return [];
  }
}

const remove_user_from_chat = async (chatName, username) => {
  // chat names are formatted as "name1*name2*name3[i]"
  // where the name are alphabetical and where i is the number of the chat
  // in this function, we want to remove the user from the chat
  // we name the new chat "name1*name2*name3[k]" where k is smallest number such that "name1*name2*name3[k]" is not a chat name
  // we also update the users table to reflect the new chat name
  console.log("removing user from chat");
  const userNames = chatName.replace(/\[.*/, "").split("*");
  const newUserNames = userNames.filter((name) => name !== username);
  if (newUserNames.length === 0) {
    await deleteChat(chatName);
    await removeFromUserChats(chatName, username);
    return;
  }
  const newChatName = await getNewChatName(newUserNames);
  const messagesIDs = await getMessageIDs(chatName);
  await deleteChat(chatName);
  await createChat(newChatName, messagesIDs);
  await removeFromUserChats(chatName, username);
  await updateNewUserChats(chatName, newChatName, newUserNames);
};

const getNewChatName = async (newUserNames) => {
  newUserNames.sort();
  let newChatName = newUserNames.join("*");
  console.log(newChatName);
  let i = 0;
  let chatExists = false;
  while (true) {
    chatExists = await checkIfChatExists(`${newChatName}[${i}]`);
    if (!chatExists || i > 500) {
      break;
    }
    i++;
  }
  newChatName = `${newChatName}[${i}]`;
  return newChatName;
}


const checkIfChatExists = async (chatID) => {
  const params = {
    TableName: "chats1",
    Key: {
      chatID: { S: chatID },
    },
  };

  try {
    const result = await db.getItem(params).promise();
    if (result.Item) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};

const deleteChat = async (chatID) => {
  if (chatID === "") {
    return;
  }
  const params = {
    TableName: "chats1",
    Key: {
      chatID: { S: chatID },
    },
  };

  try {
    await db.deleteItem(params).promise();
  } catch (error) {
    console.error(error);
  }
};

const createChat = async (chatID, messages) => {
  if (chatID === "" || !messages) {
    return;
  }
  const params = {
    TableName: "chats1",
    Item: {
      chatID: { S: chatID },
      ...(messages.length > 0 && { messages: { SS: messages } }),
    },
  };

  try {
    await db.putItem(params).promise();
  } catch (error) {
    console.error(error);
  }
};

const getMessageIDs = async (chatID) => {
  if (chatID === "") {
    return;
  }
  var params = {
    KeyConditions: {
      chatID: {
        ComparisonOperator: "EQ",
        AttributeValueList: [{ S: chatID }],
      },
    },
    TableName: "chats1",
    AttributesToGet: ["messages"],
  };
  const data = await db
    .query(params)
    .promise()
    .then((data) => {
      if (data.Items[0] && data.Items[0].messages) {
        return data.Items[0].messages.SS;
      }
      return [];
    })
    .catch((err) => {
      console.log(err);
      return [];
    });
    return data;
};

const removeFromUserChats = async (chatName, username) => {
  const params = {
    TableName: "users",
    Key: {
      username: { S: username },
    },
    UpdateExpression: "DELETE chats :chat",
    ExpressionAttributeValues: {
      ":chat": { SS: [chatName] },
    },
  };
  await db.updateItem(params).promise();
};

const updateNewUserChats = async (chatName, newChatName, newUserNames) => {
  for (let i = 0; i < newUserNames.length; i++) {
    // first remove the old chat name
    console.log("removing chat from user");
    console.log("chatName: ", chatName, "username: ", newUserNames[i]);
    const deleteParams = {
      TableName: "users",
      Key: {
        username: { S: newUserNames[i] },
      },
      UpdateExpression: "DELETE chats :chat",
      ExpressionAttributeValues: {
        ":chat": { SS: [chatName] },
      },
    };
    await db.updateItem(deleteParams).promise();

    // next set the new chat name
    addToUserChatList(newChatName, newUserNames[i]);
  }
}

const addToUserChatList = async (chatName, username) => {
  const setParams = {
    TableName: "users",
    Key: {
      username: { S: username },
    },
    UpdateExpression:
      "ADD chats :newChat",
    ExpressionAttributeValues: {
      ":newChat": { SS: [chatName] },
    },
  };
  await db.updateItem(setParams).promise();
}

const invite_user_to_chat = async (inviter, invitee) => {
  // if you have an incoming invite from this user, remove it and create chat
  const params = {
    TableName: "users",
    Key: {
      username: { S: inviter },
    },
  };
  const result = await db.getItem(params).promise();
  if (result.Item.chatIncomingInvites) {
    const incomingInvites = result.Item.chatIncomingInvites.SS;
    console.log('incoming: ', incomingInvites);
    if (incomingInvites.includes(invitee)) {
      accept_chat_invite(inviter, invitee, () => {});
      return;
    }
  }

  const outgoingParams = {
    TableName: "users",
    Key: {
      username: { S: inviter },
    },
    UpdateExpression: "ADD chatOutgoingInvites :newInvite",
    ExpressionAttributeValues: {
      ":newInvite": { SS: [invitee] },
    },
  };
  console.log(outgoingParams);
  await db.updateItem(outgoingParams).promise();

  const incomingParams = {
    TableName: "users",
    Key: {
      username: { S: invitee },
    },
    UpdateExpression: "ADD chatIncomingInvites :newInvite",
    ExpressionAttributeValues: {
      ":newInvite": { SS: [inviter] },
    },
  };
  console.log(incomingParams);
  await db.updateItem(incomingParams).promise();
}

const accept_chat_invite = async (inviter, invitee, callback) => {
  const outgoingParamsInviter = {
    TableName: "users",
    Key: {
      username: { S: inviter },
    },
    UpdateExpression: "DELETE chatOutgoingInvites :invitee",
    ExpressionAttributeValues: {
      ":invitee": { SS: [invitee] },
    },
  };
  await db.updateItem(outgoingParamsInviter).promise();

  const outgoingParamsInvitee = {
    TableName: "users",
    Key: {
      username: { S: invitee },
    },
    UpdateExpression: "DELETE chatOutgoingInvites :inviter",
    ExpressionAttributeValues: {
      ":inviter": { SS: [inviter] },
    },
  };
  await db.updateItem(outgoingParamsInvitee).promise();

  const incomingParamsInviter = {
    TableName: "users",
    Key: {
      username: { S: inviter },
    },
    UpdateExpression: "DELETE chatIncomingInvites :invitee",
    ExpressionAttributeValues: {
      ":invitee": { SS: [invitee] },
    },
  };
  await db.updateItem(incomingParamsInviter).promise();

  const incomingParamsInvitee = {
    TableName: "users",
    Key: {
      username: { S: invitee },
    },
    UpdateExpression: "DELETE chatIncomingInvites :inviter",
    ExpressionAttributeValues: {
      ":inviter": { SS: [inviter] },
    },
  };
  await db.updateItem(incomingParamsInvitee).promise();
  
  const userNamesArray = [inviter, invitee]
  const newChatName = await getNewChatName(userNamesArray);
  await addToUserChatList(newChatName, inviter);
  await addToUserChatList(newChatName, invitee);
  await addToChatsTable(newChatName);
  try {
    callback();
  } catch (error) {
    console.log('no callback');
  }
}

const addToChatsTable = async (chatName) => {
  const params = {
    TableName: "chats1",
    Item: {
      chatID: { S: chatName },
    },
  };
  await db.putItem(params).promise();
};

const add_to_new_chat = async (chatName, username) => {
  const userNames = chatName.replace(/\[.*/, "").split("*");
  userNames.push(username);
  const newChatName = await getNewChatName(userNames);
  console.log("new chat name: ", newChatName);
  for (let i = 0; i < userNames.length; i++) {
    await addToUserChatList(newChatName, userNames[i]);
  }
  await addToChatsTable(newChatName);
  return newChatName;
};

const add_to_same_chat = async (chatName, username) => {
  console.log("adding to same chat");
  const userNames = chatName.replace(/\[.*/, "").split("*");
  for (let i = 0; i < userNames.length; i++) {
    await removeFromUserChats(chatName, userNames[i]);
  }
  userNames.push(username);
  const newChatName = await getNewChatName(userNames);
  const messages = await getMessageIDs(chatName);
  console.log("messages: ", messages);
  await deleteChat(chatName);
  await createChat(newChatName, messages);
  for (let i = 0; i < userNames.length; i++) {
    await addToUserChatList(newChatName, userNames[i]);
  }
};

const add_message = async (chatName, sender, isImage, text, timestamp) => {
  console.log(chatName);
  const uuid = uuidv4();

   const addParams = {
    TableName: "chats1",
    Key: {
      chatID: { S: chatName },
    },
    UpdateExpression:
      "ADD messages :messages",
    ExpressionAttributeValues: {
      ":messages": { SS: [uuid] },
    },
  };
  await db.updateItem(addParams).promise();

  const params = {
    TableName: "messages",
    Item: {
      uuid: { S: uuid },
      chatID: { S: chatName },
      sender: { S: sender },
      isImage: { BOOL: isImage },
      text: { S: text },
      timestamp: { S: timestamp.toString() },
    },
  };
  await db.putItem(params).promise();
};


var add_comment = function (uuid, desiredPostID, creator, wallUsername, username, commentText, timestamp, callback) { //used to add a comment to posts db, should always be used with add_comment_inverted
  // console.log("Adding comment created by: " + username);
  // adding a new comment to the database
  var params = {
    TableName: "posts",
    Key: {
      'postID' : {
        S: desiredPostID
      },
      'creator' : {
        S: creator
      }
    },
    UpdateExpression: 'SET #c = list_append(#c, :val)',
    ExpressionAttributeValues: {
      ':val' : {
        L: [
          {M: { 
            'commentID' : {S: uuid},
            'commentText' : {S: commentText},
            'timestamp' : {S : timestamp},
            'username' : {S: username},
            }
          }
        ]
      },
    },
    ExpressionAttributeNames: {
      "#c" : "comment"
    },
    ReturnValues: 'ALL_NEW'
  };

  db.updateItem(params, function(err, data) {
      if (err) {
        // console.log("ran into error while updating comment")
        callback(err, null);
      } else {
        callback(err, data);
      }
  });
};

var add_comment_inverted = function (uuid, desiredPostID, creator, wallUsername, username, commentText, timestamp, callback) { //used to add a comment to posts db, should always be used with add_comment_inverted
  // console.log("Adding comment created by: " + username);
  // adding a new comment to the database
  var params = {
    TableName: "posts_new",
    Key: {
      'postID' : {
        S: desiredPostID
      },
      'wallUsername' : {
        S: wallUsername
      }
    },
    UpdateExpression: 'SET #c = list_append(#c, :val)',
    ExpressionAttributeValues: {
      ':val' : {
        L: [
          {M: { 
            'commentID' : {S: uuid},
            'commentText' : {S: commentText},
            'timestamp' : {S : timestamp},
            'username' : {S: username},
            }
          }
        ]
      },
    },
    ExpressionAttributeNames: {
      "#c" : "comment"
    },
    ReturnValues: 'ALL_NEW'
  };

  db.updateItem(params, function(err, data) {
      if (err) {
        // console.log("ran into error while updating comment")
        callback(err, null);
      } else {
        callback(err, data);
      }
  });
};


var get_post_by_id = function (id, callback) { //takes in a singular post ID and queries the posts table to get the corresponding post data - could also query posts_new
  var params = {
    TableName: "posts",
    KeyConditionExpression: 'postID = :id',
    ExpressionAttributeValues: {
      ':id' : {
        'S' : id
      }
    },
  };

  // query the database
  db.query(params, function (err, data) {
    if (err || data.Items.length === 0) {
      callback(err, null);
    } else {
      callback(err, data.Items[0]);
    }
  });
}

// get search suggestions from user search page
var get_suggestions = function(search, callback) {
  console.log("getting suggestions for " + search);
  const params = {
    TableName: "user_search",
    ExpressionAttributeValues: {":s" : {S: search}, ":p" : {S: "placeholder"}},
    ExpressionAttributeNames: {"#u" : "username", "#i" : "id"},
    KeyConditionExpression: "#i = :p and begins_with(#u, :s)"
  };
  db.query(params, function(err, data) {
    if (err) {
      console.log("Failed to get suggestions");
      console.log(err);
      callback(err, null);
    } else {
      console.log("Got suggestions");
      console.log(data);
      callback(err, data);
    }
  });
}

// get user's friends
var get_friends_homepage = function(username, callback) { //get all friends of a user in SS format, just feed in parameter for username
  // console.log("getting friends for " + username);
  var params = {
    ExpressionAttributeValues: {
      ':u': {S : username},
    },
    KeyConditionExpression: 'username = :u',
    ProjectionExpression: 'friends',
    TableName: 'users'
  };
  db.query(params, function(err, data) {
    if (err) {
      // console.log(err);
      callback(err, null);
    } else {
      callback(null, data.Items);
    }
  });
};

// Remove post from posts table
var delete_post = function(postID, creator, callback) {
  var params = {
    TableName: "posts",
    Key: {
      "postID" : {
        S: postID
      },
      "creator" : {
        S: creator
      }
    }
  };
  
  db.deleteItem(params, function (err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data);
    }
  });
};

// Remove post from posts_new table
var delete_post_inverted = function(postID, wallUsername, callback) {
  var params = {
    TableName: "posts_new",
    Key: {
      "postID" : {
        S: postID
      },
      "wallUsername" : {
        S: wallUsername
      }
    }
  };
  
  db.deleteItem(params, function (err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data);
    }
  });
};

// Remove comment from posts table
var delete_comment = function(postID, creator, newCommentArray, callback) {
  var params = {
    TableName: "posts",
    // ExpressionAttributeValues: {
    //   ':v': {
    //     N: newCommentArray.toString()
    //   }
    // },
    Key: {
        "postID" : {
          S: postID
        },
        "creator" : {
          S: creator
        }
      },
      UpdateExpression: 'REMOVE #comment[' + newCommentArray.toString() + ']',
      ExpressionAttributeNames: {
        '#comment' : 'comment',
      }
  };
  
  db.updateItem(params, function (err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data);
    }
  });
};

// Remove comment from posts table
var delete_comment_inverted = function(postID, wallUsername, newCommentArray, callback) {
  
  var params = {
    TableName: "posts_new",
    // ExpressionAttributeValues: {
    //   ':v': {
    //     N: newCommentArray.toString()
    //   }
    // },
    Key: {
        "postID" : {
          S: postID
        },
        "wallUsername" : {
          S: wallUsername
        }
      },
      UpdateExpression: 'REMOVE #comment[' + newCommentArray.toString() + ']',
      ExpressionAttributeNames: {
        '#comment' : 'comment',
      }
  };
  
  db.updateItem(params, function (err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data);
    }
  });
};

//used to query the comments table using GSI to get all POSTS with wallUsername equal to username
var comment_lookup = function (postID, callback) { 
  var params = {
    TableName: "comments",
    IndexName: "postID-index",
    KeyConditionExpression  : "#id = :v",
    ExpressionAttributeNames: {
        "#id": "postID"
    },
    ExpressionAttributeValues: {
      ":v" : {
        S: postID
      }
    },
  };

  // query the database
  db.query(params, function (err, data) {
    if (err || data.Items.length === 0) {
      callback(err, null);
    } else {
      callback(err, data.Items);
    }
  });
};


var add_comment_revised = function (commentUUID, postUUID, commentText, username, timestamp, isAnonymous, callback) { //used to add a comment to posts db, should always be used with add_comment_inverted
  var params = {
    TableName: "comments",
    Item: {
        'commentID' : {
          S: commentUUID
        },
        'postID' : {
          S: postUUID
        },
        'commentText' : {
          S: commentText
        },
        'username' : {
          S: username
        },
        'timestamp' : {
          S: timestamp
        },
        'isAnonymous' : {
          BOOL: isAnonymous
        }
      },
    };

    db.putItem(params, function (err, data) {
      if (err) {
        callback(err, null);
      } else {
        callback(err, data);
      }
    });
};

var delete_comment_revised = function (commentUUID, postUUID, callback) { //used to add a comment to posts db, should always be used with add_comment_inverted
    var params = {
      TableName: "comments",
      Key: {
          'commentID' : {
            S: commentUUID
          },
          'postID' : {
            S: postUUID
          }
        },
      };
  
      db.deleteItem(params, function (err, data) {
        if (err) {
          callback(err, null);
        } else {
          callback(err, data);
        }
      });
};

var check_user_exists = function (username, callback) { //check if a user eixsts for wall username display purposes
  var params = {
    TableName: "users",
    Key: {
        'username' : {
          S: username
        }
      },
    };

    db.getItem(params, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        if (Object.keys(data).length === 0) {
          callback(err, false);
        } else {
          callback(err, true);
        }
      }
    });
};

var news_search = function(input, callback, ExclusiveStartKey) {
  console.log("Searching for " + input);
  var params = {
    KeyConditionExpression: "keyword = :i",
    ExpressionAttributeValues: {
      ":i" : {S: input}
    },
    TableName: "inverted_news"
  }

  db.query(params, function(err, data) {
    if (err) {
      console.log("issue")
      console.log(err);
      callback(err, null);
    } else {
      console.log("No database error");
      callback(err, data)
    }
  })
}

var get_article = function(input, callback) {
  console.log("getting article " + input);
  var params = {
    Key: {
      "id" : {N: input}
    },
    TableName: "news_articles"
  }

  db.getItem(params, function(err, data) {
    if (err || !data) {
      console.log("Problem!")
      callback(err, null);
    } else {
      console.log("Got article");
      callback(err, data);
    }
  })
}

var get_newsfeed = function(username, callback) {
  console.log("getting newsfeed for " + username);
  var params = {
    KeyConditionExpression: "username = :u",
    ExpressionAttributeValues: {
      ":u" : {S: username}
    },
    TableName: "users"
  }

  db.query(params, function(err, data) {
    if (err || !data) {
      console.log(err);
      console.log("issue")
      callback(err, null);
    } else {
      console.log("get newsfeed works")
      callback(err, data);
    }
  })
}

var unlike_article = function(article, username, callback) {
  var params = {
    TableName: "users",
    Key: {
      "username": {"S": username}
    },
    AttributeUpdates: {
      "likes": {
        Action: "DELETE",
        Value: {"SS": [article]}
      }
    }
  };
  
  db.updateItem(params, function (err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data);
    }
  })
}

var like_article = function(article, username, callback) {
  var params = {
    TableName: "users",
    Key: {
      "username": {"S": username}
    },
    AttributeUpdates: {
      "likes": {
        Action: "ADD",
        Value: {"SS": [article]}
      }
    }
  };
  
  db.updateItem(params, function (err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data);
    }
  })
}

var get_weights = function(user, callback) {
  var params = {
    KeyConditionExpression: "username = :u",
    ExpressionAttributeValues: {
      ":u" : {S: user}
    },
    TableName: "userArticleWeights"
  }

  db.query(params, function(err, data) {
    if (err || !data) {
      console.log(err);
      callback(err, null)
    } else {
      console.log(data)
      callback(err, data);
    }
  })
}

var get_wall_visibility = function (username, callback) { //used to get the current status of a person's wallvisbility
  var params = {
    TableName: "users",
    Key: {
        'username' : {
          S: username
        }
      },
    ProjectionExpression: "wallVisibility"
    };

    db.getItem(params, function (err, data) {
      if (err) {
        console.log(err);
      } else if (data === null || data.length === 0) {
        console.log("data was null or empty in get wall visibility"); 
        callback(err, null);
      } else {
        callback(err, data.Item);
      }
    });
};

// add a post to the groups table
var add_group_post = function (uuid, wallUsername, isStatusUpdate, postText, timestamp, creator, callback) { //add post to posts db, should always be used in conjunction with the next add post inverted
  // secondary key is creator - this 
  var params = {
    TableName: "posts_groups",
    Item: {
      postID: {S: uuid},
      wallUsername: { S: wallUsername },
      isStatusUpdate: { BOOL: isStatusUpdate },
      postText: { S: postText },
      timestamp: { S: timestamp },
      creator: { S: creator }
    },
  };

  db.putItem(params, function (err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data);
    }
  });
};

var group_post_lookup = function (groupname, callback) { //used to query the posts_new table using GSI (Global Secondary Index) to get all POSTS with wallUsername equal to username
  var params = {
    TableName: "posts_groups",
    IndexName: "wallUsername-index",
    KeyConditionExpression  : "#group = :username",
    ExpressionAttributeNames: {
        "#group": "wallUsername"
    },
    ExpressionAttributeValues: {
      ":username" : {
        S: groupname
      }
    },
  };

  // query the database
  db.query(params, function (err, data) {
    if (err || data.Items.length === 0) {
      callback(err, null);
    } else {
      callback(err, data.Items);
    }
  });
};

var get_group_post_by_id = function (id, callback) { //takes in a singular post ID and queries the posts table to get the corresponding post data - could also query posts_new
  var params = {
    TableName: "posts_groups",
    KeyConditionExpression: 'postID = :id',
    ExpressionAttributeValues: {
      ':id' : {
        'S' : id
      }
    },
  };

  // query the database
  db.query(params, function (err, data) {
    if (err || data.Items.length === 0) {
      callback(err, null);
    } else {
      callback(err, data.Items[0]);
    }
  });
};

  // Remove post from posts_groups table
var delete_group_post = function(postID, wallUsername, callback) {
  var params = {
    TableName: "posts_groups",
    Key: {
      "postID" : {
        S: postID
      },
      "wallUsername" : {
        S: wallUsername
      }
    }
  };
  
  db.deleteItem(params, function (err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data);
    }
  });
};

/* We define an object with one field for each method. For instance, below we have
   a 'lookup' field, which is set to the myDB_lookup function. In routes.js, we can
   then invoke db.lookup(...), and that call will be routed to myDB_lookup(...). */

var database = {
  userLookup: user_lookup,
  userInitialize: user_Initialize,
  userAdd: user_add,
  deleteUser: delete_user,
  createAccount: create_account,
  updateUser: update_user,
  updateUserNew: update_user_new,
  checkPassword: check_password,
  updatePassword: update_password,
  getFriendsChat: get_friends_chat,
  getAffiliation: get_affiliation,
  getStatus: get_status,
  removeFriend: friend_remove,
  addFriend: friend_add,
  requestFriend: friend_request,
  rejectFriend: friend_reject,
  getChat: get_chat,
  getMessage: get_message,
  getSuggestions: get_suggestions,
  postLookup: post_lookup,
  postLookupInverted: post_lookup_inverted,
  postIDLookup: post_id_lookup,
  postIDLookupInverted: post_id_lookup_inverted,
  groupLookup: group_lookup,
  joinGroup: join_group,
  createGroup: create_group,
  getGroupSuggestions: get_group_suggestions,
  getGroups: get_groups,
  addPost: add_post,
  addPostInverted: add_post_inverted,
  addComment: add_comment,
  addCommentInverted: add_comment_inverted,
  getPostByID: get_post_by_id,
  getFriendsHomepage: get_friends_homepage,
  deletePost: delete_post,
  getFriends: get_friends,
  deletePostInverted: delete_post_inverted,
  deleteComment: delete_comment,
  deleteCommentInverted: delete_comment_inverted,
  commentLookup: comment_lookup,
  addCommentRevised: add_comment_revised,
  deleteCommentRevised: delete_comment_revised,
  checkUserExists: check_user_exists,
  newsSearch: news_search,
  getArticle: get_article,
  getNewsfeed: get_newsfeed,
  likeArticle: like_article,
  unlikeArticle: unlike_article,
  getWallVisibility: get_wall_visibility,
  getWeights: get_weights,
  getChatNames: get_chat_names,
  getChat: get_chat,
  getMessage: get_message,
  getChatInvites: get_chat_invites,
  getChatSentInvites: get_chat_sent_invites,
  inviteUserToChat: invite_user_to_chat,
  acceptChatInvite: accept_chat_invite,
  addToNewChat: add_to_new_chat,
  addToSameChat: add_to_same_chat,
  getStatus: get_status,
  addMessage: add_message,
  removeUserFromChat: remove_user_from_chat,
  setOnline: set_online,
  setOffline: set_offline,
  checkGroupExists: check_group_exists,
  addGroupPost: add_group_post,
  groupPostLookup: group_post_lookup,
  getGroupPostByID: get_group_post_by_id,
  deleteGroupPost: delete_group_post,
};

module.exports = database;