/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AbsenceManagement from './pages/AbsenceManagement';
import AbsenceTypeConfig from './pages/AbsenceTypeConfig';
import AdvancedHRDashboard from './pages/AdvancedHRDashboard';
import AlmacenSkills from './pages/AlmacenSkills';
import AppUserManagement from './pages/AppUserManagement';
import ArticleManagement from './pages/ArticleManagement';
import AttendanceManagement from './pages/AttendanceManagement';
import BrandingConfig from './pages/BrandingConfig';
import Breaks from './pages/Breaks';
import CalidadSkills from './pages/CalidadSkills';
import CommitteeManagement from './pages/CommitteeManagement';
import Configuration from './pages/Configuration';
import DailyProductionPlanningPage from './pages/DailyProductionPlanningPage';
import DailyShiftPlanning from './pages/DailyShiftPlanning';
import Dashboard from './pages/Dashboard';
import DireccionSkills from './pages/DireccionSkills';
import DocumentManagement from './pages/DocumentManagement';
import ETTTemporaryEmployees from './pages/ETTTemporaryEmployees';
import EmployeeAbsenceInfo from './pages/EmployeeAbsenceInfo';
import EmployeeOnboarding from './pages/EmployeeOnboarding';
import EmployeesShiftManager from './pages/EmployeesShiftManager';
import FabricacionSkills from './pages/FabricacionSkills';
import IncentiveManagement from './pages/IncentiveManagement';
import LockerManagement from './pages/LockerManagement';
import MLInsights from './pages/MLInsights';
import MachineAssignments from './pages/MachineAssignments';
import MachineDailyPlanning from './pages/MachineDailyPlanning';
import MachineMaintenance from './pages/MachineMaintenance';
import MachineManagement from './pages/MachineManagement';
import MachineMaster from './pages/MachineMaster';
import MaintenancePlanningPage from './pages/MaintenancePlanningPage';
import MaintenanceTracking from './pages/MaintenanceTracking';
import MantenimientoSkills from './pages/MantenimientoSkills';
import MasterEmployeeDatabase from './pages/MasterEmployeeDatabase';
import MessagingConfiguration from './pages/MessagingConfiguration';
import NewProcessConfigurator from './pages/NewProcessConfigurator';
import OrganizationalStructure from './pages/OrganizationalStructure';
import PerformanceManagement from './pages/PerformanceManagement';
import PlanificacionSkills from './pages/PlanificacionSkills';
import ProcessConfiguration from './pages/ProcessConfiguration';
import ProductionDashboard from './pages/ProductionDashboard';
import ProductionPlanning from './pages/ProductionPlanning';
import QualityControl from './pages/QualityControl';
import QualityPlanningPage from './pages/QualityPlanningPage';
import Reports from './pages/Reports';
import RulesAndTemplates from './pages/RulesAndTemplates';
import ShiftAssignmentsPage from './pages/ShiftAssignmentsPage';
import ShiftHandover from './pages/ShiftHandover';
import ShiftManagers from './pages/ShiftManagers';
import ShiftPlanning from './pages/ShiftPlanning';
import SkillMatrix from './pages/SkillMatrix';
import SupportManagement1415 from './pages/SupportManagement1415';
import Timeline from './pages/Timeline';
import WarehousePlanningPage from './pages/WarehousePlanningPage';
import WorkCalendarConfig from './pages/WorkCalendarConfig';
import index from './pages/index';
import DailyShiftPlanning from './pages/DailyShiftPlanning';
import ArticleManagement from './pages/ArticleManagement';
import OrderImport from './pages/OrderImport';
import SalaryManagement from './pages/SalaryManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AbsenceManagement": AbsenceManagement,
    "AbsenceTypeConfig": AbsenceTypeConfig,
    "AdvancedHRDashboard": AdvancedHRDashboard,
    "AlmacenSkills": AlmacenSkills,
    "AppUserManagement": AppUserManagement,
    "ArticleManagement": ArticleManagement,
    "AttendanceManagement": AttendanceManagement,
    "BrandingConfig": BrandingConfig,
    "Breaks": Breaks,
    "CalidadSkills": CalidadSkills,
    "CommitteeManagement": CommitteeManagement,
    "Configuration": Configuration,
    "DailyProductionPlanningPage": DailyProductionPlanningPage,
    "DailyShiftPlanning": DailyShiftPlanning,
    "Dashboard": Dashboard,
    "DireccionSkills": DireccionSkills,
    "DocumentManagement": DocumentManagement,
    "ETTTemporaryEmployees": ETTTemporaryEmployees,
    "EmployeeAbsenceInfo": EmployeeAbsenceInfo,
    "EmployeeOnboarding": EmployeeOnboarding,
    "EmployeesShiftManager": EmployeesShiftManager,
    "FabricacionSkills": FabricacionSkills,
    "IncentiveManagement": IncentiveManagement,
    "LockerManagement": LockerManagement,
    "MLInsights": MLInsights,
    "MachineAssignments": MachineAssignments,
    "MachineDailyPlanning": MachineDailyPlanning,
    "MachineMaintenance": MachineMaintenance,
    "MachineManagement": MachineManagement,
    "MachineMaster": MachineMaster,
    "MaintenancePlanningPage": MaintenancePlanningPage,
    "MaintenanceTracking": MaintenanceTracking,
    "MantenimientoSkills": MantenimientoSkills,
    "MasterEmployeeDatabase": MasterEmployeeDatabase,
    "MessagingConfiguration": MessagingConfiguration,
    "NewProcessConfigurator": NewProcessConfigurator,
    "OrganizationalStructure": OrganizationalStructure,
    "PerformanceManagement": PerformanceManagement,
    "PlanificacionSkills": PlanificacionSkills,
    "ProcessConfiguration": ProcessConfiguration,
    "ProductionDashboard": ProductionDashboard,
    "ProductionPlanning": ProductionPlanning,
    "QualityControl": QualityControl,
    "QualityPlanningPage": QualityPlanningPage,
    "Reports": Reports,
    "RulesAndTemplates": RulesAndTemplates,
    "ShiftAssignmentsPage": ShiftAssignmentsPage,
    "ShiftHandover": ShiftHandover,
    "ShiftManagers": ShiftManagers,
    "ShiftPlanning": ShiftPlanning,
    "SkillMatrix": SkillMatrix,
    "SupportManagement1415": SupportManagement1415,
    "Timeline": Timeline,
    "WarehousePlanningPage": WarehousePlanningPage,
    "WorkCalendarConfig": WorkCalendarConfig,
    "index": index,
    "DailyShiftPlanning": DailyShiftPlanning,
    "ArticleManagement": ArticleManagement,
    "OrderImport": OrderImport,
    "SalaryManagement": SalaryManagement,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};