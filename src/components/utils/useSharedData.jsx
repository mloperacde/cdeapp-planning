import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook centralizado para datos compartidos con caché agresiva
 * Evita llamadas duplicadas y respeta rate limits
 */
export function useSharedEmployees() {
  return useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 500),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useSharedAbsences() {
  return useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio', 500),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useSharedAbsenceTypes() {
  return useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.filter({ activo: true }, 'orden', 100),
    staleTime: 15 * 60 * 1000, // 15 minutos - config estable
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useSharedTeams() {
  return useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useSharedVacations() {
  return useQuery({
    queryKey: ['vacations'],
    queryFn: () => base44.entities.Vacation.list(),
    staleTime: 30 * 60 * 1000, // 30 minutos - muy estable
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useSharedHolidays() {
  return useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
    staleTime: 60 * 60 * 1000, // 1 hora - datos anuales
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useCurrentEmployee() {
  const { data: user } = useCurrentUser();
  
  return useQuery({
    queryKey: ['currentEmployee', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const emps = await base44.entities.EmployeeMasterDatabase.list();
      return emps.find(e => e.email === user.email) || null;
    },
    enabled: !!user?.email,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}