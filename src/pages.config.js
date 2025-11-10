import Timeline from './pages/Timeline';
import Employees from './pages/Employees';
import Machines from './pages/Machines';
import Breaks from './pages/Breaks';
import Configuration from './pages/Configuration';
import TeamConfiguration from './pages/TeamConfiguration';
import MachinePlanning from './pages/MachinePlanning';
import AbsenceManagement from './pages/AbsenceManagement';
import MachineAssignments from './pages/MachineAssignments';
import ProcessConfiguration from './pages/ProcessConfiguration';
import MaintenanceTracking from './pages/MaintenanceTracking';
import PerformanceManagement from './pages/PerformanceManagement';
import ShiftHandover from './pages/ShiftHandover';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Layout from './Layout.jsx';


export const PAGES = {
    "Timeline": Timeline,
    "Employees": Employees,
    "Machines": Machines,
    "Breaks": Breaks,
    "Configuration": Configuration,
    "TeamConfiguration": TeamConfiguration,
    "MachinePlanning": MachinePlanning,
    "AbsenceManagement": AbsenceManagement,
    "MachineAssignments": MachineAssignments,
    "ProcessConfiguration": ProcessConfiguration,
    "MaintenanceTracking": MaintenanceTracking,
    "PerformanceManagement": PerformanceManagement,
    "ShiftHandover": ShiftHandover,
    "Dashboard": Dashboard,
    "Reports": Reports,
    "Notifications": Notifications,
}

export const pagesConfig = {
    mainPage: "Timeline",
    Pages: PAGES,
    Layout: Layout,
};