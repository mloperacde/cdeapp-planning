import { base44 } from '@/api/base44Client';
import { getMachineAlias } from '@/utils/machineAlias';

// src/services/Base44DataService.js
/**
 * SERVICIO CENTRALIZADO PARA SDK BASE44
 * Gestiona autenticación, caché y sincronización de datos
 */
class Base44DataService {
  constructor() {
    this.client = base44;
    this.sdkError = null;
    this.isInitialized = true;
    
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
    return this.client;
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

      const result = await client.entities.MachineMasterDatabase.list('orden_visualizacion', 1000);

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

      const allSkills = await client.entities.EmployeeMachineSkill.list(undefined, 1000);
      const assignments = Array.isArray(allSkills)
        ? allSkills.filter(s => s.employee_id === employeeId)
        : [];

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
      return sdkData.map(item => {
        const sala = (item.ubicacion || item.department || '').trim();
        const codigo = (item.codigo_maquina || item.codigo || item.code || '').trim();
        const nombre = (item.nombre || item.name || `Máquina ${item.id}`).trim();
        const descripcion = (item.descripcion || item.description || nombre).trim();

        // Formato unificado usando utilidad centralizada
        const alias = getMachineAlias({
            ...item,
            ubicacion: sala,
            codigo_maquina: codigo,
            nombre: nombre,
            nombre_maquina: item.nombre_maquina
        });

        return {
          id: item.id || item._id,
          name: nombre,
          alias: alias,
          nombre: nombre, // Mantener compatibilidad
          code: codigo,
          type: item.type || item.tipo,
          status: item.status || item.estado || item.estado_operativo || 'active',
          department: sala,
          ubicacion: sala, // Mantener compatibilidad
          descripcion: descripcion,
          // Campos específicos Base44
          ...item
        };
      });
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
        machine_name: machine ? (machine.alias || machine.name || machine.nombre) : 'Desconocida',
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
