export const createPageUrl = (pageName) => {
  const pageMap = {
    'AdvancedHRDashboard': '/hr-dashboard',
    'MasterEmployeeDatabase': '/employees',
    'AbsenceManagement': '/absences',
    'Timeline': '/timeline',
    'MachineManagement': '/machines',
    'Configuration': '/settings',
  };
  
  return pageMap[pageName] || `/${pageName}`;
};
