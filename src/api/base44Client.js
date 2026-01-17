import { createClient } from '@base44/sdk';

const host = typeof window !== 'undefined' ? window.location.hostname : '';
const isLocal = host === 'localhost' || host === '127.0.0.1';

function createMockBase44() {
  const auth = {
    me: async () => null,
    redirectToLogin: () => {},
    logout: () => {},
  };
  const entityMethods = {
    list: async () => [],
    filter: async () => [],
    create: async () => ({}),
    update: async () => ({}),
    findMany: async () => [],
    findUnique: async () => ({}),
    delete: async () => ({}),
  };
  const entities = new Proxy({}, {
    get: () => entityMethods,
  });
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
  return { auth, entities, appLogs, query };
}

export const base44 = isLocal
  ? createMockBase44()
  : createClient({
      appId: "690cdd4205782920ba2297c8",
      requiresAuth: true
    });
