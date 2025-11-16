const STORAGE_KEYS = {
  EMPLOYEES: 'offline_employees',
  MACHINES: 'offline_machines',
  PLANNING: 'offline_planning',
  TEAM_SCHEDULES: 'offline_team_schedules',
  PENDING_MESSAGES: 'offline_pending_messages',
  MAINTENANCE_LOGS: 'offline_maintenance_logs',
  LAST_SYNC: 'offline_last_sync'
};

export const offlineStorage = {
  saveEmployees: (employees) => {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  },

  getEmployees: () => {
    const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    return data ? JSON.parse(data) : [];
  },

  saveMachines: (machines) => {
    localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(machines));
  },

  getMachines: () => {
    const data = localStorage.getItem(STORAGE_KEYS.MACHINES);
    return data ? JSON.parse(data) : [];
  },

  savePlanning: (planning) => {
    localStorage.setItem(STORAGE_KEYS.PLANNING, JSON.stringify(planning));
  },

  getPlanning: () => {
    const data = localStorage.getItem(STORAGE_KEYS.PLANNING);
    return data ? JSON.parse(data) : [];
  },

  saveTeamSchedules: (schedules) => {
    localStorage.setItem(STORAGE_KEYS.TEAM_SCHEDULES, JSON.stringify(schedules));
  },

  getTeamSchedules: () => {
    const data = localStorage.getItem(STORAGE_KEYS.TEAM_SCHEDULES);
    return data ? JSON.parse(data) : [];
  },

  saveMaintenanceLogs: (logs) => {
    localStorage.setItem(STORAGE_KEYS.MAINTENANCE_LOGS, JSON.stringify(logs));
  },

  getMaintenanceLogs: () => {
    const data = localStorage.getItem(STORAGE_KEYS.MAINTENANCE_LOGS);
    return data ? JSON.parse(data) : [];
  },

  addPendingMessage: (message) => {
    const pending = offlineStorage.getPendingMessages();
    pending.push({ ...message, timestamp: new Date().toISOString(), synced: false });
    localStorage.setItem(STORAGE_KEYS.PENDING_MESSAGES, JSON.stringify(pending));
  },

  getPendingMessages: () => {
    const data = localStorage.getItem(STORAGE_KEYS.PENDING_MESSAGES);
    return data ? JSON.parse(data) : [];
  },

  removePendingMessage: (index) => {
    const pending = offlineStorage.getPendingMessages();
    pending.splice(index, 1);
    localStorage.setItem(STORAGE_KEYS.PENDING_MESSAGES, JSON.stringify(pending));
  },

  clearPendingMessages: () => {
    localStorage.setItem(STORAGE_KEYS.PENDING_MESSAGES, JSON.stringify([]));
  },

  getLastSync: () => {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  },

  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
};

export const isOnline = () => navigator.onLine;