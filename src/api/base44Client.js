// Versión simple del cliente Base44
export const base44 = {
  auth: {
    me: async () => ({ 
      email: 'usuario@ejemplo.com', 
      full_name: 'Usuario Demo',
      role: 'admin'
    }),
    logout: () => { 
      console.log('Cerrando sesión');
      window.location.reload();
    }
  },
  entities: {
    AppConfig: {
      filter: async () => []
    },
    EmployeeMasterDatabase: {
      list: async () => []
    }
  }
};
