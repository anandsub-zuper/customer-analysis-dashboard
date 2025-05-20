import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Analysis from './pages/Analysis';
import Historical from './pages/Historical';
import Templates from './pages/Templates';
import Configuration from './pages/Configuration';
import NotFound from './pages/NotFound';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="analysis" element={<Analysis />} />
        <Route path="historical" element={<Historical />} />
        <Route path="templates" element={<Templates />} />
        <Route path="configuration" element={<Configuration />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
