import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { SHIFTS as DEFAULT_SHIFTS, WORK_SCHEDULES as DEFAULT_SCHEDULES, WORKING_HOURS as DEFAULT_WORKING_HOURS } from "@/constants/shifts";

export const useShiftConfig = () => {
  const { data: config, isLoading } = useQuery({
    queryKey: ['appConfig', 'shift_config'],
    queryFn: async () => {
      try {
        // Try to find by key 'shift_config'
        // We use list/filter because IDs are usually UUIDs and 'shift_config' is likely a key
        const configs = await base44.entities.AppConfig.list();
        const result = configs.find(c => c.config_key === 'shift_config' || c.key === 'shift_config');
        return result?.value || null;
      } catch (error) {
        console.warn("Could not load shift_config, using defaults", error);
        
        // Try to create default config if not found
        try {
          const defaultConfig = {
            shifts: DEFAULT_SHIFTS,
            schedules: DEFAULT_SCHEDULES,
            working_hours: DEFAULT_WORKING_HOURS
          };
          await base44.entities.AppConfig.create({ 
            config_key: 'shift_config', 
            value: JSON.stringify(defaultConfig) 
          });
          console.log("Created default shift_config");
          return defaultConfig;
        } catch (createErr) {
          console.error("Failed to create default shift_config", createErr);
          return null;
        }
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
