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
  MessageSquare
} from 'lucide-react';

export const MENU_STRUCTURE = [
  // Principal
  { name: 'Dashboard', path: '/Dashboard', icon: Home, category: 'Principal' },
  
  // Recursos Humanos
  { name: 'Empleados (Master)', path: '/MasterEmployeeDatabase', icon: Users, category: 'Recursos Humanos' },
  { name: 'Onboarding', path: '/EmployeeOnboarding', icon: UserPlus, category: 'Recursos Humanos' },
  { name: 'Ausencias', path: '/AbsenceManagement', icon: Calendar, category: 'Recursos Humanos' },
  { name: 'Comités', path: '/CommitteeManagement', icon: Shield, category: 'Recursos Humanos' },
  { name: 'Incentivos', path: '/IncentiveManagement', icon: Target, category: 'Recursos Humanos' },
  { name: 'Taquillas', path: '/LockerManagement', icon: Package, category: 'Recursos Humanos' },
  
  // Dirección
  { name: 'Estructura Organizativa', path: '/OrganizationalStructure', icon: GitBranch, category: 'Dirección' },
  { name: 'Dashboard Avanzado RRHH', path: '/AdvancedHRDashboard', icon: TrendingUp, category: 'Dirección' },
  { name: 'Informes', path: '/Reports', icon: FileText, category: 'Dirección' },
  { name: 'Gestión de Usuarios', path: '/AppUserManagement', icon: UserCog, category: 'Dirección' },
  
  // Planificación
  { name: 'Planificación Turnos', path: '/ShiftPlanning', icon: Calendar, category: 'Planificación' },
  { name: 'Empleados (Responsables)', path: '/EmployeesShiftManager', icon: Users, category: 'Planificación' },
  { name: 'Responsables de Turno', path: '/ShiftManagers', icon: Briefcase, category: 'Planificación' },
  { name: 'Descansos', path: '/Breaks', icon: Coffee, category: 'Planificación' },
  { name: 'Timeline', path: '/Timeline', icon: Clock, category: 'Planificación' },
  { name: 'Planificación Producción', path: '/ProductionPlanning', icon: Factory, category: 'Planificación' },
  { name: 'Planning Diario Máquinas', path: '/MachineDailyPlanning', icon: Factory, category: 'Planificación' },
  { name: 'Asignaciones de Máquinas', path: '/MachineAssignments', icon: Settings, category: 'Planificación' },
  
  // Fabricación
  { name: 'Máquinas (Master)', path: '/MachineMaster', icon: Database, category: 'Fabricación' },
  { name: 'Gestión de Máquinas', path: '/MachineManagement', icon: Settings, category: 'Fabricación' },
  { name: 'Matriz de Habilidades', path: '/SkillMatrix', icon: BarChart3, category: 'Fabricación' },
  { name: 'Configurador de Procesos', path: '/ProcessConfiguration', icon: FileCog, category: 'Fabricación' },
  { name: 'Artículos', path: '/ArticleManagement', icon: Package, category: 'Fabricación' },
  
  // Mantenimiento
  { name: 'Seguimiento Mantenimiento', path: '/MaintenanceTracking', icon: Wrench, category: 'Mantenimiento' },
  
  // Almacén
  { name: 'Planning Soporte 14:15', path: '/SupportManagement1415', icon: Users, category: 'Almacén' },
  
  // Calidad
  { name: 'Control de Calidad', path: '/QualityControl', icon: ClipboardCheck, category: 'Calidad' },
  
  // Análisis
  { name: 'ML Insights', path: '/MLInsights', icon: TrendingUp, category: 'Análisis' },
  
  // Configuración
  { name: 'Configuración General', path: '/Configuration', icon: Settings, category: 'Configuración' },
  { name: 'Branding', path: '/BrandingConfig', icon: Palette, category: 'Configuración' },
];