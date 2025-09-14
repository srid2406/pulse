import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import "./App.css";
import Layout from "./components/Layout";
import Home from "./components/Home";
import Chat from "./components/Chat";
import MeetNotes from "./components/MeetNotes";
import Whiteboard from "./components/Whiteboard";
import Tasks from "./components/Tasks";
import Docs from "./components/Docs";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import CustomCalendar from "./components/Calendar";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="chat" element={<Chat />} />
          <Route path="notes" element={<MeetNotes />} />
          <Route path="calendar" element={<CustomCalendar />} />
          <Route path="whiteboard" element={<Whiteboard />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="docs" element={<Docs />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
