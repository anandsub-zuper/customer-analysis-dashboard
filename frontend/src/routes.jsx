import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Analysis from './pages/Analysis';
import Historical from './pages/Historical';
import Templates from './pages/Templates';
import Configuration from './pages/Configuration';
import NotFound from './pages/NotFound';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Landing Page - No Layout */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Main Application Routes - With Layout */}
      <Route path="/" element={<MainLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="analysis" element={<Analysis />} />
        <Route path="historical" element={<Historical />} />
        <Route path="templates" element={<Templates />} />
        <Route path="configuration" element={<Configuration />} />
      </Route>
      
      {/* 404 Page */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
