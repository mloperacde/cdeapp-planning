import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Edit, Trash2, UserX, Search, AlertCircle, ArrowLeft, 
  BarChart3, Infinity, CalendarDays, FileText, CheckSquare, 
  LayoutDashboard, Settings, Activity 
} from "lucide-react";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';
import { debounce } from "lodash";

// Components
import AbsenceDashboard from "../components/employees/AbsenceDashboard";
import AbsenceNotifications from "../components/employees/AbsenceNotifications";
import UnifiedAbsenceManager from "../components/absences/UnifiedAbsenceManager";
import LongAbsenceAlert from "../components/absences/LongAbsenceAlert";
import AbsenceTypeManager from "../components/absences/AbsenceTypeManager";
import AbsenceCalendar from "../components/absences/AbsenceCalendar";
import AbsenceApprovalPanel from "../components/absences/AbsenceApprovalPanel";
import VacationPendingBalancePanel from "../components/absences/VacationPendingBalancePanel";
import ResidualDaysManager from "../components/absences/ResidualDaysManager";
import AdvancedReportGenerator from "../components/reports/AdvancedReportGenerator";
import AbsenceForm from "../components/absences/AbsenceForm";
import AttendanceAnalyzer from "../components/attendance/AttendanceAnalyzer";
import { calculateVacationPendingBalance, removeAbsenceFromBalance } from "../components/absences/VacationPendingCalculator";
import { notifyAbsenceRequestRealtime } from "../components/notifications/AdvancedNotificationService";

export default function AbsenceManagementPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const queryClient = useQueryClient();

  // Load User & Context
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isShiftManager = useMemo(() => {
    // Simplified check - real app would check specific permissions/roles
    return currentUser?.role !== 'admin' && 
           (currentUser?.puesto?.toLowerCase().includes('jefe') || currentUser?.puesto?.toLowerCase().includes('shift'));
  }, [currentUser]);

  // Handle tab state and URL sync
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    } else {
      setActiveTab(isShiftManager ? "dashboard" : "dashboard");
    }
  }, [location.search, isShiftManager]);

  // Update URL when tab changes
  const handleTabChange = (value) => {
    setActiveTab(value);
    const url = new URL(window.location);
    url.searchParams.set('tab', value);
    window.history.pushState({}, '', url);
  };

  // Load Data
  const { data: absences = [], isLoading } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio', 1000),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre', 1000),
  });

  const { data: masterEmployees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 1000),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.filter({ activo: true }, 'orden', 1000),
  });

  const { data: vacations = [] } = useQuery({
    queryKey: ['vacations'],
    queryFn: () => base44.entities.Vacation.list(),
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
  });

  // Derived Data
  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => { if (emp.departamento) depts.add(emp.departamento); });
    return Array.from(depts).sort();
  }, [employees]);

  // Mutations and Handlers removed as UnifiedAbsenceManager handles them now for the list tab.
  // We keep state for local dashboard if needed, but the main CRUD is in UnifiedAbsenceManager.
  // The showForm/editingAbsence state might still be used if we want a global "New Absence" button in the header.
  
  // Handlers for the header button (New Absence)
  // We can pass these to UnifiedAbsenceManager or use a ref, but simpler is to let UnifiedAbsenceManager handle its own form,
  // or if we want the header button to work, we might need to expose the form. 
  // For now, I'll rely on UnifiedAbsenceManager's internal button for the list view, 
  // and if the header button is clicked, we can redirect to the list tab or open a dialog here.
  // But wait, UnifiedAbsenceManager is only in "list" tab. 
  // If user clicks "New Absence" in header, we should probably switch to "list" tab and open form, OR open a form here.
  // Since I removed the manual table code, I should clean up the unused mutations if they are not used elsewhere.
  // But wait, I see "New Absence" button in the header (line 240). 
  // I should probably remove it or make it open a dialog that uses the shared create logic.
  // To avoid duplication, let's keep the header button but make it use the shared operations logic if possible, 
  // OR just rely on UnifiedAbsenceManager which has its own button.
  // I will hide the header button since UnifiedAbsenceManager has one.
  
  const handleClose = () => { setShowForm(false); setEditingAbsence(null); };
  // ... keeping necessary parts if any ...
  const getEmployeeName = (id) => {
    const emp = employees.find(e => e.id === id) || masterEmployees.find(e => e.id === id);
    return emp?.nombre || "Desconocido";
  };
  
  const debouncedSearchChange = useCallback(debounce((val) => setSearchTerm(val), 300), []);

  const filteredAbsences = useMemo(() => {
    return absences.filter(abs => {
      const emp = employees.find(e => e.id === abs.employee_id);
      if (isShiftManager && emp?.departamento !== currentUser?.departamento) return false; // Basic Shift Manager filter

      const matchesSearch = getEmployeeName(abs.employee_id).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTeam = selectedTeam === "all" || emp?.equipo === selectedTeam;
      const matchesDept = selectedDepartment === "all" || emp?.departamento === selectedDepartment;
      return matchesSearch && matchesTeam && matchesDept;
    });
  }, [absences, searchTerm, selectedTeam, selectedDepartment, employees, isShiftManager, currentUser]);

  const activeAbsences = filteredAbsences.filter(a => {
    const now = new Date();
    const start = new Date(a.fecha_inicio);
    const end = a.fecha_fin_desconocida ? now : new Date(a.fecha_fin);
    return now >= start && now <= end;
  });

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl(isShiftManager ? "ShiftManagers" : "Dashboard")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isShiftManager ? "Volver a Gestión de Turnos" : "Volver al Dashboard"}
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <UserX className="w-8 h-8 text-blue-600" />
              Gestión Integral de Ausencias
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {isShiftManager ? "Gestión de equipo y reportes de turno" : "Control centralizado de RRHH"}
            </p>
          </div>
          {/* Button moved to UnifiedAbsenceManager inside list tab */}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 mb-6 h-auto">
            <TabsTrigger value="dashboard" className="py-2"><LayoutDashboard className="w-4 h-4 mr-2"/> Dashboard</TabsTrigger>
            <TabsTrigger value="list" className="py-2"><FileText className="w-4 h-4 mr-2"/> Listado</TabsTrigger>
            
            {!isShiftManager && (
              <>
                <TabsTrigger value="approval" className="py-2"><CheckSquare className="w-4 h-4 mr-2"/> Aprobaciones</TabsTrigger>
                <TabsTrigger value="calendar" className="py-2"><CalendarDays className="w-4 h-4 mr-2"/> Calendario</TabsTrigger>
                <TabsTrigger value="analysis" className="py-2"><Activity className="w-4 h-4 mr-2"/> Análisis & IA</TabsTrigger>
                <TabsTrigger value="config" className="py-2"><Settings className="w-4 h-4 mr-2"/> Configuración</TabsTrigger>
                <TabsTrigger value="reports" className="py-2"><BarChart3 className="w-4 h-4 mr-2"/> Informes</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-red-700 font-medium">Activas Ahora</p>
                      <p className="text-2xl font-bold text-red-900">{activeAbsences.length}</p>
                    </div>
                    <UserX className="w-8 h-8 text-red-600"/>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-blue-700 font-medium">Total Registradas</p>
                      <p className="text-2xl font-bold text-blue-900">{filteredAbsences.length}</p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-600"/>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AbsenceDashboard absences={filteredAbsences} employees={employees} masterEmployees={masterEmployees} />
              <div className="space-y-6">
                <AbsenceNotifications absences={filteredAbsences} employees={employees} absenceTypes={absenceTypes} masterEmployees={masterEmployees} />
                <LongAbsenceAlert employees={employees} absences={filteredAbsences} masterEmployees={masterEmployees} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            <UnifiedAbsenceManager 
              sourceContext="absence_page" 
              initialAbsences={absences} 
              initialEmployees={employees}
              initialMasterEmployees={masterEmployees}
            />
          </TabsContent>

          <TabsContent value="approval">
            <AbsenceApprovalPanel 
              absences={absences} 
              employees={employees} 
              masterEmployees={masterEmployees}
              absenceTypes={absenceTypes} 
              currentUser={currentUser} 
            />
          </TabsContent>

          <TabsContent value="calendar">
            <AbsenceCalendar 
              absences={absences} 
              employees={employees} 
              masterEmployees={masterEmployees}
              absenceTypes={absenceTypes} 
            />
          </TabsContent>

          <TabsContent value="analysis">
            <AttendanceAnalyzer />
          </TabsContent>

          <TabsContent value="config">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader><CardTitle>Tipos de Ausencia</CardTitle></CardHeader>
                <CardContent><AbsenceTypeManager /></CardContent>
              </Card>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VacationPendingBalancePanel employees={employees} compact={true} />
                <ResidualDaysManager employees={employees} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <AdvancedReportGenerator />
          </TabsContent>
        </Tabs>

        {/* Form dialog managed by UnifiedAbsenceManager in list tab */}
      </div>
    </div>
  );
}