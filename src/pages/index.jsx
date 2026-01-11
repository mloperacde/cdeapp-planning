import Layout from "../layout";

import AbsenceManagement from "./AbsenceManagement";

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

import ETTTemporaryEmployees from "./ETTTemporaryEmployees";

import EmployeeOnboarding from "./EmployeeOnboarding";

import EmployeesShiftManager from "./EmployeesShiftManager";

import IncentiveManagement from "./IncentiveManagement";

import LockerManagement from "./LockerManagement";

import MLInsights from "./MLInsights";

import MachineAssignments from "./MachineAssignments";

import MachineMaintenance from "./MachineMaintenance";

import MachineManagement from "./MachineManagement";

import MaintenanceTracking from "./MaintenanceTracking";

import MasterEmployeeDatabase from "./MasterEmployeeDatabase";



import PerformanceManagement from "./PerformanceManagement";



import ProcessConfiguration from "./ProcessConfiguration";

import ProductionPlanning from "./ProductionPlanning";

import Reports from "./Reports";

import ShiftHandover from "./ShiftHandover";

import ShiftManagement from "./ShiftManagement";

import ShiftManagers from "./ShiftManagers";

import SkillMatrix from "./SkillMatrix";

import SupportManagement1415 from "./SupportManagement1415";

import SystemReset from "./SystemReset";

import Timeline from "./Timeline";

import WorkCalendarConfig from "./WorkCalendarConfig";



import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RateLimitMonitor from '../components/utils/RateLimitMonitor';
import { DataProvider } from '../components/data/DataProvider';

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
    
    AdvancedConfiguration: AdvancedConfiguration,
    
    AdvancedHRDashboard: AdvancedHRDashboard,
    
    AppUserManagement: AppUserManagement,
    
    ArticleManagement: ArticleManagement,
    
    AttendanceManagement: AttendanceManagement,
    
    CommitteeManagement: CommitteeManagement,
    
    Configuration: Configuration,
    
    DailyPlanning: DailyPlanning,
    
    DocumentManagement: DocumentManagement,
    
    ETTTemporaryEmployees: ETTTemporaryEmployees,
    
    EmployeeOnboarding: EmployeeOnboarding,
    
    EmployeesShiftManager: EmployeesShiftManager,
    
    IncentiveManagement: IncentiveManagement,
    
    LockerManagement: LockerManagement,
    
    MLInsights: MLInsights,
    
    MachineAssignments: MachineAssignments,
    
    MachineMaintenance: MachineMaintenance,
    
    MachineManagement: MachineManagement,
    
    MaintenanceTracking: MaintenanceTracking,
    
    MasterEmployeeDatabase: MasterEmployeeDatabase,
    

    
    PerformanceManagement: PerformanceManagement,
    

    
    ProcessConfiguration: ProcessConfiguration,
    
    ProductionPlanning: ProductionPlanning,
    
    Reports: Reports,
    
    ShiftHandover: ShiftHandover,
    
    ShiftManagement: ShiftManagement,
    
    ShiftManagers: ShiftManagers,
    
    SkillMatrix: SkillMatrix,
    
    SupportManagement1415: SupportManagement1415,
    
    SystemReset: SystemReset,
    
    Timeline: Timeline,
    
    WorkCalendarConfig: WorkCalendarConfig,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    // Si está vacío o es la raíz, retorna Dashboard
    if (!urlLastPart || urlLastPart === '') {
        return 'Dashboard';
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || 'Dashboard'; // Default to Dashboard if not found
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname) || 'Dashboard';
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                    <Route path="" element={<Dashboard />} />
                
                
                <Route path="/AbsenceManagement" element={<AbsenceManagement />} />
                

                
                <Route path="/AdvancedConfiguration" element={<AdvancedConfiguration />} />
                
                <Route path="/AdvancedHRDashboard" element={<AdvancedHRDashboard />} />
                
                <Route path="/AppUserManagement" element={<AppUserManagement />} />
                
                <Route path="/ArticleManagement" element={<ArticleManagement />} />
                
                <Route path="/AttendanceManagement" element={<AttendanceManagement />} />
                
                <Route path="/CommitteeManagement" element={<CommitteeManagement />} />

                <Route path="/Configuration" element={<Configuration />} />

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
                
                <Route path="/MaintenanceTracking" element={<MaintenanceTracking />} />
                
                <Route path="/MasterEmployeeDatabase" element={<MasterEmployeeDatabase />} />
                

                
                <Route path="/PerformanceManagement" element={<PerformanceManagement />} />
                

                
                <Route path="/ProcessConfiguration" element={<ProcessConfiguration />} />
                
                <Route path="/ProductionPlanning" element={<ProductionPlanning />} />
                
                <Route path="/Reports" element={<Reports />} />
                

                
                <Route path="/ShiftHandover" element={<ShiftHandover />} />
                
                <Route path="/ShiftManagement" element={<ShiftManagement />} />
                
                <Route path="/ShiftManagers" element={<ShiftManagers />} />
                
                <Route path="/SkillMatrix" element={<SkillMatrix />} />

                <Route path="/SupportManagement1415" element={<SupportManagement1415 />} />



                <Route path="/SystemReset" element={<SystemReset />} />
                

                
                <Route path="/Timeline" element={<Timeline />} />
                
                <Route path="/WorkCalendarConfig" element={<WorkCalendarConfig />} />
                


                </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <QueryClientProvider client={queryClient}>
            <RateLimitMonitor />
            <DataProvider>
                <Router>
                    <PagesContent />
                </Router>
            </DataProvider>
        </QueryClientProvider>
    );
}