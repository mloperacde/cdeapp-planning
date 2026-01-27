import Layout from "../Layout";

import AbsenceManagement from "./AbsenceManagement";
import AbsenceTypeConfig from "./AbsenceTypeConfig";
import AdvancedHRDashboard from "./AdvancedHRDashboard";
import AppUserManagement from "./AppUserManagement";
import ArticleManagement from "./ArticleManagement";
import AttendanceManagement from "./AttendanceManagement";
import BrandingConfig from "./BrandingConfig";
import CommitteeManagement from "./CommitteeManagement";
import Configuration from "./Configuration";
import DailyPlanning from "./DailyPlanning";
import DailyProductionPlanningPage from "./DailyProductionPlanningPage";
import DailyShiftPlanning from "./DailyShiftPlanning";
import Dashboard from "./Dashboard";
import DocumentManagement from "./DocumentManagement";
import ETTTemporaryEmployees from "./ETTTemporaryEmployees";
import EmailNotifications from "../modules/notifications/EmailNotifications";
import EmployeeAbsenceInfo from "./EmployeeAbsenceInfo";
import EmployeeOnboarding from "./EmployeeOnboarding";
import EmployeesShiftManager from "./EmployeesShiftManager";
import IncentiveManagement from "./IncentiveManagement";
import LockerManagement from "./LockerManagement";
import MLInsights from "./MLInsights";
import MachineAssignments from "./MachineAssignments";
import MachineMaintenance from "./MachineMaintenance";
import MachineMaster from "./MachineMaster";
import MachineManagement from "./MachineManagement";
import MaintenanceTracking from "./MaintenanceTracking";
import MasterEmployeeDatabase from "./MasterEmployeeDatabase";
import PerformanceManagement from "./PerformanceManagement";
import ProcessConfiguration from "./ProcessConfiguration";
import NewProcessConfigurator from "./NewProcessConfigurator";
import ProductionDashboard from "./ProductionDashboard";
import ProductionPlanning from "./ProductionPlanning";
import QualityControl from "./QualityControl";
import Reports from "./Reports";
import ShiftHandover from "./ShiftHandover";
import ShiftManagers from "./ShiftManagers";
import ShiftPlanning from "./ShiftPlanning";
import ShiftAssignmentsPage from "./ShiftAssignmentsPage";
import SkillMatrix from "./SkillMatrix";
import SupportManagement1415 from "./SupportManagement1415";

import Timeline from "./Timeline";
import WorkCalendarConfig from "./WorkCalendarConfig";
import Breaks from "./Breaks";
import MachinePlanning from "./MachineDailyPlanning";

import RolesConfig from "./RolesConfig";
import MessagingConfiguration from "./MessagingConfiguration";
import RulesAndTemplates from "./RulesAndTemplates";
import OrganizationalStructure from "./OrganizationalStructure";
import MigrationDashboard from "../components/config/MigrationDashboard";
import DireccionSkills from "./DireccionSkills";
import PlanificacionSkills from "./PlanificacionSkills";
import FabricacionSkills from "./FabricacionSkills";
import MantenimientoSkills from "./MantenimientoSkills";
import AlmacenSkills from "./AlmacenSkills";
import CalidadSkills from "./CalidadSkills";

import { BrowserRouter, HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RateLimitMonitor from '../components/utils/RateLimitMonitor';
import { DataProvider } from '../components/data/DataProvider';
import { ThemeProvider } from '../components/common/ThemeProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min por defecto
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false, // Evitar refetches innecesarios
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

const PAGES = {
  Dashboard: Dashboard,
  AbsenceManagement: AbsenceManagement,
  AbsenceTypeConfig: AbsenceTypeConfig,
  AdvancedHRDashboard: AdvancedHRDashboard,
  ArticleManagement: ArticleManagement,
  AttendanceManagement: AttendanceManagement,
  BrandingConfig: BrandingConfig,
  CommitteeManagement: CommitteeManagement,
  Configuration: Configuration,
  DailyPlanning: DailyPlanning,
  DailyProductionPlanningPage: DailyProductionPlanningPage,
  DailyShiftPlanning: DailyShiftPlanning,
  DocumentManagement: DocumentManagement,
  ETTTemporaryEmployees: ETTTemporaryEmployees,
  EmailNotifications: EmailNotifications,
  EmployeeAbsenceInfo: EmployeeAbsenceInfo,
  EmployeeOnboarding: EmployeeOnboarding,
  EmployeesShiftManager: EmployeesShiftManager,
  IncentiveManagement: IncentiveManagement,
  LockerManagement: LockerManagement,
  MLInsights: MLInsights,
  MachineAssignments: MachineAssignments,
  MachineMaintenance: MachineMaintenance,
  MachineManagement: MachineManagement,
  MachineMaster: MachineMaster,
  MaintenanceTracking: MaintenanceTracking,
  MasterEmployeeDatabase: MasterEmployeeDatabase,
  PerformanceManagement: PerformanceManagement,
  ProcessConfiguration: ProcessConfiguration,
  ProductionDashboard: ProductionDashboard,
  ProductionPlanning: ProductionPlanning,
  QualityControl: QualityControl,
  Reports: Reports,
  RolesConfig: RolesConfig,
  ShiftHandover: ShiftHandover,
  ShiftManagers: ShiftManagers,
  ShiftPlanning: ShiftPlanning,
  ShiftAssignmentsPage: ShiftAssignmentsPage,
  SkillMatrix: SkillMatrix,
  SupportManagement1415: SupportManagement1415,

  Timeline: Timeline,
  WorkCalendarConfig: WorkCalendarConfig,
  Breaks: Breaks,
  MachinePlanning: MachinePlanning,

  DireccionSkills: DireccionSkills,
  PlanificacionSkills: PlanificacionSkills,
  FabricacionSkills: FabricacionSkills,
  MantenimientoSkills: MantenimientoSkills,
  AlmacenSkills: AlmacenSkills,
  CalidadSkills: CalidadSkills,
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    // CRITICAL FIX: Si está vacío o es la raíz, retorna Dashboard
    if (!urlLastPart || urlLastPart === '' || urlLastPart === 'index.html') {
        return 'Dashboard';
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    
    // CRITICAL: Solo retornar pageName si existe en PAGES
    if (pageName && PAGES[pageName]) {
        return pageName;
    }
    
    // Default to Dashboard for unknown routes
    return 'Dashboard';
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname) || 'Dashboard';
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>
                {/* CRITICAL: Root routes MUST be first */}
                <Route path="/" element={<Dashboard />} />
                <Route index element={<Dashboard />} />
                
                
                <Route path="/AbsenceManagement" element={<AbsenceManagement />} />
                <Route path="/EmailNotifications" element={<EmailNotifications />} />
                <Route path="/EmployeeAbsenceInfo" element={<EmployeeAbsenceInfo />} />
                

                

                
                <Route path="/AdvancedHRDashboard" element={<AdvancedHRDashboard />} />
                
                <Route path="/AppUserManagement" element={<AppUserManagement />} />
                
                <Route path="/ArticleManagement" element={<ArticleManagement />} />
                
                <Route path="/AttendanceManagement" element={<AttendanceManagement />} />
                <Route path="/BrandingConfig" element={<BrandingConfig />} />
                
                <Route path="/CommitteeManagement" element={<CommitteeManagement />} />

                <Route path="/Configuration" element={<Configuration />} />
                <Route path="/AbsenceTypeConfig" element={<AbsenceTypeConfig />} />
                <Route path="/AbsenceConfiguration" element={<AbsenceTypeConfig />} />
                <Route path="/AbsenceConfigurationTab" element={<AbsenceTypeConfig />} />
                <Route path="/DailyPlanning" element={<DailyPlanning />} />
                <Route path="/DailyProductionPlanningPage" element={<DailyProductionPlanningPage />} />
                <Route path="/DailyShiftPlanning" element={<DailyShiftPlanning />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                

                
                <Route path="/DocumentManagement" element={<DocumentManagement />} />
                
                <Route path="/ETTTemporaryEmployees" element={<EmployeeOnboarding />} />
                
                <Route path="/EmployeeOnboarding" element={<EmployeeOnboarding />} />
                

                
                <Route path="/EmployeesShiftManager" element={<EmployeesShiftManager />} />
                
                <Route path="/IncentiveManagement" element={<IncentiveManagement />} />
                

                
                <Route path="/LockerManagement" element={<LockerManagement />} />
                
                <Route path="/MLInsights" element={<MLInsights />} />
                
                <Route path="/MachineAssignments" element={<MachineAssignments />} />
                
                <Route path="/MachineMaintenance" element={<MachineMaintenance />} />
                
                <Route path="/MachineManagement" element={<MachineManagement />} />
                
                <Route path="/MachineMaster" element={<MachineMaster />} />
                
                <Route path="/MaintenanceTracking" element={<MaintenanceTracking />} />
                
                <Route path="/MasterEmployeeDatabase" element={<MasterEmployeeDatabase />} />
                

                
                <Route path="/PerformanceManagement" element={<PerformanceManagement />} />
                

                
                <Route path="/ProcessConfiguration" element={<ProcessConfiguration />} />
                <Route path="/NewProcessConfigurator/*" element={<NewProcessConfigurator />} />
                <Route path="/ProductionDashboard" element={<ProductionDashboard />} />
                <Route path="/ProductionPlanning" element={<ProductionPlanning />} />
                <Route path="/QualityControl" element={<QualityControl />} />
                <Route path="/Reports" element={<Reports />} />
                <Route path="/RolesConfig" element={<RolesConfig />} />
                
                <Route path="/ShiftHandover" element={<ShiftHandover />} />
                
                <Route path="/ShiftManagers" element={<ShiftManagers />} />
                
                <Route path="/ShiftPlanning" element={<ShiftPlanning />} />
                <Route path="/ShiftAssignmentsPage" element={<ShiftAssignmentsPage />} />
                
                <Route path="/SkillMatrix" element={<SkillMatrix />} />
                <Route path="/DireccionSkills" element={<DireccionSkills />} />
                <Route path="/PlanificacionSkills" element={<PlanificacionSkills />} />
                <Route path="/FabricacionSkills" element={<FabricacionSkills />} />
                <Route path="/MantenimientoSkills" element={<MantenimientoSkills />} />
                <Route path="/AlmacenSkills" element={<AlmacenSkills />} />
                <Route path="/CalidadSkills" element={<CalidadSkills />} />

                <Route path="/SupportManagement1415" element={<SupportManagement1415 />} />

                <Route path="/Timeline" element={<Timeline />} />
                
                <Route path="/WorkCalendarConfig" element={<WorkCalendarConfig />} />
                
                <Route path="/Breaks" element={<Breaks />} />
                <Route path="/MachinePlanning" element={<MachinePlanning />} />
                <Route path="/MessagingConfiguration" element={<MessagingConfiguration />} />
                <Route path="/RulesAndTemplates" element={<RulesAndTemplates />} />
                <Route path="/OrganizationalStructure" element={<OrganizationalStructure />} />
                <Route path="/MigrationDashboard" element={<MigrationDashboard />} />
                {/* Rutas faltantes - redirecciones */}
                <Route path="/Employees" element={<MasterEmployeeDatabase />} />
                <Route path="/AdvancedConfiguration" element={<Configuration />} />
                <Route path="*" element={<Dashboard />} />
                
                </Routes>
        </Layout>
    );
}

export default function Pages() {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    const RouterComponent = isLocal ? HashRouter : BrowserRouter;
    return (
        <QueryClientProvider client={queryClient}>
            <RateLimitMonitor />
            <ThemeProvider>
                <DataProvider>
                    <RouterComponent>
                        <PagesContent />
                    </RouterComponent>
                </DataProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
