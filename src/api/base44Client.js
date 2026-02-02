import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const host = typeof window !== 'undefined' ? window.location.hostname : '';

// Configuración de entorno
const forceMock = import.meta.env.VITE_USE_MOCK === 'true';
const forceReal = import.meta.env.VITE_USE_REAL_API === 'true';

// Determinar modo: 
// - Por defecto usamos API REAL.
// - Solo usamos Mock si se especifica explícitamente VITE_USE_MOCK=true
const useMockApi = forceMock;

if (typeof window !== 'undefined') {
  console.log(`[Base44] Initializing Client...`);
  console.log(`[Base44] Mode: ${useMockApi ? 'MOCK (Local Data)' : 'REAL (Backend Connection)'}`);
  if (forceReal) console.log(`[Base44] Real API forced via VITE_USE_REAL_API`);
}

// Simple UUID generator
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

function createMockBase44() {
  const getStorage = () => {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem('base44_mock_db');
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  };

  const saveStorage = (data) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('base44_mock_db', JSON.stringify(data));
    } catch (e) {
      console.error("Mock DB Save Error", e);
    }
  };

  // Seed Data Configuration
  const seedMockData = () => {
    const db = getStorage();
    let modified = false;

    // Seed EmergencyTeamMember if empty
    if (!db.EmergencyTeamMember || db.EmergencyTeamMember.length === 0) {
        console.log("Seeding EmergencyTeamMember mock data...");
        const seed = [
            { employee_id: "6920f8237b953363e935d7e9", rol_emergencia: "Equipo Primera Intervención (EPI)", es_suplente: false, fecha_nombramiento: "2024-01-01", activo: true, zona_asignada: "Planta Baja", telefono_emergencia: "" },
            { employee_id: "6920f864da3a2d543716abee", rol_emergencia: "Equipo Alarma y Evacuación (EAE)", es_suplente: false, fecha_nombramiento: "2024-01-01", activo: true, zona_asignada: "Planta Baja Producción", telefono_emergencia: "" },
            { employee_id: "6920f85c51d18b9fe63f72fe", rol_emergencia: "Equipo Alarma y Evacuación (EAE)", es_suplente: false, fecha_nombramiento: "2024-01-01", activo: true, zona_asignada: "Planta Alta Producción", telefono_emergencia: "" },
            { employee_id: "6920f93f35598f8fdc08d7d6", rol_emergencia: "Equipo Primeros Auxilios (EPA)", es_suplente: true, fecha_nombramiento: "2024-01-01", activo: true, zona_asignada: "Central de Envasados", telefono_emergencia: "" },
            { employee_id: "6920f9070a33f58a2ee60c62", rol_emergencia: "Equipo Primeros Auxilios (EPA)", es_suplente: true, fecha_nombramiento: "2024-01-01", activo: true, zona_asignada: "Central de Envasados", telefono_emergencia: "" },
            { employee_id: "6920f917d424afc1e5d84912", rol_emergencia: "Equipo Primeros Auxilios (EPA)", es_suplente: false, fecha_nombramiento: "2024-01-01", activo: true, zona_asignada: "Central de Envasados", telefono_emergencia: "" },
            { employee_id: "6920f83d6be607f96490619c", rol_emergencia: "Equipo Primeros Auxilios (EPA)", es_suplente: false, fecha_nombramiento: "2024-01-01", activo: true, zona_asignada: "Central de Envasados", telefono_emergencia: "" },
            { employee_id: "6920f861da3a2d543716abeb", rol_emergencia: "Equipo Primeros Auxilios (EPA)", es_suplente: false, fecha_nombramiento: "2024-01-01", activo: true, zona_asignada: "Central de Envasados", telefono_emergencia: "699024769" },
            { employee_id: "6920f7b6d424afc1e5d8483d", rol_emergencia: "Jefe de Intervención", es_suplente: true, fecha_nombramiento: "2024-01-01", activo: true, zona_asignada: "CENTRAL DE ENVASADOS", telefono_emergencia: "647623141" },
            { employee_id: "6920f7e6786279e3043ef3e7", rol_emergencia: "Jefe de Intervención", es_suplente: false, fecha_nombramiento: "2024-01-01", activo: true, zona_asignada: "CENTRAL DE ENVASADOS", telefono_emergencia: "601533175" },
            { employee_id: "6920f7f1442db39ee90d1c7c", rol_emergencia: "Jefe de Emergencias", es_suplente: true, fecha_nombramiento: "2024-01-01", activo: true, zona_asignada: "CENTRAL DE ENVASADOS", telefono_emergencia: "675078839" },
             { employee_id: "6920f8cb582037823b015afe", rol_emergencia: "Jefe de Emergencias", es_suplente: true, fecha_nombramiento: "2024-01-01", activo: true, zona_asignada: "CENTRAL DE ENVASADOS", telefono_emergencia: "659088759" },
             { employee_id: "6920f7e6786279e3043ef3e7", rol_emergencia: "Jefe de Emergencias", es_suplente: false, fecha_nombramiento: "2024-01-01", activo: true, zona_asignada: "CENTRAL DE ENVASADOS", telefono_emergencia: "" }
         ];
         
         db.EmergencyTeamMember = seed.map(item => ({
             id: generateId(),
             ...item,
             created_at: new Date().toISOString(),
             updated_at: new Date().toISOString(),
             formacion_recibida: []
         }));
         modified = true;
     }
     
     // Seed Employee/EmployeeMasterDatabase if empty to ensure names resolve
     if ((!db.Employee || db.Employee.length === 0) || (!db.EmployeeMasterDatabase || db.EmployeeMasterDatabase.length === 0)) {
        console.log("Seeding Employee mock data...");
        const employeeIds = [
            "6920f8237b953363e935d7e9",
            "6920f864da3a2d543716abee",
            "6920f85c51d18b9fe63f72fe",
            "6920f93f35598f8fdc08d7d6",
            "6920f9070a33f58a2ee60c62",
            "6920f917d424afc1e5d84912",
            "6920f83d6be607f96490619c",
            "6920f861da3a2d543716abeb",
            "6920f7b6d424afc1e5d8483d",
            "6920f7e6786279e3043ef3e7",
            "6920f7f1442db39ee90d1c7c",
            "6920f8cb582037823b015afe"
        ];
        
        const employees = employeeIds.map(id => ({
            id: id,
            nombre: `Empleado ${id.substring(0, 5)}`,
            departamento: "Producción",
            activo: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));

        if (!db.Employee || db.Employee.length === 0) {
            db.Employee = employees;
            modified = true;
        }
        
        if (!db.EmployeeMasterDatabase || db.EmployeeMasterDatabase.length === 0) {
            db.EmployeeMasterDatabase = employees;
            modified = true;
        }
     }
 
     if (modified) saveStorage(db);
   };

  // Run seed
  if (typeof window !== 'undefined') {
      seedMockData();
  }

  const getEntityData = (entityName) => {
    const db = getStorage();
    return db[entityName] || [];
  };

  const saveEntityData = (entityName, data) => {
    const db = getStorage();
    db[entityName] = data;
    saveStorage(db);
  };

  const entityMethods = (entityName) => ({
    list: async (orderBy, limit, offset = 0) => {
      let data = getEntityData(entityName);
      // Basic sorting (Mock)
      if (orderBy) {
          const field = orderBy.startsWith('-') ? orderBy.substring(1) : orderBy;
          const dir = orderBy.startsWith('-') ? -1 : 1;
          data = [...data].sort((a, b) => {
              if (a[field] < b[field]) return -1 * dir;
              if (a[field] > b[field]) return 1 * dir;
              return 0;
          });
      }
      
      // Pagination (Mock)
      if (limit !== undefined) {
          return data.slice(offset, offset + limit);
      }
      return data;
    },
    count: async (criteria = {}) => {
       const data = getEntityData(entityName);
       if (Object.keys(criteria).length === 0) return data.length;
       return data.filter(item => {
        return Object.entries(criteria).every(([key, value]) => item[key] == value);
      }).length;
    },
    filter: async (criteria) => {
      const data = getEntityData(entityName);
      return data.filter(item => {
        return Object.entries(criteria).every(([key, value]) => {
            // Loose equality to handle number/string differences
            return item[key] == value;
        });
      });
    },
    create: async (payload) => {
      const data = getEntityData(entityName);
      const newItem = { 
          id: generateId(), 
          ...payload, 
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
      };
      data.push(newItem);
      saveEntityData(entityName, data);
      return newItem;
    },
    update: async (id, payload) => {
      const data = getEntityData(entityName);
      const index = data.findIndex(item => item.id === id);
      if (index !== -1) {
        data[index] = { 
            ...data[index], 
            ...payload, 
            updated_at: new Date().toISOString() 
        };
        saveEntityData(entityName, data);
        return data[index];
      }
      return null;
    },
    findUnique: async (args) => {
       // Mock implementation for findUnique
       // Assuming args is { where: { id: ... } } or just ID
       const data = getEntityData(entityName);
       return null; 
    },
    delete: async (id) => {
        const data = getEntityData(entityName);
        const newData = data.filter(item => item.id !== id);
        saveEntityData(entityName, newData);
        return { success: true };
    }
  });

  const entities = new Proxy({}, {
    get: (_, entityName) => entityMethods(entityName),
  });

  const auth = {
    me: async () => ({ id: "mock_user_id", email: "mock@example.com", role: "admin", name: "Mock User" }),
    redirectToLogin: () => {},
    logout: () => {},
  };

  const query = () => ({
    findMany: async () => [],
    findUnique: async () => ({}),
    where: () => ({
      findMany: async () => [],
      findUnique: async () => ({}),
      limit: () => ({
        findMany: async () => [],
      }),
    }),
  });

  const appLogs = { logUserInApp: async () => {} };
  
  // Expose for debugging if needed
  if (typeof window !== 'undefined') {
      window.__base44_mock_db = getStorage;
  }

  return { auth, entities, appLogs, query };
}

export const APP_ID = appParams.appId || "690cdd4205782920ba2297c8";

if (typeof window !== 'undefined') {
    console.log(`[Base44] Initialized with App ID: ${APP_ID}`);
}

export const base44 = useMockApi
  ? createMockBase44()
  : createClient({
      appId: APP_ID,
      requiresAuth: true
    });
