import { 
  Home, Users, Calendar, Wrench, Settings, FileText, Shield, 
  DollarSign, Cog, Package, Award, ClipboardCheck, Briefcase, Factory, Download
} from 'lucide-react';

export const MENU_STRUCTURE = [
  // Principal
  { name: 'Dashboard', icon: Home, path: '/Dashboard', category: 'Principal' },
  
  // Recursos Humanos
  { name: 'Dashboard RRHH', icon: Users, path: '/AdvancedHRDashboard', category: 'Recursos Humanos' },
  { name: 'Base de datos de Empleados', icon: Users, path: '/MasterEmployeeDatabase', category: 'Recursos Humanos' },
  { name: 'Gestión Ausencias', icon: Calendar, path: '/AbsenceManagement', category: 'Recursos Humanos' },
  { name: 'Matriz Habilidades', icon: Award, path: '/SkillMatrix', category: 'Recursos Humanos' },
  { name: 'ETT y Temporales', icon: Users, path: '/ETTTemporaryEmployees', category: 'Recursos Humanos' },
  { name: 'Onboarding', icon: Users, path: '/EmployeeOnboarding', category: 'Recursos Humanos' },
  { name: 'Control Presencia', icon: Calendar, path: '/AttendanceManagement', category: 'Recursos Humanos' },
  { name: 'Comités y PRL', icon: Shield, path: '/CommitteeManagement', category: 'Recursos Humanos' },
  { name: 'Plan Incentivos', icon: DollarSign, path: '/IncentiveManagement', category: 'Recursos Humanos' },

  // Dirección
  { name: 'Dirección - Habilidades', icon: Award, path: '/DireccionSkills', category: 'Dirección' },
  { name: 'Nuevo Conf. Procesos', icon: Cog, path: '/NewProcessConfigurator', category: 'Dirección' },
  { name: 'Planning Producción', icon: Calendar, path: '/DailyProductionPlanningPage', category: 'Dirección' },
  
  // Planificación
  { name: 'Personal Fabricación', icon: Briefcase, path: '/EmployeesShiftManager', category: 'Planificación' },
  { name: 'Planificador Órdenes', icon: Package, path: '/ProductionPlanning', category: 'Planificación' },
  { name: 'Importar Órdenes', icon: Download, path: '/OrderImport', category: 'Planificación' },
  { name: 'Planificación - Habilidades', icon: Award, path: '/PlanificacionSkills', category: 'Planificación' },

  // Fabricación
  { name: 'Config. Fabricación', icon: Factory, path: '/OrganizationalStructure?tab=manufacturing', category: 'Fabricación' },
  { name: 'Jefes de Turno', icon: Users, path: '/ShiftManagers', category: 'Fabricación' },
  { name: 'Asignación de Turno', icon: Users, path: '/ShiftAssignmentsPage', category: 'Fabricación' },
  { name: 'Consulta Máquinas', icon: Wrench, path: '/MachineManagement', category: 'Fabricación' },
  { name: 'Control Calidad', icon: ClipboardCheck, path: '/QualityControl', category: 'Fabricación' },
  { name: 'Config. Procesos', icon: Cog, path: '/ProcessConfiguration', category: 'Fabricación' },
  { name: 'Fabricación - Habilidades', icon: Award, path: '/FabricacionSkills', category: 'Fabricación' },
  
  // Mantenimiento
  { name: 'Planning Mantenimiento', icon: Calendar, path: '/MaintenancePlanningPage', category: 'Mantenimiento' },
  { name: 'Seguimiento', icon: Wrench, path: '/MaintenanceTracking', category: 'Mantenimiento' },
  { name: 'Mantenimiento - Habilidades', icon: Award, path: '/MantenimientoSkills', category: 'Mantenimiento' },

  // Almacén
  { name: 'Planning Almacén', icon: Calendar, path: '/WarehousePlanningPage', category: 'Almacén' },
  { name: 'Almacén - Habilidades', icon: Award, path: '/AlmacenSkills', category: 'Almacén' },

  // Calidad
  { name: 'Planning Calidad', icon: Calendar, path: '/QualityPlanningPage', category: 'Calidad' },
  { name: 'Calidad - Habilidades', icon: Award, path: '/CalidadSkills', category: 'Calidad' },
  
  // Análisis
  { name: 'Informes', icon: FileText, path: '/Reports', category: 'Análisis' },
  { name: 'Análisis Predictivo', icon: FileText, path: '/MLInsights', category: 'Análisis' },
  
  // Configuración
  { name: 'Configuración', icon: Settings, path: '/Configuration', category: 'Configuración' },

  // Revisión de páginas (solo vistas que seguimos revisando)
  { name: 'DailyShiftPlanning', icon: Calendar, path: '/DailyShiftPlanning', category: 'Revisión de páginas' },
  { name: 'EmailNotifications', icon: FileText, path: '/EmailNotifications', category: 'Revisión de páginas' },
  { name: 'EmployeeAbsenceInfo', icon: Users, path: '/EmployeeAbsenceInfo', category: 'Revisión de páginas' },
  { name: 'ArticleManagement', icon: FileText, path: '/ArticleManagement', category: 'Revisión de páginas' },
  { name: 'MachineAssignments', icon: Users, path: '/MachineAssignments', category: 'Revisión de páginas' },
  { name: 'PerformanceManagement', icon: FileText, path: '/PerformanceManagement', category: 'Revisión de páginas' },

];