import Layout from "./Layout.jsx";

import AbsenceManagement from "./AbsenceManagement";

import AbsenceTypeConfig from "./AbsenceTypeConfig";

import AbsenceTypeInfo from "./AbsenceTypeInfo";

import AdvancedAbsenceConfig from "./AdvancedAbsenceConfig";

import AdvancedConfiguration from "./AdvancedConfiguration";

import AdvancedHRDashboard from "./AdvancedHRDashboard";

import AppUserManagement from "./AppUserManagement";

import ArticleManagement from "./ArticleManagement";

import AttendanceManagement from "./AttendanceManagement";

import Breaks from "./Breaks";

import CommitteeManagement from "./CommitteeManagement";

import Configuration from "./Configuration";

import DailyPlanning from "./DailyPlanning";

import DailyShiftPlanning from "./DailyShiftPlanning";

import Dashboard from "./Dashboard";

import DataImport from "./DataImport";

import DepartmentManagement from "./DepartmentManagement";

import DirectDataEntry from "./DirectDataEntry";

import DocumentManagement from "./DocumentManagement";

import ETTTemporaryEmployees from "./ETTTemporaryEmployees";

import EmailNotifications from "./EmailNotifications";

import EmployeeAbsenceInfo from "./EmployeeAbsenceInfo";

import EmployeeAbsences from "./EmployeeAbsences";

import EmployeeChat from "./EmployeeChat";

import EmployeeDataCompletion from "./EmployeeDataCompletion";

import EmployeeDataCorrection from "./EmployeeDataCorrection";

import EmployeeOnboarding from "./EmployeeOnboarding";

import EmployeeVacations from "./EmployeeVacations";

import EmployeesShiftManager from "./EmployeesShiftManager";

import IncentiveManagement from "./IncentiveManagement";

import LockerDataCleanup from "./LockerDataCleanup";

import LockerDuplicateCleanup from "./LockerDuplicateCleanup";

import LockerManagement from "./LockerManagement";

import MLInsights from "./MLInsights";

import MachineAssignments from "./MachineAssignments";

import MachineMaintenance from "./MachineMaintenance";

import MachineManagement from "./MachineManagement";

import MaintenanceTracking from "./MaintenanceTracking";

import MasterEmployeeDatabase from "./MasterEmployeeDatabase";

import Messaging from "./Messaging";

import MessagingConfig from "./MessagingConfig";

import MobileAbsences from "./MobileAbsences";

import MobileAppConfig from "./MobileAppConfig";

import MobileChat from "./MobileChat";

import MobileNotifications from "./MobileNotifications";

import MobilePlanning from "./MobilePlanning";

import MobileProfile from "./MobileProfile";

import MobileVacations from "./MobileVacations";

import MyProfile from "./MyProfile";

import NotificationCenter from "./NotificationCenter";

import Notifications from "./Notifications";

import PerformanceManagement from "./PerformanceManagement";

import PredictiveMaintenance from "./PredictiveMaintenance";

import ProcessConfiguration from "./ProcessConfiguration";

import ProductionPlanning from "./ProductionPlanning";

import Reports from "./Reports";

import ShiftAbsenceReport from "./ShiftAbsenceReport";

import ShiftAssignments from "./ShiftAssignments";

import ShiftHandover from "./ShiftHandover";

import ShiftManagement from "./ShiftManagement";

import ShiftManagers from "./ShiftManagers";

import SkillMatrix from "./SkillMatrix";

import SupportManagement1415 from "./SupportManagement1415";

import SystemAudit from "./SystemAudit";

import SystemReset from "./SystemReset";

import TeamConfiguration from "./TeamConfiguration";

import Timeline from "./Timeline";

import WorkCalendarConfig from "./WorkCalendarConfig";

import RoleMigrationGuide from "./RoleMigrationGuide";

import EmployeeDataAudit from "./EmployeeDataAudit";

import MachineProcessAudit from "./MachineProcessAudit";

import MachineConsolidationStatus from "./MachineConsolidationStatus";
import MachineDeduplication from "./MachineDeduplication";
import PlanningConsolidation from "./PlanningConsolidation";
import CleanOrphanedReferences from "./CleanOrphanedReferences";

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
          
          AbsenceManagement: AbsenceManagement,
          
          RoleMigrationGuide: RoleMigrationGuide,
          
          EmployeeDataAudit: EmployeeDataAudit,
          
          MachineProcessAudit: MachineProcessAudit,
          
          MachineConsolidationStatus: MachineConsolidationStatus,
          MachineDeduplication: MachineDeduplication,
          PlanningConsolidation: PlanningConsolidation,
          CleanOrphanedReferences: CleanOrphanedReferences,
    
    AbsenceTypeConfig: AbsenceTypeConfig,
    
    AbsenceTypeInfo: AbsenceTypeInfo,
    
    AdvancedAbsenceConfig: AdvancedAbsenceConfig,
    
    AdvancedConfiguration: AdvancedConfiguration,
    
    AdvancedHRDashboard: AdvancedHRDashboard,
    
    AppUserManagement: AppUserManagement,
    
    ArticleManagement: ArticleManagement,
    
    AttendanceManagement: AttendanceManagement,
    
    Breaks: Breaks,
    
    CommitteeManagement: CommitteeManagement,
    
    Configuration: Configuration,
    
    DailyPlanning: DailyPlanning,
    
    DailyShiftPlanning: DailyShiftPlanning,
    
    Dashboard: Dashboard,
    
    DataImport: DataImport,
    
    DepartmentManagement: DepartmentManagement,
    
    DirectDataEntry: DirectDataEntry,
    
    DocumentManagement: DocumentManagement,
    
    ETTTemporaryEmployees: ETTTemporaryEmployees,
    
    EmailNotifications: EmailNotifications,
    
    EmployeeAbsenceInfo: EmployeeAbsenceInfo,
    
    EmployeeAbsences: EmployeeAbsences,
    
    EmployeeChat: EmployeeChat,
    
    EmployeeDataCompletion: EmployeeDataCompletion,
    
    EmployeeDataCorrection: EmployeeDataCorrection,
    
    EmployeeOnboarding: EmployeeOnboarding,
    
    EmployeeVacations: EmployeeVacations,
    
    EmployeesShiftManager: EmployeesShiftManager,
    
    IncentiveManagement: IncentiveManagement,
    
    LockerDataCleanup: LockerDataCleanup,
    
    LockerDuplicateCleanup: LockerDuplicateCleanup,
    
    LockerManagement: LockerManagement,
    
    MLInsights: MLInsights,
    
    MachineAssignments: MachineAssignments,
    
    MachineMaintenance: MachineMaintenance,
    
    MachineManagement: MachineManagement,
    
    MaintenanceTracking: MaintenanceTracking,
    
    MasterEmployeeDatabase: MasterEmployeeDatabase,
    
    Messaging: Messaging,
    
    MessagingConfig: MessagingConfig,
    
    MobileAbsences: MobileAbsences,
    
    MobileAppConfig: MobileAppConfig,
    
    MobileChat: MobileChat,
    
    MobileNotifications: MobileNotifications,
    
    MobilePlanning: MobilePlanning,
    
    MobileProfile: MobileProfile,
    
    MobileVacations: MobileVacations,
    
    MyProfile: MyProfile,
    
    NotificationCenter: NotificationCenter,
    
    Notifications: Notifications,
    
    PerformanceManagement: PerformanceManagement,
    
    PredictiveMaintenance: PredictiveMaintenance,
    
    ProcessConfiguration: ProcessConfiguration,
    
    ProductionPlanning: ProductionPlanning,
    
    Reports: Reports,
    
    ShiftAbsenceReport: ShiftAbsenceReport,
    
    ShiftAssignments: ShiftAssignments,
    
    ShiftHandover: ShiftHandover,
    
    ShiftManagement: ShiftManagement,
    
    ShiftManagers: ShiftManagers,
    
    SkillMatrix: SkillMatrix,
    
    SupportManagement1415: SupportManagement1415,
    
    SystemAudit: SystemAudit,
    
    SystemReset: SystemReset,
    
    TeamConfiguration: TeamConfiguration,
    
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

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
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
                
                <Route path="/AbsenceTypeConfig" element={<AbsenceTypeConfig />} />
                
                <Route path="/AbsenceTypeInfo" element={<AbsenceTypeInfo />} />
                
                <Route path="/AdvancedAbsenceConfig" element={<AdvancedAbsenceConfig />} />
                
                <Route path="/AdvancedConfiguration" element={<AdvancedConfiguration />} />
                
                <Route path="/AdvancedHRDashboard" element={<AdvancedHRDashboard />} />
                
                <Route path="/AppUserManagement" element={<AppUserManagement />} />
                
                <Route path="/ArticleManagement" element={<ArticleManagement />} />
                
                <Route path="/AttendanceManagement" element={<AttendanceManagement />} />
                
                <Route path="/Breaks" element={<Breaks />} />
                
                <Route path="/CommitteeManagement" element={<CommitteeManagement />} />
                
                <Route path="/Configuration" element={<Configuration />} />
                
                <Route path="/DailyPlanning" element={<DailyPlanning />} />
                
                <Route path="/DailyShiftPlanning" element={<DailyShiftPlanning />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/DataImport" element={<DataImport />} />
                
                <Route path="/DepartmentManagement" element={<DepartmentManagement />} />
                
                <Route path="/DirectDataEntry" element={<DirectDataEntry />} />
                
                <Route path="/DocumentManagement" element={<DocumentManagement />} />
                
                <Route path="/ETTTemporaryEmployees" element={<ETTTemporaryEmployees />} />
                
                <Route path="/EmailNotifications" element={<EmailNotifications />} />
                
                <Route path="/EmployeeAbsenceInfo" element={<EmployeeAbsenceInfo />} />
                
                <Route path="/EmployeeAbsences" element={<EmployeeAbsences />} />
                
                <Route path="/EmployeeChat" element={<EmployeeChat />} />
                
                <Route path="/EmployeeDataCompletion" element={<EmployeeDataCompletion />} />
                
                <Route path="/EmployeeDataCorrection" element={<EmployeeDataCorrection />} />
                
                <Route path="/EmployeeOnboarding" element={<EmployeeOnboarding />} />
                
                <Route path="/EmployeeVacations" element={<EmployeeVacations />} />
                
                <Route path="/EmployeesShiftManager" element={<EmployeesShiftManager />} />
                
                <Route path="/IncentiveManagement" element={<IncentiveManagement />} />
                
                <Route path="/LockerDataCleanup" element={<LockerDataCleanup />} />
                
                <Route path="/LockerDuplicateCleanup" element={<LockerDuplicateCleanup />} />
                
                <Route path="/LockerManagement" element={<LockerManagement />} />
                
                <Route path="/MLInsights" element={<MLInsights />} />
                
                <Route path="/MachineAssignments" element={<MachineAssignments />} />
                
                <Route path="/MachineMaintenance" element={<MachineMaintenance />} />
                
                <Route path="/MachineManagement" element={<MachineManagement />} />
                
                <Route path="/MaintenanceTracking" element={<MaintenanceTracking />} />
                
                <Route path="/MasterEmployeeDatabase" element={<MasterEmployeeDatabase />} />
                
                <Route path="/Messaging" element={<Messaging />} />
                
                <Route path="/MessagingConfig" element={<MessagingConfig />} />
                
                <Route path="/MobileAbsences" element={<MobileAbsences />} />
                
                <Route path="/MobileAppConfig" element={<MobileAppConfig />} />
                
                <Route path="/MobileChat" element={<MobileChat />} />
                
                <Route path="/MobileNotifications" element={<MobileNotifications />} />
                
                <Route path="/MobilePlanning" element={<MobilePlanning />} />
                
                <Route path="/MobileProfile" element={<MobileProfile />} />
                
                <Route path="/MobileVacations" element={<MobileVacations />} />
                
                <Route path="/MyProfile" element={<MyProfile />} />
                
                <Route path="/NotificationCenter" element={<NotificationCenter />} />
                
                <Route path="/Notifications" element={<Notifications />} />
                
                <Route path="/PerformanceManagement" element={<PerformanceManagement />} />
                
                <Route path="/PredictiveMaintenance" element={<PredictiveMaintenance />} />
                
                <Route path="/ProcessConfiguration" element={<ProcessConfiguration />} />
                
                <Route path="/ProductionPlanning" element={<ProductionPlanning />} />
                
                <Route path="/Reports" element={<Reports />} />
                
                <Route path="/ShiftAbsenceReport" element={<ShiftAbsenceReport />} />
                
                <Route path="/ShiftAssignments" element={<ShiftAssignments />} />
                
                <Route path="/ShiftHandover" element={<ShiftHandover />} />
                
                <Route path="/ShiftManagement" element={<ShiftManagement />} />
                
                <Route path="/ShiftManagers" element={<ShiftManagers />} />
                
                <Route path="/SkillMatrix" element={<SkillMatrix />} />

                <Route path="/SupportManagement1415" element={<SupportManagement1415 />} />

                <Route path="/SystemAudit" element={<SystemAudit />} />

                <Route path="/RoleMigrationGuide" element={<RoleMigrationGuide />} />

                <Route path="/SystemReset" element={<SystemReset />} />
                
                <Route path="/TeamConfiguration" element={<TeamConfiguration />} />
                
                <Route path="/Timeline" element={<Timeline />} />
                
                <Route path="/WorkCalendarConfig" element={<WorkCalendarConfig />} />
                
                <Route path="/EmployeeDataAudit" element={<EmployeeDataAudit />} />
                
                <Route path="/MachineProcessAudit" element={<MachineProcessAudit />} />
                
                <Route path="/MachineConsolidationStatus" element={<MachineConsolidationStatus />} />

                <Route path="/MachineDeduplication" element={<MachineDeduplication />} />

                <Route path="/PlanningConsolidation" element={<PlanningConsolidation />} />

                <Route path="/CleanOrphanedReferences" element={<CleanOrphanedReferences />} />

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