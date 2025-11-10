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
import UserManagement from './pages/UserManagement';
import EmailNotifications from './pages/EmailNotifications';
import MobileAppConfig from './pages/MobileAppConfig';
import PredictiveMaintenance from './pages/PredictiveMaintenance';
import SupportManagement1415 from './pages/SupportManagement1415';
import ShiftManagement from './pages/ShiftManagement';
import MLInsights from './pages/MLInsights';
import DataImport from './pages/DataImport';
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
    "UserManagement": UserManagement,
    "EmailNotifications": EmailNotifications,
    "MobileAppConfig": MobileAppConfig,
    "PredictiveMaintenance": PredictiveMaintenance,
    "SupportManagement1415": SupportManagement1415,
    "ShiftManagement": ShiftManagement,
    "MLInsights": MLInsights,
    "DataImport": DataImport,
}

export const pagesConfig = {
    mainPage: "Timeline",
    Pages: PAGES,
    Layout: Layout,
};