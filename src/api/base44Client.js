import { createClient } from '@base44/sdk';

const host = typeof window !== 'undefined' ? window.location.hostname : '';
const isLocal = host === 'localhost' || host === '127.0.0.1';

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
    list: async (orderBy, limit) => {
      let data = getEntityData(entityName);
      // Basic sorting could be implemented if needed
      // For now returning all data
      return data;
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

export const base44 = isLocal
  ? createMockBase44()
  : createClient({
      appId: "690cdd4205782920ba2297c8",
      requiresAuth: true
    });
