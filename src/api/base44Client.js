import { createClient } from '@base44/sdk';

const host = typeof window !== 'undefined' ? window.location.hostname : '';
const isLocal = host === 'localhost' || host === '127.0.0.1';

export const base44 = createClient({
  appId: "690cdd4205782920ba2297c8",
  requiresAuth: !isLocal
});
