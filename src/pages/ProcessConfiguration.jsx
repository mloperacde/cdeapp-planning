import React, { useState, useEffect, useCallback } from 'react';

// ============================================
// COMPONENTES DE ICONOS SIMPLES (sin dependencias)
// ============================================
const IconSearch = () => <span className="text-gray-400">🔍</span>;
const IconFilter = () => <span className="text-gray-400">⚡</span>;
const IconPlus = () => <span className="text-gray-400">➕</span>;
const IconTrash = () => <span className="text-gray-400">🗑️</span>;
const IconEdit = () => <span className="text-gray-400">✏️</span>;
const IconSave = () => <span className="text-gray-400">💾</span>;
const IconClose = () => <span className="text-gray-400">✕</span>;
const IconMenu = () => <span className="text-gray-400">☰</span>;
const IconCheck = () => <span className="text-green-500">✓</span>;
const IconError = () => <span className="text-red-500">✗</span>;
const IconAlert = () => <span className="text-yellow-500">⚠️</span>;
const IconArrowUp = () => <span className="text-gray-400">↑</span>;
const IconArrowDown = () => <span className="text-gray-400">↓</span>;

// ============================================
// COMPONENTE 1: MachineList
// ============================================
const MachineList = ({ machines, onEdit, onDelete, onUpdate, editingMachine, onMoveUp, onMoveDown }) => {
  return (
    <div className="space-y-3">
      {machines.map((machine, index) => (
        <div key={machine.id}>
          <div
            className={`bg-white border rounded-lg p-4 shadow-sm ${
              machine.status === 'active' ? 'border-green-200' :
              machine.status === 'inactive' ? 'border-gray-200' :
              'border-yellow-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconMenu />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {editingMachine === machine.id ? (
                        <input
                          type="text"
                          value={machine.name}
                          onChange={(e) => onUpdate(machine.id, { name: e.target.value })}
                          className="border-b border-gray-300 focus:border-blue-500 focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        machine.name
                      )}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      machine.status === 'active' ? 'bg-green-100 text-green-800' :
                      machine.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {machine.status === 'active' ? 'Activa' :
                       machine.status === 'inactive' ? 'Inactiva' : 'Mantenimiento'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{machine.process}</p>
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
                    if (window.confirm('¿Eliminar esta máquina?')) {
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
                  <select
                    value={machine.status}
                    onChange={(e) => onUpdate(machine.id, { status: e.target.value })}
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                  >
                    <option value="active">Activa</option>
                    <option value="inactive">Inactiva</option>
                    <option value="maintenance">Mantenimiento</option>
                  </select>
                  <select
                    value={machine.process}
                    onChange={(e) => onUpdate(machine.id, { process: e.target.value })}
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                  >
                    <option value="Corte">Corte</option>
                    <option value="Fresado">Fresado</option>
                    <option value="Torneado">Torneado</option>
                    <option value="Soldadura">Soldadura</option>
                    <option value="Sin asignar">Sin asignar</option>
                  </select>
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
// COMPONENTE 2: ProcessForm
// ============================================
const ProcessForm = ({
  formData,
  formErrors,
  handleInputChange,
  isSubmitting,
  handleSubmit
}) => {
  const processTypes = [
    'Manufactura',
    'Ensamblaje', 
    'Control de Calidad',
    'Embalaje',
    'Logística'
  ];

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
            placeholder="ej: Ensamblaje"
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
            min="1"
            placeholder="ej: 8"
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
      </div>

      {/* Descripción */}
      <div>
        <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
          Descripción
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          value={formData.descripcion}
          onChange={handleInputChange}
          placeholder="Describe el proceso, requisitos especiales, etc."
          rows="3"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
            formErrors.descripcion ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {formErrors.descripcion && (
          <p className="mt-1 text-sm text-red-600">{formErrors.descripcion}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          {formData.descripcion.length}/500 caracteres
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
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Guardando...
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
const ValidationMessages = ({ submitError, submitSuccess, formErrors }) => {
  const hasErrors = Object.keys(formErrors).length > 0;

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
    </div>
  );
};

// ============================================
// DATOS INICIALES
// ============================================
const initialFormData = {
  nombre: '',
  descripcion: '',
  tipoProceso: '',
  duracionEstimada: '',
  prioridad: 'media',
  departamento: '',
  responsables: '',
  recursosNecesarios: '',
  observaciones: ''
};

const initialMachines = [
  { id: 1, name: 'Cortadora CNC', status: 'active', process: 'Corte', order: 1 },
  { id: 2, name: 'Fresadora', status: 'active', process: 'Fresado', order: 2 },
  { id: 3, name: 'Torno', status: 'inactive', process: 'Torneado', order: 3 },
  { id: 4, name: 'Prensa', status: 'maintenance', process: 'Prensado', order: 4 },
  { id: 5, name: 'Soldadora', status: 'active', process: 'Soldadura', order: 5 },
];

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
    // Limpiar error cuando el usuario empieza a escribir
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

    if (formData.duracionEstimada && isNaN(parseInt(formData.duracionEstimada))) {
      errors.duracionEstimada = 'La duración debe ser un número válido';
    }

    if (formData.descripcion && formData.descripcion.length > 500) {
      errors.descripcion = 'La descripción no puede exceder los 500 caracteres';
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

// Hook para manejo de máquinas
const useMachines = (initialMachinesList) => {
  const [machines, setMachines] = useState(initialMachinesList);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('order');
  const [editingMachine, setEditingMachine] = useState(null);
  const [newMachineName, setNewMachineName] = useState('');

  // Filtrar y ordenar máquinas
  const filteredAndSortedMachines = React.useMemo(() => {
    let filtered = machines.filter(machine => {
      const matchesSearch = machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           machine.process.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || machine.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Ordenar
    return filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return a.order - b.order;
    });
  }, [machines, searchTerm, statusFilter, sortBy]);

  // Función para mover máquina hacia arriba
  const moveMachineUp = useCallback((index) => {
    if (index <= 0) return;
    
    const newMachines = [...machines];
    const temp = newMachines[index];
    newMachines[index] = newMachines[index - 1];
    newMachines[index - 1] = temp;
    
    // Actualizar órdenes
    const updatedMachines = newMachines.map((machine, idx) => ({
      ...machine,
      order: idx + 1
    }));
    
    setMachines(updatedMachines);
  }, [machines]);

  // Función para mover máquina hacia abajo
  const moveMachineDown = useCallback((index) => {
    if (index >= machines.length - 1) return;
    
    const newMachines = [...machines];
    const temp = newMachines[index];
    newMachines[index] = newMachines[index + 1];
    newMachines[index + 1] = temp;
    
    // Actualizar órdenes
    const updatedMachines = newMachines.map((machine, idx) => ({
      ...machine,
      order: idx + 1
    }));
    
    setMachines(updatedMachines);
  }, [machines]);

  const addMachine = useCallback(() => {
    if (!newMachineName.trim()) return;

    const newMachine = {
      id: Date.now(),
      name: newMachineName,
      status: 'active',
      process: 'Sin asignar',
      order: machines.length + 1
    };

    setMachines(prev => [...prev, newMachine]);
    setNewMachineName('');
  }, [newMachineName, machines.length]);

  const deleteMachine = useCallback((id) => {
    setMachines(prev => prev.filter(machine => machine.id !== id));
  }, []);

  const updateMachine = useCallback((id, updates) => {
    setMachines(prev => prev.map(machine =>
      machine.id === id ? { ...machine, ...updates } : machine
    ));
  }, []);

  return {
    machines,
    filteredAndSortedMachines,
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
  } = useMachines(initialMachines);

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
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Preparar datos para envío
      const processData = {
        ...formData,
        machines: machines.map(m => ({
          id: m.id,
          name: m.name,
          order: m.order
        })),
        totalMachines: machines.length,
        createdAt: new Date().toISOString()
      };

      console.log('Proceso guardado:', processData);
      
      setSubmitSuccess(true);
      resetForm();
      
      // Limpiar mensaje de éxito después de 3 segundos
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
      setSortBy('order');
      setSubmitError('');
      setSubmitSuccess(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configuración de Procesos</h1>
          <p className="text-gray-600 mt-2">
            Configure y administre los procesos de producción y las máquinas asignadas
          </p>
        </div>

        {/* Mensajes de estado */}
        <ValidationMessages
          submitError={submitError}
          submitSuccess={submitSuccess}
          formErrors={formErrors}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna izquierda: Formulario */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Información del Proceso</h2>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Limpiar todo
                </button>
              </div>

              <ProcessForm
                formData={formData}
                formErrors={formErrors}
                handleInputChange={handleInputChange}
                isSubmitting={isSubmitting}
                handleSubmit={handleSubmit}
              />
            </div>

            {/* Estadísticas */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Total Máquinas</p>
                  <p className="text-2xl font-bold text-blue-700">{machines.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Activas</p>
                  <p className="text-2xl font-bold text-green-700">
                    {machines.filter(m => m.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha: Lista de máquinas */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Máquinas Asignadas</h2>
              
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
                    <option value="active">Activas</option>
                    <option value="inactive">Inactivas</option>
                    <option value="maintenance">Mantenimiento</option>
                  </select>
                  
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="order">Orden</option>
                    <option value="name">Nombre</option>
                    <option value="status">Estado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Agregar nueva máquina */}
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="Nombre de nueva máquina..."
                value={newMachineName}
                onChange={(e) => setNewMachineName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addMachine()}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={addMachine}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <IconPlus /> Agregar
              </button>
            </div>

            {/* Lista de máquinas */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">
                <IconAlert /> Use los botones "Subir" y "Bajar" para reordenar
              </p>
              
              <MachineList
                machines={filteredAndSortedMachines}
                onEdit={setEditingMachine}
                onDelete={deleteMachine}
                onUpdate={updateMachine}
                editingMachine={editingMachine}
                onMoveUp={moveMachineUp}
                onMoveDown={moveMachineDown}
              />
            </div>

            {/* Mensaje si no hay máquinas */}
            {filteredAndSortedMachines.length === 0 && (
              <div className="text-center py-8">
                <IconFilter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No se encontraron máquinas con los filtros aplicados</p>
              </div>
            )}
          </div>
        </div>

        {/* Nota informativa */}
        <div className="mt-6 text-sm text-gray-500">
          <p><span role="img" aria-label="idea">💡</span> <strong>Nota:</strong> Use los botones "Subir" y "Bajar" para reorganizar el orden de producción.</p>
        </div>
      </div>
    </div>
  );
};

export default ProcessConfigurationPage;