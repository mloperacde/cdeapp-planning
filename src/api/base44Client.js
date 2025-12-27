// src/api/base44Client.js - Cliente con triple capa de fallback
console.log('🔌 base44Client iniciando...');

// ==================== MOCK COMPLETO ====================
function createComprehensiveMock() {
  console.warn('⚠️ Creando mock completo de base44');
  
  const mockData = {
    users: [
      {
        id: 'user-001',
        email: 'admin@demo.com',
        full_name: 'Administrador Demo',
        role: 'admin',
        avatar_url: null,
        created_at: new Date().toISOString()
      }
    ],
    employees: [
      {
        id: 1,
        name: 'Juan Pérez',
        email: 'juan@demo.com',
        department: 'Producción',
        position: 'Operario',
        status: 'active',
        hire_date: '2023-01-15'
      },
      {
        id: 2,
        name: 'María García',
        email: 'maria@demo.com', 
        department: 'Calidad',
        position: 'Supervisora',
        status: 'active',
        hire_date: '2022-03-20'
      }
    ],
    machines: [
      {
        id: 1,
        code: 'M001',
        name: 'Máquina de Corte CNC',
        type: 'Corte',
        status: 'active',
        department: 'Producción',
        last_maintenance: '2024-01-10'
      },
      {
        id: 2,
        code: 'M002',
        name: 'Prensa Hidráulica',
        type: 'Formado',
        status: 'active',
        department: 'Producción',
        last_maintenance: '2024-01-05'
      }
    ],
    processes: [
      {
        id: 1,
        code: 'PROC001',
        name: 'Corte de Material',
        duration: 120,
        department: 'Producción'
      },
      {
        id: 2,
        code: 'PROC002',
        name: 'Soldadura MIG',
        duration: 180,
        department: 'Producción'
      }
    ],
    appConfig: {
      branding: {
        app_name: 'CdeApp Planning',
        app_subtitle: 'Sistema de Gestión Integral',
        logo_url: null,
        primary_color: '#3b82f6',
        secondary_color: '#1e40af'
      }
    }
  };

  return {
    // ===== AUTH =====
    auth: {
      me: () => {
        console.log('[Mock] auth.me() llamado');
        return Promise.resolve(mockData.users[0]);
      },
      
      logout: () => {
        console.log('[Mock] auth.logout() llamado');
        window.location.href = '/login';
        return Promise.resolve();
      },
      
      updateMe: (data) => {
        console.log('[Mock] auth.updateMe() con:', data);
        Object.assign(mockData.users[0], data);
        return Promise.resolve({ success: true, ...mockData.users[0] });
      },
      
      login: (credentials) => {
        console.log('[Mock] auth.login() con:', credentials);
        return Promise.resolve({ ...mockData.users[0], token: 'mock-token-123' });
      }
    },
    
    // ===== ENTITIES =====
    entities: {
      // AppConfig
      AppConfig: {
        filter: async (query) => {
          console.log('[Mock] AppConfig.filter() con:', query);
          if (query.config_key === 'branding') {
            return [{
              id: 1,
              config_key: 'branding',
              config_value: JSON.stringify(mockData.appConfig.branding),
              created_at: new Date().toISOString()
            }];
          }
          return [];
        },
        
        create: (data) => {
          console.log('[Mock] AppConfig.create() con:', data);
          return Promise.resolve({ id: Date.now(), ...data });
        }
      },
      
      // EmployeeMasterDatabase
      EmployeeMasterDatabase: {
        list: async (params = {}) => {
          console.log('[Mock] EmployeeMasterDatabase.list() con:', params);
          let filtered = [...mockData.employees];
          
          // Filtros básicos
          if (params.search) {
            const search = params.search.toLowerCase();
            filtered = filtered.filter(emp => 
              emp.name.toLowerCase().includes(search) ||
              emp.email.toLowerCase().includes(search) ||
              emp.department.toLowerCase().includes(search)
            );
          }
          
          return filtered;
        },
        
        create: (data) => {
          console.log('[Mock] EmployeeMasterDatabase.create() con:', data);
          const newEmployee = { id: mockData.employees.length + 1, ...data };
          mockData.employees.push(newEmployee);
          return Promise.resolve(newEmployee);
        },
        
        update: (id, data) => {
          console.log('[Mock] EmployeeMasterDatabase.update()', id, data);
          const index = mockData.employees.findIndex(e => e.id === id);
          if (index >= 0) {
            mockData.employees[index] = { ...mockData.employees[index], ...data };
            return Promise.resolve(mockData.employees[index]);
          }
          return Promise.reject(new Error('Empleado no encontrado'));
        },
        
        delete: (id) => {
          console.log('[Mock] EmployeeMasterDatabase.delete()', id);
          mockData.employees = mockData.employees.filter(e => e.id !== id);
          return Promise.resolve({ success: true, id });
        }
      },
      
      // MachineMaster
      MachineMaster: {
        list: async (params = {}) => {
          console.log('[Mock] MachineMaster.list() con:', params);
          let filtered = [...mockData.machines];
          
          if (params.search) {
            const search = params.search.toLowerCase();
            filtered = filtered.filter(m => 
              m.name.toLowerCase().includes(search) ||
              m.code.toLowerCase().includes(search) ||
              m.type.toLowerCase().includes(search)
            );
          }
          
          if (params.status) {
            filtered = filtered.filter(m => m.status === params.status);
          }
          
          return filtered;
        },
        
        create: (data) => {
          console.log('[Mock] MachineMaster.create() con:', data);
          const newMachine = { 
            id: mockData.machines.length + 1, 
            ...data,
            created_at: new Date().toISOString()
          };
          mockData.machines.push(newMachine);
          return Promise.resolve(newMachine);
        },
        
        update: (id, data) => {
          console.log('[Mock] MachineMaster.update()', id, data);
          const index = mockData.machines.findIndex(m => m.id === id);
          if (index >= 0) {
            mockData.machines[index] = { ...mockData.machines[index], ...data };
            return Promise.resolve(mockData.machines[index]);
          }
          return Promise.reject(new Error('Máquina no encontrada'));
        },
        
        delete: (id) => {
          console.log('[Mock] MachineMaster.delete()', id);
          mockData.machines = mockData.machines.filter(m => m.id !== id);
          return Promise.resolve({ success: true, id });
        }
      },
      
      // Process
      Process: {
        list: async () => {
          console.log('[Mock] Process.list()');
          return mockData.processes;
        },
        
        create: (data) => {
          console.log('[Mock] Process.create() con:', data);
          const newProcess = { 
            id: mockData.processes.length + 1, 
            ...data 
          };
          mockData.processes.push(newProcess);
          return Promise.resolve(newProcess);
        }
      },
      
      // Assignment
      Assignment: {
        list: async () => {
          console.log('[Mock] Assignment.list()');
          return [];
        },
        
        create: (data) => {
          console.log('[Mock] Assignment.create() con:', data);
          return Promise.resolve({ id: Date.now(), ...data });
        }
      },
      
      // Otras entidades que podrías necesitar
      User: {
        list: async () => {
          console.log('[Mock] User.list()');
          return mockData.users;
        }
      }
    },
    
    // ===== API GENÉRICA =====
    api: {
      get: (endpoint, params = {}) => {
        console.log('[Mock] api.get()', endpoint, params);
        return Promise.resolve({ data: [], status: 200 });
      },
      
      post: (endpoint, data = {}) => {
        console.log('[Mock] api.post()', endpoint, data);
        return Promise.resolve({ 
          success: true, 
          data: { id: Date.now(), ...data },
          status: 201
        });
      },
      
      put: (endpoint, data = {}) => {
        console.log('[Mock] api.put()', endpoint, data);
        return Promise.resolve({ success: true, data });
      },
      
      delete: (endpoint) => {
        console.log('[Mock] api.delete()', endpoint);
        return Promise.resolve({ success: true });
      }
    },
    
    // ===== DEBUG & UTILITIES =====
    __debug: {
      version: '2.0.0-mock',
      isMock: true,
      mockData: mockData,
      
      test: async () => {
        console.group('🧪 Prueba completa del mock');
        try {
          const user = await this.auth.me();
          console.log('✅ auth.me():', user);
          
          const employees = await this.entities.EmployeeMasterDatabase.list();
          console.log('✅ EmployeeMasterDatabase.list():', employees.length, 'empleados');
          
          const machines = await this.entities.MachineMaster.list();
          console.log('✅ MachineMaster.list():', machines.length, 'máquinas');
          
          const config = await this.entities.AppConfig.filter({ config_key: 'branding' });
          console.log('✅ AppConfig.filter():', config);
          
          return { user, employees, machines, config };
        } catch (error) {
          console.error('❌ Error en prueba:', error);
          throw error;
        } finally {
          console.groupEnd();
        }
      },
      
      reset: () => {
        console.log('🔄 Reiniciando datos mock...');
        // Aquí podrías reiniciar los datos si es necesario
      },
      
      showData: () => {
        console.log('📊 Datos mock actuales:', mockData);
        return mockData;
      }
    }
  };
}

// ==================== ESTRATEGIA DE CARGA ====================
let base44Instance = null;
const isBase44Preview = window.location.hostname === 'app.base44.com' && 
                       window.location.pathname.includes('/editor/preview/');

// Estrategia 1: Si ya existe en window, usarlo
if (window.base44 && typeof window.base44 === 'object') {
  console.log('✅ Usando base44 existente de window');
  base44Instance = window.base44;
} 
// Estrategia 2: Si estamos en preview, forzar mock
else if (isBase44Preview) {
  console.log('🎬 Modo preview detectado, cargando mock...');
  base44Instance = createComprehensiveMock();
}
// Estrategia 3: Intentar cargar SDK real
else {
  try {
    console.log('🔄 Intentando cargar SDK real de base44...');
    // Intentar usar el import original
    const { createClient } = require('@base44/sdk');
    const { appParams } = require('@/lib/app-params');
    
    if (appParams && appParams.appId) {
      base44Instance = createClient({
        appId: appParams.appId,
        serverUrl: appParams.serverUrl || 'https://api.base44.com',
        token: appParams.token || '',
        functionsVersion: appParams.functionsVersion || 'v1',
        requiresAuth: false
      });
      console.log('✅ SDK real cargado exitosamente');
    } else {
      throw new Error('appParams no configurado');
    }
  } catch (error) {
    console.warn('⚠️ No se pudo cargar SDK real:', error.message);
    console.log('🔄 Cayendo a mock...');
    base44Instance = createComprehensiveMock();
  }
}

// ==================== EXPORTACIÓN ====================
// Asegurar que esté en window para otros módulos
if (typeof window !== 'undefined') {
  window.base44 = base44Instance;
  console.log('🔧 base44 disponible en window.base44');
}

export const base44 = base44Instance;
export default base44Instance;
