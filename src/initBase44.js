// src/initBase44.js - Inyección forzada de base44
(function() {
  console.log('🧨 Inicialización forzada de base44 - SOLUCIÓN NUCLEAR');
  
  // Si ya existe, no hacer nada
  if (window.base44) {
    console.log('✅ base44 ya existe, no se sobreescribe');
    return;
  }
  
  // Datos mock completos
  const mockData = {
    users: [
      {
        id: 'nuclear-user-001',
        email: 'admin@cdemetal.com',
        full_name: 'Administrador Nuclear',
        role: 'admin',
        permissions: ['*'],
        created_at: new Date().toISOString()
      }
    ],
    employees: [
      {
        id: 1,
        employee_code: 'EMP001',
        name: 'Carlos Rodríguez',
        email: 'carlos@cdemetal.com',
        department: 'Producción',
        position: 'Jefe de Turno',
        status: 'active',
        hire_date: '2022-05-15'
      },
      {
        id: 2,
        employee_code: 'EMP002',
        name: 'Ana Martínez',
        email: 'ana@cdemetal.com',
        department: 'Calidad',
        position: 'Inspectora',
        status: 'active',
        hire_date: '2021-11-30'
      }
    ],
    machines: [
      {
        id: 1,
        code: 'MAQ-001',
        name: 'Corte Láser CNC',
        model: 'TRUMPF 3030',
        status: 'operational',
        department: 'Corte',
        last_maintenance: '2024-01-20',
        next_maintenance: '2024-02-20'
      },
      {
        id: 2,
        code: 'MAQ-002',
        name: 'Prensa Hidráulica',
        model: 'SMG 200T',
        status: 'operational',
        department: 'Estampación',
        last_maintenance: '2024-01-15',
        next_maintenance: '2024-02-15'
      }
    ],
    processes: [
      {
        id: 1,
        code: 'PROC-001',
        name: 'Corte de Chapa',
        description: 'Corte de chapa metálica con láser',
        standard_time: 120,
        department: 'Corte'
      },
      {
        id: 2,
        code: 'PROC-002',
        name: 'Estampación',
        description: 'Estampación de piezas en prensa',
        standard_time: 180,
        department: 'Estampación'
      }
    ],
    assignments: [],
    appConfig: {
      branding: {
        app_name: 'CdeApp Planning',
        app_subtitle: 'Sistema de Gestión Industrial',
        company_name: 'CDE Metal',
        primary_color: '#2563eb',
        secondary_color: '#1e40af',
        logo_url: null
      }
    }
  };

  // Crear el objeto base44 nuclear
  const base44 = {
    // ========== AUTH ==========
    auth: {
      me: () => {
        console.log('[Nuclear] auth.me()');
        return Promise.resolve(mockData.users[0]);
      },
      
      logout: () => {
        console.log('[Nuclear] auth.logout()');
        // Simular logout redirigiendo
        window.location.href = '/login';
        return Promise.resolve();
      },
      
      updateMe: (data) => {
        console.log('[Nuclear] auth.updateMe()', data);
        Object.assign(mockData.users[0], data);
        return Promise.resolve({ 
          success: true, 
          message: 'Usuario actualizado',
          user: mockData.users[0]
        });
      },
      
      login: (credentials) => {
        console.log('[Nuclear] auth.login()', credentials);
        return Promise.resolve({
          ...mockData.users[0],
          token: 'nuclear-token-' + Date.now(),
          expires_at: new Date(Date.now() + 86400000).toISOString()
        });
      }
    },
    
    // ========== ENTITIES ==========
    entities: {
      // AppConfig
      AppConfig: {
        filter: async (query = {}) => {
          console.log('[Nuclear] AppConfig.filter()', query);
          if (query.config_key === 'branding') {
            return [{
              id: 1,
              config_key: 'branding',
              config_value: JSON.stringify(mockData.appConfig.branding),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }];
          }
          return [];
        },
        
        create: (data) => {
          console.log('[Nuclear] AppConfig.create()', data);
          return Promise.resolve({
            id: Date.now(),
            ...data,
            created_at: new Date().toISOString()
          });
        },
        
        update: (id, data) => {
          console.log('[Nuclear] AppConfig.update()', id, data);
          return Promise.resolve({
            id,
            ...data,
            updated_at: new Date().toISOString()
          });
        }
      },
      
      // EmployeeMasterDatabase
      EmployeeMasterDatabase: {
        list: async (params = {}) => {
          console.log('[Nuclear] EmployeeMasterDatabase.list()', params);
          let results = [...mockData.employees];
          
          // Filtrado simple
          if (params.search) {
            const search = params.search.toLowerCase();
            results = results.filter(emp => 
              emp.name.toLowerCase().includes(search) ||
              emp.email.toLowerCase().includes(search) ||
              emp.employee_code.toLowerCase().includes(search)
            );
          }
          
          if (params.department) {
            results = results.filter(emp => 
              emp.department === params.department
            );
          }
          
          return results;
        },
        
        create: (data) => {
          console.log('[Nuclear] EmployeeMasterDatabase.create()', data);
          const newEmployee = {
            id: mockData.employees.length + 1,
            employee_code: `EMP${String(mockData.employees.length + 1).padStart(3, '0')}`,
            ...data,
            created_at: new Date().toISOString()
          };
          mockData.employees.push(newEmployee);
          return Promise.resolve(newEmployee);
        },
        
        update: (id, data) => {
          console.log('[Nuclear] EmployeeMasterDatabase.update()', id, data);
          const index = mockData.employees.findIndex(e => e.id === id);
          if (index >= 0) {
            mockData.employees[index] = {
              ...mockData.employees[index],
              ...data,
              updated_at: new Date().toISOString()
            };
            return Promise.resolve(mockData.employees[index]);
          }
          return Promise.reject(new Error(`Empleado con ID ${id} no encontrado`));
        },
        
        delete: (id) => {
          console.log('[Nuclear] EmployeeMasterDatabase.delete()', id);
          const initialLength = mockData.employees.length;
          mockData.employees = mockData.employees.filter(e => e.id !== id);
          
          if (mockData.employees.length < initialLength) {
            return Promise.resolve({ 
              success: true, 
              message: `Empleado ${id} eliminado`,
              id 
            });
          }
          
          return Promise.reject(new Error(`Empleado con ID ${id} no encontrado`));
        }
      },
      
      // MachineMaster
      MachineMaster: {
        list: async (params = {}) => {
          console.log('[Nuclear] MachineMaster.list()', params);
          let results = [...mockData.machines];
          
          if (params.search) {
            const search = params.search.toLowerCase();
            results = results.filter(machine => 
              machine.name.toLowerCase().includes(search) ||
              machine.code.toLowerCase().includes(search) ||
              machine.model.toLowerCase().includes(search)
            );
          }
          
          if (params.status) {
            results = results.filter(machine => 
              machine.status === params.status
            );
          }
          
          if (params.department) {
            results = results.filter(machine => 
              machine.department === params.department
            );
          }
          
          return results;
        },
        
        create: (data) => {
          console.log('[Nuclear] MachineMaster.create()', data);
          const newMachine = {
            id: mockData.machines.length + 1,
            code: `MAQ-${String(mockData.machines.length + 1).padStart(3, '0')}`,
            ...data,
            created_at: new Date().toISOString(),
            status: data.status || 'operational'
          };
          mockData.machines.push(newMachine);
          return Promise.resolve(newMachine);
        },
        
        update: (id, data) => {
          console.log('[Nuclear] MachineMaster.update()', id, data);
          const index = mockData.machines.findIndex(m => m.id === id);
          if (index >= 0) {
            mockData.machines[index] = {
              ...mockData.machines[index],
              ...data,
              updated_at: new Date().toISOString()
            };
            return Promise.resolve(mockData.machines[index]);
          }
          return Promise.reject(new Error(`Máquina con ID ${id} no encontrada`));
        },
        
        delete: (id) => {
          console.log('[Nuclear] MachineMaster.delete()', id);
          const initialLength = mockData.machines.length;
          mockData.machines = mockData.machines.filter(m => m.id !== id);
          
          if (mockData.machines.length < initialLength) {
            return Promise.resolve({ 
              success: true, 
              message: `Máquina ${id} eliminada`,
              id 
            });
          }
          
          return Promise.reject(new Error(`Máquina con ID ${id} no encontrada`));
        }
      },
      
      // Process
      Process: {
        list: async (params = {}) => {
          console.log('[Nuclear] Process.list()', params);
          let results = [...mockData.processes];
          
          if (params.search) {
            const search = params.search.toLowerCase();
            results = results.filter(proc => 
              proc.name.toLowerCase().includes(search) ||
              proc.code.toLowerCase().includes(search) ||
              proc.description.toLowerCase().includes(search)
            );
          }
          
          return results;
        },
        
        create: (data) => {
          console.log('[Nuclear] Process.create()', data);
          const newProcess = {
            id: mockData.processes.length + 1,
            code: `PROC-${String(mockData.processes.length + 1).padStart(3, '0')}`,
            ...data,
            created_at: new Date().toISOString()
          };
          mockData.processes.push(newProcess);
          return Promise.resolve(newProcess);
        }
      },
      
      // Assignment
      Assignment: {
        list: async (params = {}) => {
          console.log('[Nuclear] Assignment.list()', params);
          // Aquí podrías implementar lógica de asignaciones
          return mockData.assignments;
        },
        
        create: (data) => {
          console.log('[Nuclear] Assignment.create()', data);
          const newAssignment = {
            id: Date.now(),
            ...data,
            created_at: new Date().toISOString(),
            status: 'pending'
          };
          mockData.assignments.push(newAssignment);
          return Promise.resolve(newAssignment);
        }
      },
      
      // User (si se necesita)
      User: {
        list: async () => {
          console.log('[Nuclear] User.list()');
          return mockData.users;
        }
      }
    },
    
    // ========== API GENÉRICA ==========
    api: {
      get: (endpoint, params = {}) => {
        console.log('[Nuclear] api.get()', endpoint, params);
        // Simular diferentes endpoints
        if (endpoint.includes('machines')) {
          return Promise.resolve({ 
            data: mockData.machines,
            count: mockData.machines.length,
            status: 200
          });
        }
        
        if (endpoint.includes('employees')) {
          return Promise.resolve({ 
            data: mockData.employees,
            count: mockData.employees.length,
            status: 200
          });
        }
        
        return Promise.resolve({ 
          data: [],
          count: 0,
          status: 200
        });
      },
      
      post: (endpoint, data = {}) => {
        console.log('[Nuclear] api.post()', endpoint, data);
        return Promise.resolve({ 
          success: true, 
          data: { id: Date.now(), ...data },
          message: 'Creado exitosamente',
          status: 201
        });
      },
      
      put: (endpoint, data = {}) => {
        console.log('[Nuclear] api.put()', endpoint, data);
        return Promise.resolve({ 
          success: true, 
          data,
          message: 'Actualizado exitosamente',
          status: 200
        });
      },
      
      delete: (endpoint) => {
        console.log('[Nuclear] api.delete()', endpoint);
        return Promise.resolve({ 
          success: true,
          message: 'Eliminado exitosamente',
          status: 200
        });
      }
    },
    
    // ========== UTILIDADES Y DEBUG ==========
    __debug: {
      version: '3.0.0-nuclear',
      isMock: true,
      injectedAt: new Date().toISOString(),
      
      // Test completo
      testAll: async () => {
        console.group('🧪 PRUEBA NUCLEAR COMPLETA');
        try {
          console.log('1. Probando autenticación...');
          const user = await base44.auth.me();
          console.log('✅ auth.me():', user);
          
          console.log('2. Probando empleados...');
          const employees = await base44.entities.EmployeeMasterDatabase.list();
          console.log('✅ EmployeeMasterDatabase.list():', employees.length, 'empleados');
          
          console.log('3. Probando máquinas...');
          const machines = await base44.entities.MachineMaster.list();
          console.log('✅ MachineMaster.list():', machines.length, 'máquinas');
          
          console.log('4. Probando procesos...');
          const processes = await base44.entities.Process.list();
          console.log('✅ Process.list():', processes.length, 'procesos');
          
          console.log('5. Probando configuración...');
          const config = await base44.entities.AppConfig.filter({ config_key: 'branding' });
          console.log('✅ AppConfig.filter():', config);
          
          console.groupEnd();
          return { user, employees, machines, processes, config };
          
        } catch (error) {
          console.error('❌ Error en prueba nuclear:', error);
          console.groupEnd();
          throw error;
        }
      },
      
      // Ver datos actuales
      showData: () => {
        console.log('📊 DATOS MOCK NUCLEAR:', mockData);
        return mockData;
      },
      
      // Reiniciar datos
      resetData: () => {
        console.log('🔄 Reiniciando datos mock...');
        // Mantener solo el usuario admin
        mockData.employees = mockData.employees.slice(0, 2);
        mockData.machines = mockData.machines.slice(0, 2);
        mockData.processes = mockData.processes.slice(0, 2);
        mockData.assignments = [];
        console.log('✅ Datos reiniciados');
      },
      
      // Estado del sistema
      status: () => {
        return {
          base44: '✅ INYECTADO (NUCLEAR)',
          timestamp: new Date().toISOString(),
          counts: {
            users: mockData.users.length,
            employees: mockData.employees.length,
            machines: mockData.machines.length,
            processes: mockData.processes.length,
            assignments: mockData.assignments.length
          }
        };
      }
    }
  };

  // ========== INYECCIÓN GLOBAL ==========
  // Hacer base44 disponible globalmente
  Object.defineProperty(window, 'base44', {
    value: base44,
    writable: false,  // No se puede sobreescribir
    configurable: false // No se puede eliminar
  });

  console.log('✅✅✅ BASE44 NUCLEAR INYECTADO EXITOSAMENTE');
  console.log('🔧 Debug disponible: window.base44.__debug');
  
  // Probar automáticamente
  setTimeout(() => {
    base44.__debug.testAll().catch(() => {
      console.log('⚠️ Prueba automática falló, pero base44 está disponible');
    });
  }, 1000);
  
})();

// Exportar para módulos
export default window.base44;
