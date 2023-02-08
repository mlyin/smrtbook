import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Login from './routes/Login';
import Signup from './routes/Signup.js';
import Wall from './routes/Wall.js';
import FriendList from './routes/FriendList.js';
import {io} from 'socket.io-client';
import Chat from './routes/Chat.js';
import UserSearch from './routes/UserSearch.js';
import AccountSettings from './routes/AccountSettings.js';
import FriendVisualizer from './routes/FriendVisualizer';
import Home from './routes/Home.js';
import GroupSearch from './routes/GroupSearch';
import NewsSearch from './routes/NewsSearch';
import Newsfeed from './routes/Newsfeed';
import Group from './routes/Group'

const socket = io.connect("localhost:4000");

function App() {
  return (
      <div className="App">
        <Navbar socket={socket} />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/user/:username" element={<Wall/>} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/friends" element={<FriendList />} />
            <Route path="/chat" element={<Chat socket={socket} />} />
            <Route path="/settings" element={<AccountSettings />} />
            <Route path="/visualizer" element={<FriendVisualizer />} />
            <Route path='/search' element={<UserSearch />} />
            <Route path='/groupsearch' element={<GroupSearch />} />
            <Route path="/newssearch" element={< NewsSearch/>} />
            <Route path="/newsfeed" element={< Newsfeed />} />
            <Route path="/group/:group" element={<Group />} />
          </Routes>
        </BrowserRouter>
    </div>
  );
}

export default App;