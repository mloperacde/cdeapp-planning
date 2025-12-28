// Contenido mínimo
console.log('✅ base44Client cargado');
export const base44 = {
  auth: {
    me: () => Promise.resolve({ email: 'test@test.com', full_name: 'Usuario Test' }),
    logout: () => { console.log('logout'); window.location.reload(); }
  },
  entities: {
    AppConfig: {
      filter: () => Promise.resolve([])
    }
  }
};
