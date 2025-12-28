// src/utils/index.js

// Función para crear URLs de páginas
export const createPageUrl = (pageName) => {
  // Mapeo simple de nombres de página a rutas
  const pageMap = {
    'AdvancedHRDashboard': '/hr-dashboard',
    'MasterEmployeeDatabase': '/employees',
    'AbsenceManagement': '/absences',
    'Timeline': '/timeline',
    'MachineManagement': '/machines',
    'Configuration': '/settings',
    'UserManual': '/manual',
    // Agrega más según necesites
  };
  
  // Si existe mapeo, usarlo. Si no, convertir a formato URL
  if (pageMap[pageName]) {
    return pageMap[pageName];
  }
  
  return `/${pageName.toLowerCase().replace(/[^a-z0-9]/gi, '-')}`;
};
