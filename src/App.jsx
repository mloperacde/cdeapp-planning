import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './pages/Dashboard';
import AdvancedHRDashboard from './pages/AdvancedHRDashboard';
import MasterEmployeeDatabase from './pages/MasterEmployeeDatabase';
import MachineManagement from './pages/MachineManagement';
import Timeline from './pages/Timeline';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="hr-dashboard" element={<AdvancedHRDashboard />} />
          <Route path="employees" element={<MasterEmployeeDatabase />} />
          <Route path="machines" element={<MachineManagement />} />
          <Route path="timeline" element={<Timeline />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
