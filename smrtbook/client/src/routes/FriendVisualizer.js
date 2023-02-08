import { useCallback, useEffect, useState } from 'react';
import ReactFlow, { Controls, Background, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
 
var db = require("../database.js");

function FriendVisualizer() {
    // instantiate states
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [error, setError] = useState("");
    const [affiliation, setAffiliation] = useState("");
    const [users, setUsers] = useState([]);
    const [user, setUser] = useState('')
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)

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

    // change state handlers
    const onNodesChange = useCallback((changes) => setNodes(applyNodeChanges(changes, nodes)), [nodes]);
    const onEdgesChange = useCallback((changes) => setEdges(applyEdgeChanges(changes, edges)), [edges]);

    // initialization callback to get all nodes and edges from database
    const initialize = useCallback(() => {
        db.getFriends(user, function(err, data) {
            if (err) {
                setError("Error Getting Your Friends");
            } else if (!data.Items[0].friends) {
                setError("No Friends to Display");
            } else {
                const friends = data.Items[0].friends.SS;
                console.log(friends);
                setAffiliation(data.Items[0].affiliation.S);
 
                const initialNodes = [{
                    id: user,
                    data: {label: user},
                    position: {x: 300, y: 0},
                }];
                const initialEdges = [];
                let offset = 40
                friends.forEach(friend => {
                    initialNodes.push( {
                        id: friend,
                        data: { label: friend },
                        position: {x: 0 + offset, y: 150},
                    } );
                    initialEdges.push( {
                        id: user + "-" + friend,
                        source: user,
                        target: friend,
                        label: "Friends With"
                    })
                    offset += 200;
                })
                friends.push(user);
                setUsers(friends);
                setNodes(initialNodes);
                setEdges(initialEdges);
                setError("");
            }
        })
    }, [loading])
 
    // get the affiliated friends of friends on click
    const handleClick = (event, node) => {
        setError("");
        console.log(users);
        console.log(event);
        if (node.id === user) {
            // don't do anything if we click on the user node
        } else {
            db.getFriends(node.id, function(err, data) {
                if (err) {
                    setError("Error getting friend's friends.")
                } else if (data.Items.length === 0 || !data.Items[0].friends) {
                    setError("No Friends to Display")
                } else {
                    const friends = data.Items[0].friends.SS;
                    let offset = 40;
                    friends.forEach(friend => {
                        db.getAffiliation(friend, function(err, data) {
                            if (err) {
                                setError("Error getting affiliation");
                            } else if (data.Items.length == 0) {
                                setError("No affiliation defined");
                            } else {
                                if (data.Items[0].affiliation.S === affiliation) {
                                    console.log("Match found!");
                                    if (users.indexOf(friend) < 0) {
                                        setNodes((nodes) => {
                                            return [
                                              ...nodes,
                                              {
                                                id: friend,
                                                data: { label: friend },
                                                position: {x: offset, y: 300},
                                              }
                                            ];
                                          });
                                        setEdges((edges) => {

                                            return [
                                                ...edges,
                                                {
                                                    id: node.id + "-" + friend,
                                                    source: node.id,
                                                    target: friend,
                                                    label: "Affiliated With"
                                                }
                                            ];
                                        })
                                        setUsers((users) => {
                                            return [...users, friend];
                                        })
                                        offset += 200;
                                        setError("");
                                    }
                                }
                            }
                        })
                    })
                }
            })
        }
        
    }
 
    // call initialize once on render
    useEffect(() => {
 
        initialize();
 
    }, [initialize])
 
 
    // render html!
    return (
        <>
        {error && error.length > 0 && (
            <div className="alert alert-danger" id="error" role="alert">
            <div>{error}</div>
            </div>
        )}
        <div style={{ height: '100vh', width: '100%' }}>
        <ReactFlow nodes={nodes} edges={edges} onNodeClick={handleClick} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}>
            <Background />
            <Controls />
        </ReactFlow>
        </div>
        </>
    );
}
 
export default FriendVisualizer;