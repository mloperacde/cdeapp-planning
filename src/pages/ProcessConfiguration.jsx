import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from "@/api/base44Client"; // Asegúrate de importar el cliente
import { useQuery } from "@tanstack/react-query"; // Importa React Query

// ============================================
// ICONOS (sin dependencias)
// ============================================
const IconSearch = () => <span className="text-gray-400">🔍</span>;
const IconFilter = () => <span className="text-gray-400">⚡</span>;
const IconPlus = () => <span className="text-gray-400">➕</span>;
const IconTrash = () => <span className="text-gray-400">🗑️</span>;
const IconEdit = () => <span className="text-gray-400">✏️</span>;
const IconSave = () => <span className="text-gray-400">💾</span>;
const IconMenu = () => <span className="text-gray-400">☰</span>;
const IconCheck = () => <span className="text-green-500">✓</span>;
const IconError = () => <span className="text-red-500">✗</span>;
const IconAlert = () => <span className="text-yellow-500">⚠️</span>;
const IconArrowUp = () => <span className="text-gray-400">↑</span>;
const IconArrowDown = () => <span className="text-gray-400">↓</span>;
const IconLoading = () => <span className="animate-spin">↻</span>;

// ============================================
// SERVICIO PARA CARGAR DATOS REALES
// ============================================
const MachineService = {
  // Esta función ahora usa React Query como en MachineMaster
  async getMachines() {
    // Usamos el mismo cliente y método que en MachineMaster
    try {
      const machines = await base44.entities.Machine.list('orden');
      console.log('✅ Máquinas cargadas desde Base44:', machines);
      return machines;
    } catch (error) {
      console.error('❌ Error cargando máquinas desde Base44:', error);
      // Retornar array vacío en caso de error
      return [];
    }
  },

  getProcesses() {
    // Estos procesos podrían también venir de Base44 si los tienes en una entidad
    return [
      { id: "corte", nombre: "Corte preciso", descripcion: "Corte de materiales con tolerancias estrechas" },
      { id: "torneado", nombre: "Torneado externo", descripcion: "Torneado de superficies cilíndricas externas" },
      { id: "torneado-int", nombre: "Torneado interno", descripcion: "Torneado de superficies cilíndricas internas" },
      { id: "fresado", nombre: "Fresado plano", descripcion: "Fresado de superficies planas" },
      { id: "fresado-3d", nombre: "Fresado 3D", descripcion: "Fresado tridimensional complejo" },
      { id: "taladrado", nombre: "Taladrado", descripcion: "Perforación de materiales" },
      { id: "roscado", nombre: "Roscado", descripcion: "Corte de roscas internas y externas" },
      { id: "prensado", nombre: "Prensado", descripcion: "Aplicación de presión para conformado" },
      { id: "doblado", nombre: "Doblado", descripcion: "Doblado de chapas metálicas" },
      { id: "soldadura-mig", nombre: "Soldadura MIG", descripcion: "Soldadura por arco con gas inerte metálico" },
      { id: "soldadura-tig", nombre: "Soldadura TIG", descripcion: "Soldadura por arco con gas inerte de tungsteno" },
      { id: "pulido", nombre: "Pulido", descripcion: "Acabado superficial por pulido" },
      { id: "pintura", nombre: "Pintura", descripcion: "Aplicación de pintura y recubrimientos" },
      { id: "ensamblaje", nombre: "Ensamblaje", descripcion: "Ensamblaje de componentes" },
      { id: "control-calidad", nombre: "Control de Calidad", descripcion: "Verificación de especificaciones" }
    ];
  },

  getProcessTypes() {
    return [
      'Manufactura',
      'Ensamblaje', 
      'Control de Calidad',
      'Embalaje',
      'Logística',
      'Tratamiento Térmico',
      'Acabado Superficial',
      'Pruebas y Verificación',
      'Mantenimiento',
      'Calibración'
    ];
  }
};

// ============================================
// COMPONENTE 1: MachineList (Adaptado para datos reales)
// ============================================
const MachineList = ({ machines, onEdit, onDelete, onUpdate, editingMachine, onMoveUp, onMoveDown }) => {
  return (
    <div className="space-y-3">
      {machines.map((machine, index) => (
        <div key={machine.id}>
          <div
            className={`bg-white border rounded-lg p-4 shadow-sm ${
              machine.estado === 'activa' ? 'border-green-200' :
              machine.estado === 'inactiva' ? 'border-gray-200' :
              'border-yellow-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconMenu />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">{machine.codigo}</span>
                    <span className="font-medium text-gray-900">{machine.nombre}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      machine.estado === 'activa' ? 'bg-green-100 text-green-800' :
                      machine.estado === 'inactiva' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {machine.estado === 'activa' ? 'Activa' :
                       machine.estado === 'inactiva' ? 'Inactiva' : 'Mantenimiento'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Tipo:</span> {machine.tipo || 'Sin tipo'}</p>
                    <p><span className="font-medium">Ubicación:</span> {machine.ubicacion || 'Sin ubicación'}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {/* Los procesos podrían venir de otra entidad en Base44 */}
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {machine.tipo || 'Proceso principal'}
                      </span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        {machine.marca || 'Sin marca'}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                        {machine.modelo || 'Sin modelo'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(machine.id)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title={editingMachine === machine.id ? "Guardar" : "Editar"}
                >
                  {editingMachine === machine.id ? <IconSave /> : <IconEdit />}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('¿Eliminar esta máquina del proceso actual?')) {
                      onDelete(machine.id);
                    }
                  }}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <IconTrash />
                </button>
              </div>
            </div>
            
            {editingMachine === machine.id && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select
                      value={machine.estado || 'activa'}
                      onChange={(e) => onUpdate(machine.id, { estado: e.target.value })}
                      className="border border-gray-300 rounded px-3 py-1 text-sm w-full"
                    >
                      <option value="activa">Activa</option>
                      <option value="inactiva">Inactiva</option>
                      <option value="mantenimiento">Mantenimiento</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proceso Asignado</label>
                    <select
                      value={machine.procesoAsignado || ""}
                      onChange={(e) => onUpdate(machine.id, { 
                        procesoAsignado: e.target.value,
                        procesoActual: e.target.options[e.target.selectedIndex].text
                      })}
                      className="border border-gray-300 rounded px-3 py-1 text-sm w-full"
                    >
                      <option value="">Seleccionar proceso</option>
                      <option value="corte">Corte preciso</option>
                      <option value="ensamblaje">Ensamblaje</option>
                      <option value="empaquetado">Empaquetado</option>
                      <option value="control-calidad">Control de Calidad</option>
                      {/* Agrega más opciones según tus procesos */}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Controles para mover */}
          <div className="flex justify-end gap-2 mt-1">
            {index > 0 && (
              <button
                onClick={() => onMoveUp(index)}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
              >
                <IconArrowUp /> Subir
              </button>
            )}
            {index < machines.length - 1 && (
              <button
                onClick={() => onMoveDown(index)}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
              >
                <IconArrowDown /> Bajar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// COMPONENTE 2: ProcessForm (Mismo)
// ============================================
const ProcessForm = ({
  formData,
  formErrors,
  handleInputChange,
  isSubmitting,
  handleSubmit,
  processTypes,
  availableProcesses
}) => {
  const priorities = [
    { value: 'baja', label: 'Baja', color: 'bg-green-100 text-green-800' },
    { value: 'media', label: 'Media', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'alta', label: 'Alta', color: 'bg-red-100 text-red-800' },
    { value: 'critica', label: 'Crítica', color: 'bg-purple-100 text-purple-800' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nombre del Proceso */}
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Proceso *
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleInputChange}
            placeholder="ej: Línea de envasado primario"
            required
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
              formErrors.nombre ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {formErrors.nombre && (
            <p className="mt-1 text-sm text-red-600">{formErrors.nombre}</p>
          )}
        </div>

        {/* Tipo de Proceso */}
        <div>
          <label htmlFor="tipoProceso" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Proceso *
          </label>
          <select
            id="tipoProceso"
            name="tipoProceso"
            value={formData.tipoProceso}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
              formErrors.tipoProceso ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Seleccionar tipo</option>
            {processTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {formErrors.tipoProceso && (
            <p className="mt-1 text-sm text-red-600">{formErrors.tipoProceso}</p>
          )}
        </div>

        {/* Código del Proceso */}
        <div>
          <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 mb-1">
            Código del Proceso
          </label>
          <input
            type="text"
            id="codigo"
            name="codigo"
            value={formData.codigo}
            onChange={handleInputChange}
            placeholder="ej: PROC-ENV-001"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Duración Estimada */}
        <div>
          <label htmlFor="duracionEstimada" className="block text-sm font-medium text-gray-700 mb-1">
            Duración Estimada (horas)
          </label>
          <input
            type="number"
            id="duracionEstimada"
            name="duracionEstimada"
            value={formData.duracionEstimada}
            onChange={handleInputChange}
            min="0.5"
            step="0.5"
            placeholder="ej: 8.5"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
              formErrors.duracionEstimada ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {formErrors.duracionEstimada && (
            <p className="mt-1 text-sm text-red-600">{formErrors.duracionEstimada}</p>
          )}
        </div>

        {/* Prioridad */}
        <div>
          <label htmlFor="prioridad" className="block text-sm font-medium text-gray-700 mb-1">
            Prioridad
          </label>
          <select
            id="prioridad"
            name="prioridad"
            value={formData.prioridad}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            {priorities.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </div>

        {/* Proceso Específico */}
        <div>
          <label htmlFor="procesoEspecifico" className="block text-sm font-medium text-gray-700 mb-1">
            Proceso Específico
          </label>
          <select
            id="procesoEspecifico"
            name="procesoEspecifico"
            value={formData.procesoEspecifico}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="">Seleccionar proceso específico</option>
            {availableProcesses.map((process) => (
              <option key={process.id} value={process.id}>
                {process.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
          Descripción Detallada *
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          value={formData.descripcion}
          onChange={handleInputChange}
          placeholder="Describa el proceso paso a paso, requisitos, materiales, etc."
          rows="4"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
            formErrors.descripcion ? 'border-red-500' : 'border-gray-300'
          }`}
          required
        />
        {formErrors.descripcion && (
          <p className="mt-1 text-sm text-red-600">{formErrors.descripcion}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          {formData.descripcion.length}/1000 caracteres
        </p>
      </div>

      {/* Botón de envío */}
      <div className="pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            isSubmitting
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white flex items-center justify-center gap-2`}
        >
          {isSubmitting ? (
            <>
              <IconLoading />
              Guardando Proceso...
            </>
          ) : (
            'Guardar Configuración del Proceso'
          )}
        </button>
      </div>
    </form>
  );
};

// ============================================
// COMPONENTE 3: ValidationMessages
// ============================================
const ValidationMessages = ({ submitError, submitSuccess, formErrors, isLoading, machinesCount }) => {
  const hasErrors = Object.keys(formErrors).length > 0;

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
          <IconLoading />
          <span>Cargando máquinas desde el archivo maestro...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-6">
      {/* Error de envío */}
      {submitError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <IconError />
          <span>{submitError}</span>
        </div>
      )}

      {/* Éxito de envío */}
      {submitSuccess && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <IconCheck />
          <span>¡Proceso guardado exitosamente!</span>
        </div>
      )}

      {/* Errores de validación */}
      {hasErrors && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <IconAlert />
            <span className="font-medium">Corrige los siguientes errores:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 ml-6">
            {Object.entries(formErrors).map(([field, error]) => (
              <li key={field} className="text-sm">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Información de máquinas cargadas */}
      {!isLoading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-2">
            <IconCheck />
            <span>
              <strong>{machinesCount} máquinas</strong> cargadas desde el archivo maestro
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// DATOS INICIALES DEL FORMULARIO
// ============================================
const initialFormData = {
  codigo: '',
  nombre: '',
  descripcion: '',
  tipoProceso: '',
  procesoEspecifico: '',
  duracionEstimada: '',
  prioridad: 'media',
  departamento: 'Manufactura',
  responsable: '',
  materiales: '',
  recursosNecesarios: '',
  instruccionesEspeciales: '',
  version: '1.0'
};

// ============================================
// HOOKS PERSONALIZADOS
// ============================================

// Hook para manejo de formulario
const useProcessForm = (initialData) => {
  const [formData, setFormData] = useState(initialData);
  const [formErrors, setFormErrors] = useState({});

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [formErrors]);

  const validateForm = useCallback(() => {
    const errors = {};
    
    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre del proceso es requerido';
    } else if (formData.nombre.length < 3) {
      errors.nombre = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData.tipoProceso) {
      errors.tipoProceso = 'Debe seleccionar un tipo de proceso';
    }

    if (!formData.descripcion.trim()) {
      errors.descripcion = 'La descripción es requerida';
    } else if (formData.descripcion.length < 10) {
      errors.descripcion = 'La descripción debe tener al menos 10 caracteres';
    }

    if (formData.duracionEstimada && isNaN(parseFloat(formData.duracionEstimada))) {
      errors.duracionEstimada = 'La duración debe ser un número válido';
    } else if (formData.duracionEstimada && parseFloat(formData.duracionEstimada) <= 0) {
      errors.duracionEstimada = 'La duración debe ser mayor a 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData(initialData);
    setFormErrors({});
  }, [initialData]);

  return {
    formData,
    formErrors,
    handleInputChange,
    validateForm,
    resetForm,
    setFormData
  };
};

// Hook para manejo de máquinas (USANDO REACT QUERY COMO EN MACHINEMASTER)
const useMachines = () => {
  // Usamos el mismo hook useQuery que en MachineMaster
  const { data: machines = [], isLoading } = useQuery({
    queryKey: ['machines', 'process-config'],
    queryFn: () => base44.entities.Machine.list('orden'),
    staleTime: 5 * 60 * 1000,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('orden');
  const [editingMachine, setEditingMachine] = useState(null);
  const [newMachineName, setNewMachineName] = useState('');

  // Filtrar y ordenar máquinas
  const filteredAndSortedMachines = useMemo(() => {
    let filtered = machines.filter(machine => {
      const matchesSearch = 
        machine.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.tipo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.ubicacion?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || machine.estado === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Ordenar
    return filtered.sort((a, b) => {
      if (sortBy === 'nombre') return (a.nombre || '').localeCompare(b.nombre || '');
      if (sortBy === 'codigo') return (a.codigo || '').localeCompare(b.codigo || '');
      if (sortBy === 'estado') return (a.estado || '').localeCompare(b.estado || '');
      return (a.orden || 0) - (b.orden || 0);
    });
  }, [machines, searchTerm, statusFilter, sortBy]);

  const moveMachineUp = useCallback((index) => {
    // Esta función ahora solo afecta el orden local, no el maestro
    if (index <= 0) return;
    
    const newMachines = [...filteredAndSortedMachines];
    const temp = newMachines[index];
    newMachines[index] = newMachines[index - 1];
    newMachines[index - 1] = temp;
    
    // Actualizar órdenes locales para visualización
    const updatedMachines = newMachines.map((machine, idx) => ({
      ...machine,
      ordenLocal: idx + 1 // Usamos un campo diferente para no modificar el orden maestro
    }));
    
    // Aquí normalmente guardarías en Base44 si quieres persistir el orden
    console.log('Orden local actualizado:', updatedMachines);
  }, [filteredAndSortedMachines]);

  const moveMachineDown = useCallback((index) => {
    if (index >= filteredAndSortedMachines.length - 1) return;
    
    const newMachines = [...filteredAndSortedMachines];
    const temp = newMachines[index];
    newMachines[index] = newMachines[index + 1];
    newMachines[index + 1] = temp;
    
    const updatedMachines = newMachines.map((machine, idx) => ({
      ...machine,
      ordenLocal: idx + 1
    }));
    
    console.log('Orden local actualizado:', updatedMachines);
  }, [filteredAndSortedMachines]);

  const addMachine = useCallback(() => {
    // Esta función podría crear una máquina temporal para el proceso
    if (!newMachineName.trim()) {
      alert('Por favor ingrese el nombre de la máquina');
      return;
    }

    const newMachine = {
      id: `temp-${Date.now()}`,
      codigo: `TEMP-${Date.now().toString().slice(-4)}`,
      nombre: newMachineName,
      tipo: 'Temporal',
      ubicacion: 'Por asignar',
      estado: 'activa',
      ordenLocal: filteredAndSortedMachines.length + 1
    };

    console.log('Máquina temporal añadida:', newMachine);
    setNewMachineName('');
    
    // Mostrar mensaje
    alert('Máquina temporal añadida. Para añadir al archivo maestro, use la página de Máquinas.');
  }, [newMachineName, filteredAndSortedMachines.length]);

  const deleteMachine = useCallback((id) => {
    // Solo elimina del contexto local del proceso
    console.log('Eliminando máquina del proceso (solo local):', id);
  }, []);

  const updateMachine = useCallback((id, updates) => {
    // Solo actualiza en el contexto local del proceso
    console.log('Actualizando máquina en proceso (solo local):', id, updates);
  }, []);

  return {
    machines,
    filteredAndSortedMachines,
    isLoading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    editingMachine,
    setEditingMachine,
    newMachineName,
    setNewMachineName,
    moveMachineUp,
    moveMachineDown,
    addMachine,
    deleteMachine,
    updateMachine
  };
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
const ProcessConfigurationPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Cargar tipos de procesos y procesos disponibles
  const [processTypes, setProcessTypes] = useState([]);
  const [availableProcesses, setAvailableProcesses] = useState([]);

  useEffect(() => {
    setProcessTypes(MachineService.getProcessTypes());
    setAvailableProcesses(MachineService.getProcesses());
  }, []);

  // Usar nuestros hooks personalizados
  const {
    formData,
    formErrors,
    handleInputChange,
    validateForm,
    resetForm
  } = useProcessForm(initialFormData);

  const {
    machines,
    filteredAndSortedMachines,
    isLoading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    editingMachine,
    setEditingMachine,
    newMachineName,
    setNewMachineName,
    moveMachineUp,
    moveMachineDown,
    addMachine,
    deleteMachine,
    updateMachine
  } = useMachines();

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulación de llamada a API
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Preparar datos para envío
      const processData = {
        ...formData,
        maquinas: filteredAndSortedMachines.map(m => ({
          id: m.id,
          codigo: m.codigo,
          nombre: m.nombre,
          tipo: m.tipo,
          ubicacion: m.ubicacion,
          orden: m.ordenLocal || m.orden,
          procesoAsignado: m.procesoAsignado || m.tipo || 'Principal'
        })),
        totalMaquinas: filteredAndSortedMachines.length,
        fechaCreacion: new Date().toISOString(),
        creadoPor: 'Usuario Actual'
      };

      console.log('✅ Proceso guardado con máquinas reales:', processData);
      
      // Aquí podrías guardar en Base44 usando:
      // await base44.entities.ProcessConfiguration.create(processData);
      
      setSubmitSuccess(true);
      resetForm();
      
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      setSubmitError('Error al guardar el proceso. Por favor, intente nuevamente.');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resetear todo
  const handleReset = () => {
    if (window.confirm('¿Está seguro de que desea resetear todos los datos?')) {
      resetForm();
      setSearchTerm('');
      setStatusFilter('all');
      setSortBy('orden');
      setSubmitError('');
      setSubmitSuccess(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configuración de Procesos de Producción</h1>
          <p className="text-gray-600 mt-2">
            Configure procesos usando el archivo maestro de máquinas ({machines.length} máquinas disponibles)
          </p>
        </div>

        {/* Mensajes de estado */}
        <ValidationMessages
          submitError={submitError}
          submitSuccess={submitSuccess}
          formErrors={formErrors}
          isLoading={isLoading}
          machinesCount={machines.length}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna izquierda: Formulario de proceso */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Información del Proceso</h2>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Limpiar formulario
                </button>
              </div>

              <ProcessForm
                formData={formData}
                formErrors={formErrors}
                handleInputChange={handleInputChange}
                isSubmitting={isSubmitting}
                handleSubmit={handleSubmit}
                processTypes={processTypes}
                availableProcesses={availableProcesses}
              />
            </div>

            {/* Estadísticas */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen del Proceso</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Máquinas en Proceso</p>
                  <p className="text-xl font-bold text-blue-700">{filteredAndSortedMachines.length}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Disponibles</p>
                  <p className="text-xl font-bold text-green-700">{machines.length}</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-600 font-medium">Filtradas</p>
                  <p className="text-xl font-bold text-yellow-700">
                    {filteredAndSortedMachines.length}
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Tipos Únicos</p>
                  <p className="text-xl font-bold text-purple-700">
                    {[...new Set(machines.map(m => m.tipo).filter(Boolean))].length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha: Lista de máquinas */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Máquinas Asignadas al Proceso</h2>
              
              {/* Buscador y filtros */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <IconSearch />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar máquinas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  />
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Todos</option>
                    <option value="activa">Activas</option>
                    <option value="inactiva">Inactivas</option>
                    <option value="mantenimiento">Mantenimiento</option>
                  </select>
                  
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="orden">Orden</option>
                    <option value="nombre">Nombre</option>
                    <option value="codigo">Código</option>
                    <option value="tipo">Tipo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Información del origen de datos */}
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 flex items-center gap-2">
                <IconCheck />
                <span>
                  <strong>Conexión exitosa:</strong> Mostrando {filteredAndSortedMachines.length} de {machines.length} máquinas del archivo maestro
                </span>
              </p>
            </div>

            {/* Lista de máquinas */}
            <div className="mb-4">
              {filteredAndSortedMachines.length > 0 ? (
                <>
                  <MachineList
                    machines={filteredAndSortedMachines}
                    onEdit={setEditingMachine}
                    onDelete={deleteMachine}
                    onUpdate={updateMachine}
                    editingMachine={editingMachine}
                    onMoveUp={moveMachineUp}
                    onMoveDown={moveMachineDown}
                  />
                  
                  <div className="mt-4 text-sm text-gray-500">
                    <p className="flex items-center gap-2">
                      <span>💡</span>
                      <span>
                        <strong>Nota:</strong> Los cambios en el orden se aplican solo a este proceso
                      </span>
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 mb-4">
                    <IconFilter />
                  </div>
                  <p className="text-gray-500 mb-2">
                    {isLoading ? 'Cargando máquinas...' : 'No hay máquinas que coincidan con los filtros'}
                  </p>
                  {!isLoading && machines.length > 0 && (
                    <p className="text-sm text-gray-400">
                      Hay {machines.length} máquinas en el sistema. Prueba con otros filtros.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="mt-6 text-sm text-gray-500">
          <p><span role="img" aria-label="info">ℹ️</span> 
            <strong>Origen de datos:</strong> Las máquinas se cargan desde el archivo maestro (Base44). 
            Para modificar máquinas permanentemente, use la página "Archivo Maestro de Máquinas".
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProcessConfigurationPage;