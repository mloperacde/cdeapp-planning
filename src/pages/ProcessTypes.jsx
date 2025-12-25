import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ProcessTypes = () => {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProcess, setEditingProcess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'corte',
    time: '',
    machines: '',
    description: '',
    status: 'active'
  });

  // Datos iniciales de ejemplo
  const initialProcesses = [
    {
      id: 1,
      name: "Corte por láser",
      code: "CORTE_LASER",
      category: "corte",
      time: 45,
      machines: "LASER-01, LASER-02, LASER-03",
      description: "Corte de piezas metálicas usando láser de precisión",
      status: "active"
    },
    {
      id: 2,
      name: "Doblado CNC",
      code: "DOBLADO_CNC",
      category: "doblado",
      time: 30,
      machines: "CNC-01, CNC-02, PRENSA-01",
      description: "Doblado de chapas metálicas con control numérico",
      status: "active"
    },
    {
      id: 3,
      name: "Soldadura MIG",
      code: "SOLD_MIG",
      category: "soldadura",
      time: 60,
      machines: "SOLD-01, SOLD-02, ROBOT-01",
      description: "Soldadura por arco metálico con gas inerte",
      status: "active"
    }
  ];

  // Cargar procesos al iniciar
  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = () => {
    setLoading(true);
    
    // Intentar cargar desde localStorage
    const savedProcesses = localStorage.getItem('processTypesMaster');
    
    if (savedProcesses) {
      try {
        setProcesses(JSON.parse(savedProcesses));
      } catch (error) {
        console.error('Error al cargar procesos:', error);
        // Usar datos iniciales
        setProcesses(initialProcesses);
        localStorage.setItem('processTypesMaster', JSON.stringify(initialProcesses));
      }
    } else {
      // Usar datos iniciales
      setProcesses(initialProcesses);
      localStorage.setItem('processTypesMaster', JSON.stringify(initialProcesses));
    }
    
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let updatedProcesses;
    
    if (editingProcess) {
      // Actualizar proceso existente
      updatedProcesses = processes.map(p => 
        p.id === editingProcess.id ? { ...formData, id: editingProcess.id } : p
      );
    } else {
      // Crear nuevo proceso
      const newProcess = {
        ...formData,
        id: processes.length > 0 ? Math.max(...processes.map(p => p.id)) + 1 : 1,
        time: parseInt(formData.time) || 0
      };
      updatedProcesses = [...processes, newProcess];
    }
    
    setProcesses(updatedProcesses);
    localStorage.setItem('processTypesMaster', JSON.stringify(updatedProcesses));
    
    // También guardar en otras claves para compatibilidad
    localStorage.setItem('processTypes', JSON.stringify(updatedProcesses));
    localStorage.setItem('availableProcesses', JSON.stringify(updatedProcesses));
    
    // Resetear formulario
    setFormData({
      name: '',
      code: '',
      category: 'corte',
      time: '',
      machines: '',
      description: '',
      status: 'active'
    });
    setEditingProcess(null);
    setShowForm(false);
  };

  const editProcess = (process) => {
    setFormData({
      name: process.name,
      code: process.code,
      category: process.category,
      time: process.time.toString(),
      machines: process.machines,
      description: process.description || '',
      status: process.status
    });
    setEditingProcess(process);
    setShowForm(true);
  };

  const deleteProcess = (id) => {
    if (window.confirm('¿Está seguro de eliminar este proceso?')) {
      const updatedProcesses = processes.filter(p => p.id !== id);
      setProcesses(updatedProcesses);
      localStorage.setItem('processTypesMaster', JSON.stringify(updatedProcesses));
      localStorage.setItem('processTypes', JSON.stringify(updatedProcesses));
    }
  };

  const scanMachinesForProcesses = () => {
    // Simular escaneo de máquinas
    // En una aplicación real, esto buscaría en la base de datos o localStorage
    const machinesData = localStorage.getItem('machinesData');
    
    let newProcesses = [];
    
    if (machinesData) {
      try {
        const machines = JSON.parse(machinesData);
        // Extraer procesos de las máquinas (simulado)
        machines.forEach((machine, index) => {
          if (machine.processes && Array.isArray(machine.processes)) {
            machine.processes.forEach((proc, procIndex) => {
              newProcesses.push({
                id: processes.length + newProcesses.length + 1,
                name: proc.name || `Proceso ${procIndex + 1} de ${machine.name}`,
                code: proc.code || `${machine.code}_PROC${procIndex + 1}`,
                category: proc.category || 'general',
                time: proc.time || 60,
                machines: machine.name || `Máquina ${index + 1}`,
                description: `Extraído de ${machine.name}`,
                status: 'active'
              });
            });
          }
        });
      } catch (error) {
        console.error('Error al escanear máquinas:', error);
      }
    }
    
    if (newProcesses.length > 0) {
      const updatedProcesses = [...processes, ...newProcesses];
      setProcesses(updatedProcesses);
      localStorage.setItem('processTypesMaster', JSON.stringify(updatedProcesses));
      alert(`Se agregaron ${newProcesses.length} nuevos procesos desde máquinas`);
    } else {
      alert('No se encontraron procesos en las máquinas. Asegúrate de tener máquinas registradas.');
    }
  };

  const exportToJson = () => {
    const dataStr = JSON.stringify(processes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', 'tipos_procesos.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const syncWithOtherPages = () => {
    // Sincronizar con otras páginas
    localStorage.setItem('processTypes', JSON.stringify(processes));
    localStorage.setItem('availableProcesses', JSON.stringify(processes));
    
    alert(`✅ Procesos sincronizados. Ahora ProcessConfiguration puede acceder a ${processes.length} procesos.`);
    
    // Redirigir a ProcessConfiguration
    navigate('/process-configuration');
  };

  // Filtrar procesos por búsqueda
  const filteredProcesses = processes.filter(process =>
    process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    process.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    process.machines.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-blue-900 text-white rounded-xl p-6 mb-6 shadow-lg">
        <h1 className="text-3xl font-bold mb-2">📋 Tipos de Procesos</h1>
        <p className="text-blue-100">
          Tabla maestra de procesos. Centraliza todos los procesos que pueden realizar las máquinas.
        </p>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          {showForm ? '✕ Cancelar' : '+ Agregar Proceso'}
        </button>
        
        <button
          onClick={scanMachinesForProcesses}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          🔍 Escanear Máquinas
        </button>
        
        <button
          onClick={exportToJson}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          📥 Exportar JSON
        </button>
        
        <button
          onClick={syncWithOtherPages}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          🔄 Sincronizar con ProcessConfiguration
        </button>
        
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Buscar procesos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 mb-6 shadow-md border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-800">
            {editingProcess ? '✏️ Editar Proceso' : '➕ Nuevo Proceso'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Proceso *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Corte por láser"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: CORTE_LASER"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="corte">Corte</option>
                  <option value="doblado">Doblado</option>
                  <option value="soldadura">Soldadura</option>
                  <option value="pintura">Pintura</option>
                  <option value="ensamble">Ensamble</option>
                  <option value="control-calidad">Control de Calidad</option>
                  <option value="embalaje">Embalaje</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiempo (minutos) *
                </label>
                <input
                  type="number"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Máquinas Compatibles *
              </label>
              <input
                type="text"
                name="machines"
                value={formData.machines}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Separar con comas. Ej: CNC-01, CNC-02, LASER-01"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descripción detallada del proceso..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
            
            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
              >
                {editingProcess ? 'Actualizar Proceso' : 'Guardar Proceso'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingProcess(null);
                  setFormData({
                    name: '',
                    code: '',
                    category: 'corte',
                    time: '',
                    machines: '',
                    description: '',
                    status: 'active'
                  });
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">Total Procesos</div>
          <div className="text-2xl font-bold text-blue-800">{processes.length}</div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Procesos Activos</div>
          <div className="text-2xl font-bold text-green-800">
            {processes.filter(p => p.status === 'active').length}
          </div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium">Categorías Únicas</div>
          <div className="text-2xl font-bold text-purple-800">
            {[...new Set(processes.map(p => p.category))].length}
          </div>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-sm text-orange-600 font-medium">Mostrando</div>
          <div className="text-2xl font-bold text-orange-800">{filteredProcesses.length}</div>
        </div>
      </div>

      {/* Tabla de procesos */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proceso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tiempo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Máquinas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProcesses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No se encontraron procesos. {searchTerm && 'Intenta con otros términos de búsqueda.'}
                  </td>
                </tr>
              ) : (
                filteredProcesses.map((process) => (
                  <tr key={process.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {process.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{process.name}</div>
                      <div className="text-sm text-gray-500 font-mono">{process.code}</div>
                      {process.description && (
                        <div className="text-xs text-gray-400 mt-1">{process.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {process.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {process.time} min
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{process.machines}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        process.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {process.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => editProcess(process)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteProcess(process.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Información para desarrolladores */}
      <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-3">💻 Para desarrolladores</h3>
        <p className="text-sm text-gray-600 mb-4">
          Otras páginas (ProcessConfiguration, ProductionPlanning) pueden acceder a estos procesos usando:
        </p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
          <code>
            // Obtener todos los procesos<br/>
            const processes = JSON.parse(localStorage.getItem('processTypesMaster'));<br/><br/>
            
            // Obtener procesos activos<br/>
            const activeProcesses = processes.filter(p =&gt; p.status === 'active');<br/><br/>
            
            // Encontrar proceso por código<br/>
            const process = processes.find(p =&gt; p.code === 'CORTE_LASER');
          </code>
        </div>
      </div>
    </div>
  );
};

export default ProcessTypes;