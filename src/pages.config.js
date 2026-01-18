import AbsenceManagement from './pages/AbsenceManagement';
import AbsenceTypeConfig from './pages/AbsenceTypeConfig';
import AdvancedConfiguration from './pages/AdvancedConfiguration';
import AdvancedHRDashboard from './pages/AdvancedHRDashboard';
import ArticleManagement from './pages/production/ArticleManagement';
import AttendanceManagement from './pages/AttendanceManagement';
import BrandingConfig from './pages/BrandingConfig';
import Breaks from './pages/Breaks';
import CommitteeManagement from './pages/CommitteeManagement';
import Configuration from './pages/Configuration';
import DailyPlanning from './pages/planning/DailyPlanning';
import DailyShiftPlanning from './pages/DailyShiftPlanning';
import Dashboard from './pages/Dashboard';
import DocumentManagement from './pages/DocumentManagement';
import ETTTemporaryEmployees from './pages/ETTTemporaryEmployees';
import EmailNotifications from './modules/notifications/EmailNotifications';
import EmployeeAbsenceInfo from './pages/EmployeeAbsenceInfo';
import EmployeeOnboarding from './pages/EmployeeOnboarding';
import EmployeesShiftManager from './pages/EmployeesShiftManager';
import IncentiveManagement from './pages/IncentiveManagement';
import LockerManagement from './pages/LockerManagement';
import MLInsights from './pages/MLInsights';
import MachineAssignments from './pages/MachineAssignments';
import MachineDailyPlanning from './pages/MachineDailyPlanning';
import MachineMaintenance from './pages/MachineMaintenance';
import MachineManagement from './pages/MachineManagement';
import MachineMaster from './pages/MachineMaster';
import MaintenanceTracking from './pages/MaintenanceTracking';
import MasterEmployeeDatabase from './pages/MasterEmployeeDatabase';
import PerformanceManagement from './pages/PerformanceManagement';
import ProcessConfiguration from './pages/ProcessConfiguration';
import ProductionDashboard from './pages/ProductionDashboard';
import ProductionPlanning from './pages/ProductionPlanning';
import QualityControl from './pages/QualityControl';
import Reports from './pages/Reports';
import ShiftHandover from './pages/ShiftHandover';
import ShiftManagement from './pages/ShiftManagement';
import ShiftManagers from './pages/ShiftManagers';
import ShiftPlanning from './pages/ShiftPlanning';
import SkillMatrix from './pages/SkillMatrix';
import SupportManagement1415 from './pages/SupportManagement1415';
import Timeline from './pages/Timeline';
import WorkCalendarConfig from './pages/WorkCalendarConfig';
import index from './pages/index';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AbsenceManagement": AbsenceManagement,
    "AbsenceTypeConfig": AbsenceTypeConfig,
    "AdvancedConfiguration": AdvancedConfiguration,
    "AdvancedHRDashboard": AdvancedHRDashboard,
    "ArticleManagement": ArticleManagement,
    "AttendanceManagement": AttendanceManagement,
    "BrandingConfig": BrandingConfig,
    "Breaks": Breaks,
    "CommitteeManagement": CommitteeManagement,
    "Configuration": Configuration,
    "DailyPlanning": DailyPlanning,
    "DailyShiftPlanning": DailyShiftPlanning,
    "Dashboard": Dashboard,
    "DocumentManagement": DocumentManagement,
    "ETTTemporaryEmployees": ETTTemporaryEmployees,
    "EmailNotifications": EmailNotifications,
    "EmployeeAbsenceInfo": EmployeeAbsenceInfo,
    "EmployeeOnboarding": EmployeeOnboarding,
    "EmployeesShiftManager": EmployeesShiftManager,
    "IncentiveManagement": IncentiveManagement,
    "LockerManagement": LockerManagement,
    "MLInsights": MLInsights,
    "MachineAssignments": MachineAssignments,
    "MachineDailyPlanning": MachineDailyPlanning,
    "MachineMaintenance": MachineMaintenance,
    "MachineManagement": MachineManagement,
    "MachineMaster": MachineMaster,
    "MaintenanceTracking": MaintenanceTracking,
    "MasterEmployeeDatabase": MasterEmployeeDatabase,
    "PerformanceManagement": PerformanceManagement,
    "ProcessConfiguration": ProcessConfiguration,
    "ProductionDashboard": ProductionDashboard,
    "ProductionPlanning": ProductionPlanning,
    "QualityControl": QualityControl,
    "Reports": Reports,
    "ShiftHandover": ShiftHandover,
    "ShiftManagement": ShiftManagement,
    "ShiftManagers": ShiftManagers,
    "ShiftPlanning": ShiftPlanning,
    "SkillMatrix": SkillMatrix,
    "SupportManagement1415": SupportManagement1415,
    "Timeline": Timeline,
    "WorkCalendarConfig": WorkCalendarConfig,
    "index": index,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
