// src/services/MachineDataService.js
/**
 * SERVICIO CENTRALIZADO DE DATOS DE MÁQUINAS
 * Singleton con cache en memoria que evita peticiones duplicadas
 * y sincroniza datos entre componentes.
 */
class MachineDataService {
  constructor() {
    // Cache principal de todas las máquinas del sistema
    this.machinesCache = null;
    this.lastFetchTime = null;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutos
    
    // Cache de máquinas por empleado
    this.employeeMachinesCache = new Map();
    
    // Listeners para notificar cambios (patrón observer)
    this.listeners = new Set();
    
    // Control para evitar peticiones duplicadas simultáneas
    this.isFetching = false;
    this.fetchQueue = [];
    
    console.log('🔄 MachineDataService inicializado');
  }
  
  // --- MÉTODOS PÚBLICOS PRINCIPALES ---
  
  /**
   * Obtiene TODAS las máquinas del sistema
   * @param {boolean} forceRefresh - Ignorar cache y forzar recarga
   * @returns {Promise<Array>} Lista de máquinas
   */
  async getAllMachines(forceRefresh = false) {
    // 1. Verificar cache primero
    if (!forceRefresh && this.isCacheValid()) {
      console.log('📦 [MachineService] Sirviendo máquinas desde cache');
      return this.machinesCache;
    }
    
    // 2. Si ya hay una petición en curso, encolar esta
    if (this.isFetching) {
      console.log('⏳ [MachineService] Ya hay una petición en curso, encolando...');
      return new Promise((resolve) => {
        this.fetchQueue.push(resolve);
      });
    }
    
    // 3. Realizar petición
    this.isFetching = true;
    
    try {
      console.log('🌐 [MachineService] Fetching máquinas desde API...');
      
      // NOTA: Reemplaza esta URL con tu endpoint real
      const apiUrl = '/api/machines/all'; // <-- ENDPOINT A CONFIRMAR
      const timestamp = Date.now();
      const url = `${apiUrl}?_cache=${timestamp}`;
      
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'X-Request-Source': 'MachineDataService'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      const machines = await response.json();
      
      // 4. Validar y almacenar en cache
      this.machinesCache = this.validateAndNormalizeMachines(machines);
      this.lastFetchTime = Date.now();
      
      console.log(`✅ [MachineService] ${this.machinesCache.length} máquinas cacheadas`);
      
      // 5. Notificar a todos los listeners
      this.notifyListeners('machines-updated', this.machinesCache);
      
      // 6. Resolver peticiones encoladas
      this.resolveQueuedRequests(this.machinesCache);
      
      return this.machinesCache;
      
    } catch (error) {
      console.error('❌ [MachineService] Error cargando máquinas:', error);
      
      // Si hay cache viejo, devolverlo como fallback
      if (this.machinesCache) {
        console.warn('⚠️ [MachineService] Devolviendo cache viejo como fallback');
        return this.machinesCache;
      }
      
      throw error;
      
    } finally {
      this.isFetching = false;
    }
  }
  
  /**
   * Obtiene máquinas asignadas a un empleado específico
   * @param {number} employeeId - ID del empleado
   * @param {boolean} forceRefresh - Ignorar cache
   * @returns {Promise<Array>} Lista de asignaciones
   */
  async getEmployeeMachines(employeeId, forceRefresh = false) {
    const cacheKey = `emp_${employeeId}`;
    
    // 1. Verificar cache local
    if (!forceRefresh && this.employeeMachinesCache.has(cacheKey)) {
      const cached = this.employeeMachinesCache.get(cacheKey);
      const cacheAge = Date.now() - cached.timestamp;
      
      if (cacheAge < this.cacheDuration) {
        console.log(`📦 [MachineService] Máquinas del empleado ${employeeId} desde cache`);
        return cached.data;
      }
    }
    
    try {
      console.log(`👤 [MachineService] Cargando máquinas para empleado ${employeeId}...`);
      
      // NOTA: Reemplaza esta URL con tu endpoint real
      const apiUrl = `/api/employees/${employeeId}/machine-assignments`;
      const timestamp = Date.now();
      const url = `${apiUrl}?_cache=${timestamp}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} para empleado ${employeeId}`);
      }
      
      const assignments = await response.json();
      
      // 2. Normalizar y enriquecer datos
      const enrichedAssignments = await this.enrichAssignments(assignments);
      
      // 3. Guardar en cache
      this.employeeMachinesCache.set(cacheKey, {
        data: enrichedAssignments,
        timestamp: Date.now()
      });
      
      console.log(`✅ [MachineService] ${enrichedAssignments.length} máquinas cargadas para empleado ${employeeId}`);
      
      // 4. Notificar
      this.notifyListeners(`employee-machines-updated-${employeeId}`, enrichedAssignments);
      
      return enrichedAssignments;
      
    } catch (error) {
      console.error(`❌ [MachineService] Error cargando máquinas de empleado ${employeeId}:`, error);
      
      // Intentar cache local como fallback
      if (this.employeeMachinesCache.has(cacheKey)) {
        console.warn(`⚠️ [MachineService] Usando cache viejo para empleado ${employeeId}`);
        return this.employeeMachinesCache.get(cacheKey).data;
      }
      
      throw error;
    }
  }
  
  // --- MÉTODOS AUXILIARES ---
  
  /**
   * Valida y normaliza la estructura de máquinas
   */
  validateAndNormalizeMachines(machines) {
    if (!Array.isArray(machines)) {
      console.warn('⚠️ [MachineService] API no devolvió array, convirtiendo...', machines);
      machines = machines.data || machines.results || [];
    }
    
    // Asegurar que cada máquina tenga estructura consistente
    return machines.map(machine => ({
      id: machine.id || machine.machine_id,
      name: machine.name || machine.nombre || `Máquina ${machine.id}`,
      code: machine.code || machine.codigo,
      type: machine.type || machine.tipo,
      status: machine.status || 'active',
      department: machine.department || machine.departamento,
      lastMaintenance: machine.last_maintenance || machine.ultimo_mantenimiento,
      // Campos adicionales para consistencia
      _normalized: true,
      _cachedAt: Date.now()
    }));
  }
  
  /**
   * Enriquece las asignaciones con datos de máquinas
   */
  async enrichAssignments(assignments) {
    if (!Array.isArray(assignments)) {
      return [];
    }
    
    // Asegurar tener la lista completa de máquinas
    const allMachines = await this.getAllMachines();
    
    return assignments.map(assignment => {
      const machine = allMachines.find(m => m.id === assignment.machine_id);
      
      return {
        ...assignment,
        priority: assignment.priority || assignment.prioridad,
        machine_name: machine ? machine.name : 'Desconocida',
        machine_details: machine || null,
        // Campos normalizados
        employee_id: assignment.employee_id,
        machine_id: assignment.machine_id,
        assigned_at: assignment.assigned_at || assignment.created_at,
        _enriched: true
      };
    });
  }
  
  /**
   * Verifica si el cache es válido
   */
  isCacheValid() {
    return this.machinesCache && 
           this.lastFetchTime && 
           (Date.now() - this.lastFetchTime < this.cacheDuration);
  }
  
  /**
   * Resuelve peticiones encoladas
   */
  resolveQueuedRequests(data) {
    while (this.fetchQueue.length > 0) {
      const resolve = this.fetchQueue.shift();
      if (typeof resolve === 'function') {
        resolve(data);
      }
    }
  }
  
  // --- SISTEMA DE EVENTOS (OBSERVER) ---
  
  /**
   * Agrega un listener para cambios
   */
  addListener(eventType, callback) {
    const listenerKey = `${eventType}_${Date.now()}`;
    this.listeners.add({ eventType, callback, key: listenerKey });
    console.log(`👂 [MachineService] Listener añadido para ${eventType}`);
    return listenerKey; // Para poder removerlo después
  }
  
  /**
   * Remueve un listener
   */
  removeListener(listenerKey) {
    for (const listener of this.listeners) {
      if (listener.key === listenerKey) {
        this.listeners.delete(listener);
        console.log(`🗑️ [MachineService] Listener ${listenerKey} removido`);
        break;
      }
    }
  }
  
  /**
   * Notifica a todos los listeners de un evento
   */
  notifyListeners(eventType, data) {
    console.log(`📢 [MachineService] Notificando evento: ${eventType}`);
    
    this.listeners.forEach(listener => {
      if (listener.eventType === eventType || listener.eventType === 'all') {
        try {
          listener.callback(data);
        } catch (error) {
          console.error(`❌ Error en listener ${listener.key}:`, error);
        }
      }
    });
  }
  
  // --- UTILIDADES ---
  
  /**
   * Busca máquina por ID
   */
  findMachineById(id) {
    if (!this.machinesCache) return null;
    return this.machinesCache.find(m => m.id == id); // == para compatibilidad
  }
  
  /**
   * Busca máquina por nombre
   */
  findMachineByName(name) {
    if (!this.machinesCache) return null;
    const lowerName = name.toLowerCase();
    return this.machinesCache.find(m => 
      m.name && m.name.toLowerCase().includes(lowerName)
    );
  }
  
  /**
   * Obtiene máquinas por estado
   */
  getMachinesByStatus(status) {
    if (!this.machinesCache) return [];
    return this.machinesCache.filter(m => m.status === status);
  }
  
  /**
   * Limpia todo el cache
   */
  clearCache() {
    this.machinesCache = null;
    this.lastFetchTime = null;
    this.employeeMachinesCache.clear();
    console.log('🗑️ [MachineService] Cache limpiado');
    this.notifyListeners('cache-cleared', null);
  }
  
  /**
   * Forza actualización del cache
   */
  async refreshCache() {
    console.log('🔄 [MachineService] Refrescando cache...');
    await this.getAllMachines(true);
  }
  
  /**
   * Obtiene estadísticas del servicio
   */
  getStats() {
    return {
      totalMachines: this.machinesCache ? this.machinesCache.length : 0,
      cachedEmployees: this.employeeMachinesCache.size,
      totalListeners: this.listeners.size,
      lastFetch: this.lastFetchTime ? new Date(this.lastFetchTime).toLocaleTimeString() : 'Nunca',
      cacheAge: this.lastFetchTime ? Date.now() - this.lastFetchTime : null
    };
  }
}

// --- SINGLETON GLOBAL ---
// Exporta una única instancia para toda la aplicación
const machineDataService = new MachineDataService();

// Hacer disponible globalmente para debugging (solo desarrollo)
if (process.env.NODE_ENV === 'development') {
  window.MachineDataService = machineDataService;
}

export default machineDataService;
