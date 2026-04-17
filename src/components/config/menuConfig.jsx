import {
  Home,
  Users,
  Calendar,
  Settings,
  BarChart3,
  FileText,
  Clock,
  Package,
  Wrench,
  ClipboardCheck,
  Building2,
  UserCog,
  Briefcase,
  TrendingUp,
  Factory,
  Database,
  FileCog,
  Shield,
  Palette,
  GitBranch,
  Coffee,
  UserPlus,
  Target,
  Bell,
  MessageSquare,
  DollarSign,
  Award,
  Sparkles,
  LayoutDashboard,
  CalendarDays,
  Truck,
  Star,
  Link2,
  FlaskConical,
  GraduationCap,
  ArrowLeftRight
} from 'lucide-react';

export const MENU_STRUCTURE = [
  // Principal
  { name: 'Dashboard', path: '/Dashboard', icon: Home, category: 'Principal' },

  // Recursos Humanos
  { name: 'Dashboard RRHH', path: '/AdvancedHRDashboard', icon: LayoutDashboard, category: 'Recursos Humanos' },
  { name: 'Estructura Organizativa', path: '/OrganizationalStructure', icon: GitBranch, category: 'Recursos Humanos' },
  { name: 'Base de datos de Empleados', path: '/MasterEmployeeDatabase', icon: Users, category: 'Recursos Humanos' },
  { name: 'Sincronización Cuco360', path: '/CucoSyncDashboard', icon: Link2, category: 'Recursos Humanos' },
  { name: 'ETT y Temporales', path: '/ETTTemporaryEmployees', icon: Briefcase, category: 'Recursos Humanos' },
  { name: 'Onboarding', path: '/EmployeeOnboarding', icon: UserPlus, category: 'Recursos Humanos' },
  { name: 'Presencia y Ausencias', path: '/PresenceAbsenceHub', icon: Clock, category: 'Recursos Humanos' },
  { name: 'Comités y PRL', path: '/CommitteeManagement', icon: Shield, category: 'Recursos Humanos' },
  { name: 'Vestuarios/Taquillas', path: '/LockerManagement', icon: Package, category: 'Recursos Humanos' },
  { name: 'Matriz Habilidades', path: '/SkillMatrix', icon: BarChart3, category: 'Recursos Humanos' },
  { name: 'Gestión Salarial', path: '/SalaryManagement', icon: DollarSign, category: 'Recursos Humanos' },
  { name: 'Plan Incentivos', path: '/IncentiveManagement', icon: Target, category: 'Recursos Humanos' },

  // Dirección
  { name: 'Dirección - Habilidades', path: '/DireccionSkills', icon: Star, category: 'Dirección' },
  { name: 'Nuevo Conf. Procesos', path: '/NewProcessConfigurator', icon: FileCog, category: 'Dirección' },
  { name: 'Informes Técnicos CQV', path: '/TechnicalReports', icon: FlaskConical, category: 'Dirección' },
  { name: 'Gestión de Formación', path: '/TrainingManagement', icon: GraduationCap, category: 'Dirección' },
  { name: 'Layouts y Diagramas de Proceso', path: '/RoomLayoutManager', icon: LayoutDashboard, category: 'Dirección' },

  // Planificación
  { name: 'Planning Producción', path: '/DailyProductionPlanningPage', icon: Factory, category: 'Planificación' },
  { name: 'Planificador Órdenes', path: '/ProductionPlanning', icon: Factory, category: 'Planificación' },
  { name: 'Importar Órdenes', path: '/OrderImport', icon: Database, category: 'Planificación' },
  { name: 'Agente Planificador IA', path: '/ProductionPlannerChat', icon: Sparkles, category: 'Planificación' },
  { name: 'Config. Intervenciones', path: '/InterventionConfig', icon: Wrench, category: 'Planificación' },
  { name: 'Optimización IA', path: '/ProductionOptimizer', icon: Sparkles, category: 'Planificación' },
  { name: 'Planificación - Habilidades', path: '/PlanificacionSkills', icon: BarChart3, category: 'Planificación' },

  // Fabricación
  { name: 'Empleados producción', path: '/EmployeesShiftManager', icon: Users, category: 'Fabricación' },
  { name: 'Jefes de Turno', path: '/ShiftManagers', icon: Briefcase, category: 'Fabricación' },
  { name: 'Traspaso de Turnos', path: '/ShiftHandover', icon: ArrowLeftRight, category: 'Fabricación' },
  { name: 'Apoyos 14-15', path: '/SupportManagement1415', icon: Coffee, category: 'Fabricación' },
  { name: 'Planning Diario', path: '/ShiftAssignmentsPage', icon: CalendarDays, category: 'Fabricación' },
  { name: 'Consulta Máquinas', path: '/MachineManagement', icon: Settings, category: 'Fabricación' },
  { name: 'Control Calidad', path: '/QualityControl', icon: ClipboardCheck, category: 'Fabricación' },
  { name: 'Config. Calidad', path: '/ProcessConfiguration', icon: FileCog, category: 'Fabricación' },
  { name: 'Fabricación - Habilidades', path: '/FabricacionSkills', icon: BarChart3, category: 'Fabricación' },

  // Mantenimiento
  { name: 'Planning Mantenimiento', path: '/MaintenancePlanningPage', icon: CalendarDays, category: 'Mantenimiento' },
  { name: 'Seguimiento', path: '/MaintenanceTracking', icon: Wrench, category: 'Mantenimiento' },
  { name: 'Intervenciones', path: '/MaintenanceInterventions', icon: ClipboardCheck, category: 'Mantenimiento' },
  { name: 'Mantenimiento - Habilidades', path: '/MantenimientoSkills', icon: BarChart3, category: 'Mantenimiento' },

  // Almacén
  { name: 'Planning Almacén', path: '/WarehousePlanningPage', icon: Truck, category: 'Almacén' },
  { name: 'Almacén - Habilidades', path: '/AlmacenSkills', icon: BarChart3, category: 'Almacén' },

  // Calidad
  { name: 'Planning Calidad', path: '/QualityPlanningPage', icon: ClipboardCheck, category: 'Calidad' },
  { name: 'Calidad - Habilidades', path: '/CalidadSkills', icon: BarChart3, category: 'Calidad' },

  // Análisis
  { name: 'Informes', path: '/Reports', icon: FileText, category: 'Análisis' },
  { name: 'Análisis Predictivo', path: '/MLInsights', icon: TrendingUp, category: 'Análisis' },

  // Configuración
  { name: 'Configuración', path: '/Configuration', icon: Settings, category: 'Configuración' },
  { name: 'EmailNotifications', path: '/EmailNotifications', icon: Bell, category: 'Configuración' },
  { name: 'EmployeeAbsenceInfo', path: '/EmployeeAbsenceInfo', icon: FileText, category: 'Configuración' },
];