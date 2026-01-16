// src/services/Base44DataService.js
/**
 * SERVICIO CENTRALIZADO PARA SDK BASE44
 * Gestiona autenticación, caché y sincronización de datos
 */
class Base44DataService {
  constructor() {
    if (!window.base44GlobalClient) {
      console.log('🔄 Inicializando cliente Base44 SDK...');
      // Importación dinámica para evitar problemas de carga
      import('@base44/sdk').then(({ createClient }) => {
        window.base44GlobalClient = createClient({
          appId: "690cdd4205782920ba2297c8",
          requiresAuth: true
        });
        console.log('✅ Cliente Base44 SDK inicializado');
        this.notifyReady();
      }).catch(error => {
        console.error('❌ Error cargando SDK Base44:', error);
        this.sdkError = error;
      });
    }
    
    this.client = null;
    this.sdkError = null;
    this.isInitialized = false;
    this.initPromise = null;
    
    // Caché de datos
    this.cache = {
      machines: null,
      employees: null,
      assignments: new Map(), // employeeId -> assignments
      machineAssignments: new Map() // machineId -> assignments
    };
    
    // Listeners
    this.listeners = new Set();
    this.dataSubscriptions = new Map();
    
    // Estadísticas
    this.stats = {
      calls: 0,
      cacheHits: 0,
      errors: 0
    };
  }
  
  // --- INICIALIZACIÓN ---
  
  /**
   * Inicializa y retorna el cliente SDK
   */
  async getClient() {
    if (this.client) return this.client;
    
    if (!this.initPromise) {
      this.initPromise = new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (window.base44GlobalClient) {
            clearInterval(checkInterval);
            this.client = window.base44GlobalClient;
            this.isInitialized = true;
            resolve(this.client);
          } else if (this.sdkError) {
            clearInterval(checkInterval);
            reject(this.sdkError);
          }
        }, 100);
      });
    }
    
    return this.initPromise;
  }
  
  notifyReady() {
    this.listeners.forEach(listener => {
      if (listener.event === 'sdk-ready') {
        listener.callback();
      }
    });
  }
  
  // --- MÉTODOS PRINCIPALES PARA MÁQUINAS ---
  
  /**
   * Obtiene todas las máquinas usando SDK Base44
   */
  async getAllMachines(forceRefresh = false) {
    try {
      this.stats.calls++;
      
      // Verificar caché
      if (!forceRefresh && this.cache.machines) {
        this.stats.cacheHits++;
        console.log('📦 [Base44Service] Máquinas desde caché');
        return this.cache.machines;
      }
      
      const client = await this.getClient();
      console.log('🔍 [Base44Service] Buscando máquinas via SDK...');
      
      // NOTA CRÍTICA: Necesito saber la estructura exacta de tu data model
      // ¿Cómo se llaman las colecciones/tablas en Base44?
      // Ejemplo 1: Si usas "machines" como nombre de colección
      const result = await client.query('machines').findMany();
      
      // Ejemplo 2: Si usas una tabla específica
      // const result = await client.query('maquinas').findMany();
      
      // Ejemplo 3: Si usas un modelo específico
      // const result = await client.models.Machine.findMany();
      
      // Normalizar datos
      const machines = this.normalizeMachines(result);
      
      // Actualizar caché
      this.cache.machines = machines;
      this.notifyListeners('machines-updated', machines);
      
      console.log(`✅ [Base44Service] ${machines.length} máquinas cargadas`);
      return machines;
      
    } catch (error) {
      console.error('❌ [Base44Service] Error cargando máquinas:', error);
      this.stats.errors++;
      
      // Retornar caché viejo si hay error
      if (this.cache.machines) {
        console.warn('⚠️ Usando caché de máquinas por error');
        return this.cache.machines;
      }
      
      throw this.handleSDKError(error);
    }
  }
  
  /**
   * Obtiene máquinas asignadas a un empleado
   */
  async getEmployeeMachines(employeeId, forceRefresh = false) {
    try {
      // Verificar caché
      if (!forceRefresh && this.cache.assignments.has(employeeId)) {
        this.stats.cacheHits++;
        return this.cache.assignments.get(employeeId);
      }
      
      const client = await this.getClient();
      console.log(`👤 [Base44Service] Buscando máquinas para empleado ${employeeId}...`);
      
      // NOTA: Necesito saber cómo se relacionan empleados y máquinas
      // Opción A: Si hay una colección "employee_machines"
      const assignments = await client.query('employee_machines')
        .where('employee_id', '==', employeeId)
        .findMany();
      
      // Opción B: Si las máquinas tienen campo employee_id
      // const assignments = await client.query('machines')
      //   .where('employee_id', '==', employeeId)
      //   .findMany();
      
      // Opción C: Si usas relaciones del SDK
      // const employee = await client.models.Employee.findUnique({
      //   where: { id: employeeId },
      //   include: { machines: true }
      // });
      
      // Enriquecer con datos de máquinas
      const allMachines = await this.getAllMachines();
      const enrichedAssignments = this.enrichAssignments(assignments, allMachines);
      
      // Actualizar caché
      this.cache.assignments.set(employeeId, enrichedAssignments);
      this.notifyListeners(`employee-machines-${employeeId}`, enrichedAssignments);
      
      return enrichedAssignments;
      
    } catch (error) {
      console.error(`❌ Error máquinas empleado ${employeeId}:`, error);
      
      // Cache fallback
      if (this.cache.assignments.has(employeeId)) {
        return this.cache.assignments.get(employeeId);
      }
      
      throw this.handleSDKError(error);
    }
  }
  
  // --- MÉTODOS AUXILIARES ---
  
  normalizeMachines(sdkData) {
    // El SDK puede devolver datos en diferentes formatos
    if (!sdkData) return [];
    
    // Si es un array, procesar directamente
    if (Array.isArray(sdkData)) {
      return sdkData.map(item => ({
        id: item.id || item._id,
        name: item.name || item.nombre || `Máquina ${item.id}`,
        code: item.code || item.codigo,
        type: item.type || item.tipo,
        status: item.status || item.estado || 'active',
        department: item.department || item.departamento,
        // Campos específicos Base44
        ...item
      }));
    }
    
    // Si el SDK devuelve un objeto con data/results
    if (sdkData.data && Array.isArray(sdkData.data)) {
      return this.normalizeMachines(sdkData.data);
    }
    
    console.warn('⚠️ Formato de datos inesperado:', sdkData);
    return [];
  }
  
  enrichAssignments(assignments, allMachines) {
    if (!Array.isArray(assignments)) return [];
    
    return assignments.map(assignment => {
      const machineId = assignment.machine_id || assignment.machineId;
      const machine = allMachines.find(m => m.id === machineId);
      
      return {
        ...assignment,
        machine_id: machineId,
        machine_name: machine ? machine.name : 'Desconocida',
        machine_details: machine,
        priority: assignment.priority || assignment.prioridad || 1,
        _enriched: true
      };
    });
  }
  
  handleSDKError(error) {
    // Manejar errores específicos del SDK
    if (error.message?.includes('auth') || error.message?.includes('Auth')) {
      return new Error('Error de autenticación con Base44. Verifica tu sesión.');
    }
    if (error.message?.includes('permission') || error.message?.includes('Permission')) {
      return new Error('No tienes permisos para acceder a estos datos.');
    }
    if (error.message?.includes('not found') || error.message?.includes('Not found')) {
      return new Error('Recurso no encontrado. La colección/tabla puede no existir.');
    }
    return error;
  }
  
  // --- SUSCRIPCIONES EN TIEMPO REAL (si el SDK lo soporta) ---
  
  async subscribeToMachines(_callback) {
    try {
      await this.getClient();
      
      // Ejemplo de suscripción (depende de las capacidades del SDK)
      // const unsubscribe = client.query('machines').subscribe((data) => {
      //   this.cache.machines = this.normalizeMachines(data);
      //   callback(this.cache.machines);
      // });
      
      // this.dataSubscriptions.set('machines', unsubscribe);
      // return unsubscribe;
      
      console.warn('⚠️ Suscripciones en tiempo real no implementadas');
      return () => {}; // No-op por ahora
      
    } catch (error) {
      console.error('Error en suscripción:', error);
      return () => {};
    }
  }
  
  // --- LISTENERS Y EVENTOS ---
  
  addListener(event, callback) {
    const listener = { event, callback, id: Date.now() };
    this.listeners.add(listener);
    return listener.id;
  }
  
  removeListener(listenerId) {
    for (const listener of this.listeners) {
      if (listener.id === listenerId) {
        this.listeners.delete(listener);
        break;
      }
    }
  }
  
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      if (listener.event === event || listener.event === 'all') {
        try {
          listener.callback(data);
        } catch (error) {
          console.error('Error en listener:', error);
        }
      }
    });
  }
  
  // --- UTILIDADES ---
  
  clearCache() {
    this.cache = {
      machines: null,
      employees: null,
      assignments: new Map(),
      machineAssignments: new Map()
    };
    console.log('🗑️ [Base44Service] Cache limpiado');
  }
  
  getStats() {
    return {
      ...this.stats,
      cacheSize: {
        machines: this.cache.machines?.length || 0,
        employees: this.cache.employees?.length || 0,
        assignments: this.cache.assignments.size
      },
      isInitialized: this.isInitialized
    };
  }
}

// Singleton global
const base44DataService = new Base44DataService();

// Exportar para uso global (solo desarrollo)
if (import.meta.env.MODE === 'development') {
  window.Base44DataService = base44DataService;
}

export default base44DataService;
