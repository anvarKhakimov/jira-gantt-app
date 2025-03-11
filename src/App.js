// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import GanttChartPage from './pages/GanttChartPage';
import './index.css'; 


const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GanttChartPage />} />
        <Route path="/gantt-chart" element={<GanttChartPage />} />
      </Routes>
    </Router>
  );
};

export default App;
