import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './pages/Dashboard';
import AdvancedHRDashboard from './pages/AdvancedHRDashboard';
import MasterEmployeeDatabase from './pages/MasterEmployeeDatabase';
import Timeline from './pages/Timeline';
import MachineManagement from './pages/MachineManagement';
import Configuration from './pages/Configuration';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="hr-dashboard" element={<AdvancedHRDashboard />} />
          <Route path="employees" element={<MasterEmployeeDatabase />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="machines" element={<MachineManagement />} />
          <Route path="settings" element={<Configuration />} />
          <Route path="absences" element={<div className="p-8"><h1>Gestión de Ausencias</h1></div>} />
          <Route path="production" element={<div className="p-8"><h1>Producción</h1></div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
