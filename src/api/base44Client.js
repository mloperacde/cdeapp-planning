// src/api/base44Client.js - Cliente robusto con fallback automático
import { appParams } from '@/lib/app-params';

let base44Instance = null;
let usingMock = false;

console.log('🔌 Inicializando base44Client...');

// Función para crear un mock completo
function createMockClient() {
  console.warn('⚠️ Usando cliente mock de base44 (SDK no disponible)');
  usingMock = true;
  
  const mock = {
    // Auth
    auth: {
      me: () => {
        console.log('[Mock] auth.me()');
        return Promise.resolve({
          id: 'mock-user-' + Date.now(),
          email: 'admin@demo.com',
          full_name: 'Administrador Demo',
          role: 'admin',
          created_at: new Date().toISOString()
        });
      },
      logout: () => {
        console.log('[Mock] auth.logout()');
        return Promise.resolve();
      },
      updateMe: (data) => {
        console.log('[Mock] auth.updateMe()', data);
        return Promise.resolve({ success: true, ...data });
      }
    },
    
    // Entities
    entities: {
      AppConfig: {
        filter: (query) => {
          console.log('[Mock] AppConfig.filter()', query);
          return Promise.resolve([{
            id: 1,
            config_key: 'branding',
            app_name: 'CdeApp Planning',
            app_subtitle: 'Sistema de Gestión (Modo Demo)',
            logo_url: null,
            primary_color: '#3b82f6',
            secondary_color: '#1e40af'
          }]);
        }
      },
      
      EmployeeMasterDatabase: {
        list: () => {
          console.log('[Mock] EmployeeMasterDatabase.list()');
          return Promise.resolve([
            {
              id: 1,
              name: 'Demo User',
              email: 'demo@example.com',
              department: 'Demo',
              position: 'Operario',
              status: 'active'
            }
          ]);
        },
        create: (data) => {
          console.log('[Mock] EmployeeMasterDatabase.create()', data);
          return Promise.resolve({ id: Date.now(), ...data });
        }
      },
      
      MachineMaster: {
        list: () => {
          console.log('[Mock] MachineMaster.list()');
          return Promise.resolve([
            { id: 1, name: 'Máquina Demo 1', code: 'MD001', status: 'active' },
            { id: 2, name: 'Máquina Demo 2', code: 'MD002', status: 'active' }
          ]);
        },
        create: (data) => {
          console.log('[Mock] MachineMaster.create()', data);
          return Promise.resolve({ id: Date.now(), ...data });
        },
        update: (id, data) => {
          console.log('[Mock] MachineMaster.update()', id, data);
          return Promise.resolve({ id, ...data });
        },
        delete: (id) => {
          console.log('[Mock] MachineMaster.delete()', id);
          return Promise.resolve({ success: true, id });
        }
      },
      
      Process: {
        list: () => {
          console.log('[Mock] Process.list()');
          return Promise.resolve([
            { id: 1, name: 'Proceso Demo 1', code: 'PD001' },
            { id: 2, name: 'Proceso Demo 2', code: 'PD002' }
          ]);
        }
      },
      
      Assignment: {
        list: () => {
          console.log('[Mock] Assignment.list()');
          return Promise.resolve([]);
        }
      }
    },
    
    // API methods
    api: {
      get: (url) => {
        console.log('[Mock] api.get()', url);
        return Promise.resolve({ data: [] });
      },
      post: (url, data) => {
        console.log('[Mock] api.post()', url, data);
        return Promise.resolve({ success: true, data: { id: Date.now(), ...data } });
      },
      put: (url, data) => {
        console.log('[Mock] api.put()', url, data);
        return Promise.resolve({ success: true, data });
      },
      delete: (url) => {
        console.log('[Mock] api.delete()', url);
        return Promise.resolve({ success: true });
      }
    }
  };
  
  // Agregar métodos de debug
  mock.__debug = {
    version: '1.0.0-mock',
    timestamp: new Date().toISOString(),
    isMock: true,
    
    test: async () => {
      console.group('🧪 Test del mock base44');
      try {
        const user = await mock.auth.me();
        console.log('✅ auth.me()', user);
        
        const machines = await mock.entities.MachineMaster.list();
        console.log('✅ MachineMaster.list()', machines);
        
        const employees = await mock.entities.EmployeeMasterDatabase.list();
        console.log('✅ EmployeeMasterDatabase.list()', employees);
        
        return { user, machines, employees };
      } catch (error) {
        console.error('❌ Error en test:', error);
        throw error;
      } finally {
        console.groupEnd();
      }
    },
    
    reload: () => {
      console.log('🔄 Recargando página...');
      window.location.reload();
    },
    
    switchToMock: () => {
      console.log('🔄 Cambiando a modo mock...');
      base44Instance = mock;
      window.base44 = mock;
      return mock;
    }
  };
  
  return mock;
}

// Intentar crear el cliente real con SDK
try {
  console.log('🔄 Intentando cargar @base44/sdk...');
  
  // Verificar si appParams existe
  if (!appParams) {
    throw new Error('appParams no definido');
  }
  
  const { createClient } = require('@base44/sdk');
  const { appId, serverUrl, token, functionsVersion } = appParams;
  
  base44Instance = createClient({
    appId,
    serverUrl,
    token,
    functionsVersion,
    requiresAuth: false
  });
  
  console.log('✅ Cliente base44 creado con SDK');
  
} catch (sdkError) {
  console.error('❌ Error cargando SDK de base44:', sdkError.message);
  
  // Intentar método alternativo: buscar en window
  if (typeof window !== 'undefined' && window.base44) {
    console.log('📡 Usando base44 de window');
    base44Instance = window.base44;
  } else {
    // Crear mock como último recurso
    base44Instance = createMockClient();
  }
}

// Asegurar que base44 esté disponible en window
if (typeof window !== 'undefined') {
  window.base44 = base44Instance;
  if (usingMock) {
    window.__usingBase44Mock = true;
    console.log('🔧 Mock activado - disponible en window.base44');
  }
}

// Exportar la instancia
export const base44 = base44Instance;
export default base44Instance;
