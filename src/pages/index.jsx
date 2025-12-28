import Layout from "./Layout.jsx";

import AbsenceManagement from "./AbsenceManagement";

import AbsenceTypeConfig from "./AbsenceTypeConfig";

import AbsenceTypeInfo from "./AbsenceTypeInfo";

import AcceptInvitation from "./AcceptInvitation";

import AdminDeploymentGuide from "./AdminDeploymentGuide";

import AdvancedAbsenceConfig from "./AdvancedAbsenceConfig";

import AdvancedConfiguration from "./AdvancedConfiguration";

import AdvancedHRDashboard from "./AdvancedHRDashboard";

import AppUserManagement from "./AppUserManagement";

import ArticleManagement from "./ArticleManagement";

import AttendanceManagement from "./AttendanceManagement";

import BrandingConfig from "./BrandingConfig";

import Breaks from "./Breaks";

import CommitteeManagement from "./CommitteeManagement";

import Configuration from "./Configuration";

import DailyPlanning from "./DailyPlanning";

import DailyShiftPlanning from "./DailyShiftPlanning";

import Dashboard from "./Dashboard";

import DataImport from "./DataImport";

import DataMigration from "./DataMigration";

import DepartmentManagement from "./DepartmentManagement";

import DeploymentGuide from "./DeploymentGuide";

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

import MachineDailyPlanning from "./MachineDailyPlanning";

import MachineMaintenance from "./MachineMaintenance";

import MachineManagement from "./MachineManagement";

import MachineMaster from "./MachineMaster";

import MaintenanceTracking from "./MaintenanceTracking";

import MasterEmployeeDatabase from "./MasterEmployeeDatabase";

import Messaging from "./Messaging";

import MessagingConfig from "./MessagingConfig";

import Mobile from "./Mobile";

import MobileAbsences from "./MobileAbsences";

import MobileAppConfig from "./MobileAppConfig";

import MobileChat from "./MobileChat";

import MobileHome from "./MobileHome";

import MobileNotifications from "./MobileNotifications";

import MobilePlanning from "./MobilePlanning";

import MobileProfile from "./MobileProfile";

import MobileVacations from "./MobileVacations";

import MyProfile from "./MyProfile";

import NotificationCenter from "./NotificationCenter";

import NotificationSettings from "./NotificationSettings";

import Notifications from "./Notifications";

import PerformanceManagement from "./PerformanceManagement";

import PredictiveMaintenance from "./PredictiveMaintenance";

import ProcessConfiguration from "./ProcessConfiguration";

import ProductionDashboard from "./ProductionDashboard";

import ProductionPlanning from "./ProductionPlanning";

import QualityControl from "./QualityControl";

import QuickStartGuide from "./QuickStartGuide";

import Reports from "./Reports";

import ShiftAbsenceReport from "./ShiftAbsenceReport";

import ShiftAssignments from "./ShiftAssignments";

import ShiftHandover from "./ShiftHandover";

import ShiftManagement from "./ShiftManagement";

import ShiftManagers from "./ShiftManagers";

import ShiftPlanning from "./ShiftPlanning";

import SkillMatrix from "./SkillMatrix";

import SupportManagement1415 from "./SupportManagement1415";

import SystemAudit from "./SystemAudit";

import SystemHealth from "./SystemHealth";

import SystemReset from "./SystemReset";

import TeamConfiguration from "./TeamConfiguration";

import Timeline from "./Timeline";

import UserInvitations from "./UserInvitations";

import UserManual from "./UserManual";

import WorkCalendarConfig from "./WorkCalendarConfig";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    AbsenceManagement: AbsenceManagement,
    
    AbsenceTypeConfig: AbsenceTypeConfig,
    
    AbsenceTypeInfo: AbsenceTypeInfo,
    
    AcceptInvitation: AcceptInvitation,
    
    AdminDeploymentGuide: AdminDeploymentGuide,
    
    AdvancedAbsenceConfig: AdvancedAbsenceConfig,
    
    AdvancedConfiguration: AdvancedConfiguration,
    
    AdvancedHRDashboard: AdvancedHRDashboard,
    
    AppUserManagement: AppUserManagement,
    
    ArticleManagement: ArticleManagement,
    
    AttendanceManagement: AttendanceManagement,
    
    BrandingConfig: BrandingConfig,
    
    Breaks: Breaks,
    
    CommitteeManagement: CommitteeManagement,
    
    Configuration: Configuration,
    
    DailyPlanning: DailyPlanning,
    
    DailyShiftPlanning: DailyShiftPlanning,
    
    Dashboard: Dashboard,
    
    DataImport: DataImport,
    
    DataMigration: DataMigration,
    
    DepartmentManagement: DepartmentManagement,
    
    DeploymentGuide: DeploymentGuide,
    
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
    
    MachineDailyPlanning: MachineDailyPlanning,
    
    MachineMaintenance: MachineMaintenance,
    
    MachineManagement: MachineManagement,
    
    MachineMaster: MachineMaster,
    
    MaintenanceTracking: MaintenanceTracking,
    
    MasterEmployeeDatabase: MasterEmployeeDatabase,
    
    Messaging: Messaging,
    
    MessagingConfig: MessagingConfig,
    
    Mobile: Mobile,
    
    MobileAbsences: MobileAbsences,
    
    MobileAppConfig: MobileAppConfig,
    
    MobileChat: MobileChat,
    
    MobileHome: MobileHome,
    
    MobileNotifications: MobileNotifications,
    
    MobilePlanning: MobilePlanning,
    
    MobileProfile: MobileProfile,
    
    MobileVacations: MobileVacations,
    
    MyProfile: MyProfile,
    
    NotificationCenter: NotificationCenter,
    
    NotificationSettings: NotificationSettings,
    
    Notifications: Notifications,
    
    PerformanceManagement: PerformanceManagement,
    
    PredictiveMaintenance: PredictiveMaintenance,
    
    ProcessConfiguration: ProcessConfiguration,
    
    ProductionDashboard: ProductionDashboard,
    
    ProductionPlanning: ProductionPlanning,
    
    QualityControl: QualityControl,
    
    QuickStartGuide: QuickStartGuide,
    
    Reports: Reports,
    
    ShiftAbsenceReport: ShiftAbsenceReport,
    
    ShiftAssignments: ShiftAssignments,
    
    ShiftHandover: ShiftHandover,
    
    ShiftManagement: ShiftManagement,
    
    ShiftManagers: ShiftManagers,
    
    ShiftPlanning: ShiftPlanning,
    
    SkillMatrix: SkillMatrix,
    
    SupportManagement1415: SupportManagement1415,
    
    SystemAudit: SystemAudit,
    
    SystemHealth: SystemHealth,
    
    SystemReset: SystemReset,
    
    TeamConfiguration: TeamConfiguration,
    
    Timeline: Timeline,
    
    UserInvitations: UserInvitations,
    
    UserManual: UserManual,
    
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
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<AbsenceManagement />} />
                
                
                <Route path="/AbsenceManagement" element={<AbsenceManagement />} />
                
                <Route path="/AbsenceTypeConfig" element={<AbsenceTypeConfig />} />
                
                <Route path="/AbsenceTypeInfo" element={<AbsenceTypeInfo />} />
                
                <Route path="/AcceptInvitation" element={<AcceptInvitation />} />
                
                <Route path="/AdminDeploymentGuide" element={<AdminDeploymentGuide />} />
                
                <Route path="/AdvancedAbsenceConfig" element={<AdvancedAbsenceConfig />} />
                
                <Route path="/AdvancedConfiguration" element={<AdvancedConfiguration />} />
                
                <Route path="/AdvancedHRDashboard" element={<AdvancedHRDashboard />} />
                
                <Route path="/AppUserManagement" element={<AppUserManagement />} />
                
                <Route path="/ArticleManagement" element={<ArticleManagement />} />
                
                <Route path="/AttendanceManagement" element={<AttendanceManagement />} />
                
                <Route path="/BrandingConfig" element={<BrandingConfig />} />
                
                <Route path="/Breaks" element={<Breaks />} />
                
                <Route path="/CommitteeManagement" element={<CommitteeManagement />} />
                
                <Route path="/Configuration" element={<Configuration />} />
                
                <Route path="/DailyPlanning" element={<DailyPlanning />} />
                
                <Route path="/DailyShiftPlanning" element={<DailyShiftPlanning />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/DataImport" element={<DataImport />} />
                
                <Route path="/DataMigration" element={<DataMigration />} />
                
                <Route path="/DepartmentManagement" element={<DepartmentManagement />} />
                
                <Route path="/DeploymentGuide" element={<DeploymentGuide />} />
                
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
                
                <Route path="/MachineDailyPlanning" element={<MachineDailyPlanning />} />
                
                <Route path="/MachineMaintenance" element={<MachineMaintenance />} />
                
                <Route path="/MachineManagement" element={<MachineManagement />} />
                
                <Route path="/MachineMaster" element={<MachineMaster />} />
                
                <Route path="/MaintenanceTracking" element={<MaintenanceTracking />} />
                
                <Route path="/MasterEmployeeDatabase" element={<MasterEmployeeDatabase />} />
                
                <Route path="/Messaging" element={<Messaging />} />
                
                <Route path="/MessagingConfig" element={<MessagingConfig />} />
                
                <Route path="/Mobile" element={<Mobile />} />
                
                <Route path="/MobileAbsences" element={<MobileAbsences />} />
                
                <Route path="/MobileAppConfig" element={<MobileAppConfig />} />
                
                <Route path="/MobileChat" element={<MobileChat />} />
                
                <Route path="/MobileHome" element={<MobileHome />} />
                
                <Route path="/MobileNotifications" element={<MobileNotifications />} />
                
                <Route path="/MobilePlanning" element={<MobilePlanning />} />
                
                <Route path="/MobileProfile" element={<MobileProfile />} />
                
                <Route path="/MobileVacations" element={<MobileVacations />} />
                
                <Route path="/MyProfile" element={<MyProfile />} />
                
                <Route path="/NotificationCenter" element={<NotificationCenter />} />
                
                <Route path="/NotificationSettings" element={<NotificationSettings />} />
                
                <Route path="/Notifications" element={<Notifications />} />
                
                <Route path="/PerformanceManagement" element={<PerformanceManagement />} />
                
                <Route path="/PredictiveMaintenance" element={<PredictiveMaintenance />} />
                
                <Route path="/ProcessConfiguration" element={<ProcessConfiguration />} />
                
                <Route path="/ProductionDashboard" element={<ProductionDashboard />} />
                
                <Route path="/ProductionPlanning" element={<ProductionPlanning />} />
                
                <Route path="/QualityControl" element={<QualityControl />} />
                
                <Route path="/QuickStartGuide" element={<QuickStartGuide />} />
                
                <Route path="/Reports" element={<Reports />} />
                
                <Route path="/ShiftAbsenceReport" element={<ShiftAbsenceReport />} />
                
                <Route path="/ShiftAssignments" element={<ShiftAssignments />} />
                
                <Route path="/ShiftHandover" element={<ShiftHandover />} />
                
                <Route path="/ShiftManagement" element={<ShiftManagement />} />
                
                <Route path="/ShiftManagers" element={<ShiftManagers />} />
                
                <Route path="/ShiftPlanning" element={<ShiftPlanning />} />
                
                <Route path="/SkillMatrix" element={<SkillMatrix />} />
                
                <Route path="/SupportManagement1415" element={<SupportManagement1415 />} />
                
                <Route path="/SystemAudit" element={<SystemAudit />} />
                
                <Route path="/SystemHealth" element={<SystemHealth />} />
                
                <Route path="/SystemReset" element={<SystemReset />} />
                
                <Route path="/TeamConfiguration" element={<TeamConfiguration />} />
                
                <Route path="/Timeline" element={<Timeline />} />
                
                <Route path="/UserInvitations" element={<UserInvitations />} />
                
                <Route path="/UserManual" element={<UserManual />} />
                
                <Route path="/WorkCalendarConfig" element={<WorkCalendarConfig />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}