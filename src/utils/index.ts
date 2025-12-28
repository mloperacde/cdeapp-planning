// utils/index.js
export const createPageUrl = (pageName) => {
  // Si usas React Router con rutas simples
  return `/${pageName.toLowerCase().replace(/\s+/g, '')}`;
  
  // O si usas un mapeo específico:
  const pageMap = {
    'AdvancedHRDashboard': '/hr-dashboard',
    'MasterEmployeeDatabase': '/employees',
    'Timeline': '/timeline',
    // Agrega más mapeos según necesites
  };
  
  return pageMap[pageName] || `/${pageName}`;
};
