import Layout from "../Layout";

import AbsenceManagement from "./AbsenceManagement";
import AbsenceConfigurationTab from "./AbsenceConfigurationTab";
import AdvancedConfiguration from "./AdvancedConfiguration";
import AdvancedHRDashboard from "./AdvancedHRDashboard";
import AppUserManagement from "./AppUserManagement";
import ArticleManagement from "./ArticleManagement";
import AttendanceManagement from "./AttendanceManagement";
import CommitteeManagement from "./CommitteeManagement";
import Configuration from "./Configuration";
import DailyPlanning from "./DailyPlanning";
import Dashboard from "./Dashboard";
import DocumentManagement from "./DocumentManagement";
import DeploymentGuide from "./DeploymentGuide";
import AdminDeploymentGuide from "./AdminDeploymentGuide";
import ETTTemporaryEmployees from "./ETTTemporaryEmployees";
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
import MobileHome from "./MobileHome";
import PerformanceManagement from "./PerformanceManagement";
import ProcessConfiguration from "./ProcessConfiguration";
import ProductionPlanning from "./ProductionPlanning";
import QuickStartGuide from "./QuickStartGuide";
import Reports from "./Reports";
import ShiftHandover from "./ShiftHandover";
import ShiftManagement from "./ShiftManagement";
import ShiftManagers from "./ShiftManagers";
import ShiftPlanning from "./ShiftPlanning";
import SkillMatrix from "./SkillMatrix";
import SupportManagement1415 from "./SupportManagement1415";
import SystemReset from "./SystemReset";
import Timeline from "./Timeline";
import WorkCalendarConfig from "./WorkCalendarConfig";
import Breaks from "./Breaks";
import MachinePlanning from "./MachineDailyPlanning";
import MobileAppConfig from "./mobileAppConfig";

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
  AbsenceConfigurationTab: AbsenceConfigurationTab,
  AdvancedConfiguration: AdvancedConfiguration,
  AdvancedHRDashboard: AdvancedHRDashboard,
  AppUserManagement: AppUserManagement,
  ArticleManagement: ArticleManagement,
  AttendanceManagement: AttendanceManagement,
  CommitteeManagement: CommitteeManagement,
  Configuration: Configuration,
  DailyPlanning: DailyPlanning,
  DocumentManagement: DocumentManagement,
  DeploymentGuide: DeploymentGuide,
  AdminDeploymentGuide: AdminDeploymentGuide,
  ETTTemporaryEmployees: ETTTemporaryEmployees,
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
  MobileHome: MobileHome,
  PerformanceManagement: PerformanceManagement,
  ProcessConfiguration: ProcessConfiguration,
  ProductionPlanning: ProductionPlanning,
  QuickStartGuide: QuickStartGuide,
  Reports: Reports,
  ShiftHandover: ShiftHandover,
  ShiftManagement: ShiftManagement,
  ShiftManagers: ShiftManagers,
  ShiftPlanning: ShiftPlanning,
  SkillMatrix: SkillMatrix,
  SupportManagement1415: SupportManagement1415,
  SystemReset: SystemReset,
  Timeline: Timeline,
  WorkCalendarConfig: WorkCalendarConfig,
  Breaks: Breaks,
  MachinePlanning: MachinePlanning,
  MobileAppConfig: MobileAppConfig,
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
                

                
                <Route path="/AdvancedConfiguration" element={<AdvancedConfiguration />} />
                
                <Route path="/AdvancedHRDashboard" element={<AdvancedHRDashboard />} />
                
                <Route path="/AppUserManagement" element={<AppUserManagement />} />
                
                <Route path="/ArticleManagement" element={<ArticleManagement />} />
                
                <Route path="/AttendanceManagement" element={<AttendanceManagement />} />
                
                <Route path="/CommitteeManagement" element={<CommitteeManagement />} />

                <Route path="/Configuration" element={<Configuration />} />
                <Route path="/AbsenceConfigurationTab" element={<AbsenceConfigurationTab />} />
                <Route path="/DailyPlanning" element={<DailyPlanning />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                

                
                <Route path="/DocumentManagement" element={<DocumentManagement />} />
                
                <Route path="/ETTTemporaryEmployees" element={<ETTTemporaryEmployees />} />
                
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
                
                <Route path="/ProductionPlanning" element={<ProductionPlanning />} />
                
                <Route path="/Reports" element={<Reports />} />
                

                
                <Route path="/ShiftHandover" element={<ShiftHandover />} />
                
                <Route path="/ShiftManagement" element={<ShiftManagement />} />
                
                <Route path="/ShiftManagers" element={<ShiftManagers />} />
                
                <Route path="/ShiftPlanning" element={<ShiftPlanning />} />
                
                <Route path="/SkillMatrix" element={<SkillMatrix />} />

                <Route path="/SupportManagement1415" element={<SupportManagement1415 />} />



                <Route path="/SystemReset" element={<SystemReset />} />
                

                
                <Route path="/Timeline" element={<Timeline />} />
                
                <Route path="/WorkCalendarConfig" element={<WorkCalendarConfig />} />
                
                <Route path="/Breaks" element={<Breaks />} />
                <Route path="/MachinePlanning" element={<MachinePlanning />} />
                <Route path="/QuickStartGuide" element={<QuickStartGuide />} />
                <Route path="/DeploymentGuide" element={<DeploymentGuide />} />
                <Route path="/AdminDeploymentGuide" element={<AdminDeploymentGuide />} />
                <Route path="/MobileHome" element={<MobileHome />} />
                <Route path="/MobileAppConfig" element={<MobileAppConfig />} />
                {/* Rutas faltantes - redirecciones */}
                <Route path="/Employees" element={<MasterEmployeeDatabase />} />
                <Route path="/BrandingConfig" element={<AdvancedConfiguration />} />

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
