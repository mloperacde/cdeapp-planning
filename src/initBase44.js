// src/initBase44.js - Forzar base44 antes de cualquier cosa
(function() {
  console.log('🧨 Inicialización forzada de base44');
  
  // Eliminar cualquier base44 existente
  delete window.base44;
  
  // Crear base44 global mínimo
  const base44 = {
    auth: {
      me: () => Promise.resolve({
        id: 'nuclear-user',
        email: 'nuclear@demo.com',
        full_name: 'Usuario Nuclear',
        role: 'superadmin',
        permissions: ['*']
      }),
      logout: () => {
        console.log('Nuclear logout');
        return Promise.resolve();
      }
    },
    entities: {
      AppConfig: {
        filter: () => Promise.resolve([{
          config_key: 'branding',
          app_name: 'CdeApp Nuclear',
          app_subtitle: 'Modo de emergencia activado'
        }])
      },
      EmployeeMasterDatabase: { list: () => Promise.resolve([]) },
      MachineMaster: { list: () => Promise.resolve([]) },
      Process: { list: () => Promise.resolve([]) },
      Assignment: { list: () => Promise.resolve([]) }
    },
    api: {
      get: () => Promise.resolve({ data: [] }),
      post: () => Promise.resolve({ success: true })
    }
  };
  
  // Hacerlo inmutable
  Object.freeze(base44);
  Object.freeze(base44.auth);
  Object.freeze(base44.entities);
  
  window.base44 = base44;
  console.log('✅ base44 nuclear implantado');
})();

export default window.base44;
