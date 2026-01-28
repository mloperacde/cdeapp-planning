import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { SHIFTS as DEFAULT_SHIFTS, WORK_SCHEDULES as DEFAULT_SCHEDULES, WORKING_HOURS as DEFAULT_WORKING_HOURS } from "@/constants/shifts";

export const useShiftConfig = () => {
  const { data: config, isLoading } = useQuery({
    queryKey: ['appConfig', 'shift_config'],
    queryFn: async () => {
      try {
        const result = await base44.entities.AppConfig.get('shift_config');
        return result?.value || null;
      } catch (error) {
        console.warn("Could not load shift_config, using defaults", error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    shifts: config?.shifts || DEFAULT_SHIFTS,
    schedules: config?.schedules || DEFAULT_SCHEDULES,
    workingHours: config?.working_hours || DEFAULT_WORKING_HOURS,
    isLoading
  };
};
