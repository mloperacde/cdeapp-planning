<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tipos de Procesos - Tabla Maestra</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        body {
            background-color: #f5f7fa;
            color: #333;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            background: linear-gradient(135deg, #2c3e50, #4a6491);
            color: white;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 25px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .header h1 {
            font-size: 2.2rem;
            margin-bottom: 10px;
        }

        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }

        .controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            flex-wrap: wrap;
            gap: 15px;
        }

        .btn {
            padding: 12px 25px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
            font-size: 1rem;
        }

        .btn-primary {
            background-color: #3498db;
            color: white;
        }

        .btn-primary:hover {
            background-color: #2980b9;
        }

        .btn-success {
            background-color: #2ecc71;
            color: white;
        }

        .btn-success:hover {
            background-color: #27ae60;
        }

        .btn-warning {
            background-color: #f39c12;
            color: white;
        }

        .btn-warning:hover {
            background-color: #d68910;
        }

        .info-panel {
            background-color: #e8f4fc;
            border-left: 5px solid #3498db;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
        }

        .info-panel h3 {
            color: #2c3e50;
            margin-bottom: 10px;
        }

        .table-container {
            background-color: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.08);
            overflow-x: auto;
            margin-bottom: 30px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            min-width: 1000px;
        }

        th {
            background-color: #f8f9fa;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            color: #2c3e50;
            border-bottom: 2px solid #dee2e6;
        }

        td {
            padding: 15px;
            border-bottom: 1px solid #eee;
            vertical-align: top;
        }

        tr:hover {
            background-color: #f9f9f9;
        }

        .status {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
        }

        .status-active {
            background-color: #d4edda;
            color: #155724;
        }

        .status-inactive {
            background-color: #f8d7da;
            color: #721c24;
        }

        .actions {
            display: flex;
            gap: 10px;
        }

        .actions button {
            padding: 6px 12px;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            font-size: 0.9rem;
        }

        .actions .edit-btn {
            background-color: #f39c12;
            color: white;
        }

        .actions .delete-btn {
            background-color: #e74c3c;
            color: white;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #7f8c8d;
        }

        .error {
            background-color: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
        }

        .success {
            background-color: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
        }

        .footer-info {
            background-color: white;
            padding: 20px;
            border-radius: 10px;
            margin-top: 30px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.08);
        }

        .api-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-top: 10px;
            border-left: 4px solid #3498db;
            font-family: monospace;
            font-size: 0.9rem;
        }

        @media (max-width: 768px) {
            .controls {
                flex-direction: column;
                align-items: flex-start;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔄 Tipos de Procesos - Tabla Maestra</h1>
            <p>Esta tabla centraliza todos los tipos de procesos extraídos de las fichas de máquinas</p>
        </div>

        <div class="info-panel">
            <h3>ℹ️ ¿Cómo funciona?</h3>
            <p>Esta página busca automáticamente los procesos definidos en las fichas de máquinas y los centraliza aquí. ProcessConfiguration y otras páginas pueden consultar esta tabla para tener acceso a todos los procesos disponibles.</p>
        </div>

        <div class="controls">
            <div>
                <button class="btn btn-primary" id="scanMachinesBtn">
                    🔍 Escanear Máquinas para Procesos
                </button>
                <button class="btn btn-success" id="refreshBtn">
                    ↻ Actualizar Tabla
                </button>
            </div>
            <div>
                <button class="btn btn-warning" id="syncConfigBtn">
                    🔄 Sincronizar con ProcessConfiguration
                </button>
            </div>
        </div>

        <div id="messageContainer"></div>

        <div class="table-container">
            <table id="processesTable">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre del Proceso</th>
                        <th>Código</th>
                        <th>Máquinas Asociadas</th>
                        <th>Tiempo Estimado</th>
                        <th>Categoría</th>
                        <th>Fuente</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="processesBody">
                    <tr>
                        <td colspan="9" class="loading">
                            <div>Escaneando procesos desde las máquinas...</div>
                            <div id="loadingMessage">Buscando datos en localStorage...</div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="footer-info">
            <h3>📚 Para ProcessConfiguration:</h3>
            <p>Para usar estos procesos en ProcessConfiguration, pega este código:</p>
            <div class="api-info">
                // En ProcessConfiguration.js o script similar<br>
                function loadProcessesFromMaster() {<br>
                &nbsp;&nbsp;const processTypes = JSON.parse(localStorage.getItem('processTypesMaster')) || [];<br>
                &nbsp;&nbsp;const processSelect = document.getElementById('processSelect');<br>
                &nbsp;&nbsp;if (processSelect) {<br>
                &nbsp;&nbsp;&nbsp;&nbsp;processTypes.forEach(process => {<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const option = document.createElement('option');<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;option.value = process.id;<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;option.textContent = `${process.name} (${process.code})`;<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;processSelect.appendChild(option);<br>
                &nbsp;&nbsp;&nbsp;&nbsp;});<br>
                &nbsp;&nbsp;}<br>
                }<br>
                <br>
                // Llamar cuando cargue la página<br>
                document.addEventListener('DOMContentLoaded', loadProcessesFromMaster);
            </div>
        </div>
    </div>

    <script>
        // Elementos DOM
        const processesBody = document.getElementById('processesBody');
        const scanMachinesBtn = document.getElementById('scanMachinesBtn');
        const refreshBtn = document.getElementById('refreshBtn');
        const syncConfigBtn = document.getElementById('syncConfigBtn');
        const messageContainer = document.getElementById('messageContainer');
        const loadingMessage = document.getElementById('loadingMessage');

        // Clave para almacenamiento
        const STORAGE_KEY = 'processTypesMaster';
        const MACHINES_STORAGE_KEY = 'machinesData';

        // Datos de ejemplo por si no hay máquinas registradas
        const sampleProcesses = [
            {
                id: 1,
                name: "Corte por láser",
                code: "CORTE_LASER",
                machines: "Láser-01, Láser-02",
                time: "45 min",
                category: "Corte",
                source: "Máquina: Láser-01",
                status: "active"
            },
            {
                id: 2,
                name: "Fresado CNC",
                code: "FRESADO_CNC",
                machines: "CNC-01, CNC-02",
                time: "120 min",
                category: "Mecanizado",
                source: "Máquina: CNC-01",
                status: "active"
            },
            {
                id: 3,
                name: "Impresión 3D",
                code: "IMPRESION_3D",
                machines: "3D-Printer-01",
                time: "180 min",
                category: "Prototipado",
                source: "Máquina: 3D-Printer-01",
                status: "active"
            }
        ];

        // Escanear máquinas para extraer procesos
        function scanMachinesForProcesses() {
            showMessage("🔍 Escaneando máquinas en busca de procesos...", "info");
            
            // Intentar obtener datos de máquinas desde localStorage
            let machinesData = [];
            try {
                machinesData = JSON.parse(localStorage.getItem(MACHINES_STORAGE_KEY)) || [];
                loadingMessage.textContent = `Encontradas ${machinesData.length} máquina(s) en el sistema`;
            } catch (e) {
                console.error("Error al leer máquinas:", e);
            }

            // Si no hay máquinas, buscar en otras claves comunes
            if (machinesData.length === 0) {
                // Buscar en otras posibles claves de almacenamiento
                const possibleKeys = ['machines', 'equipmentList', 'productionMachines', 'maquinas'];
                for (const key of possibleKeys) {
                    const data = localStorage.getItem(key);
                    if (data) {
                        try {
                            machinesData = JSON.parse(data);
                            loadingMessage.textContent = `Encontradas ${machinesData.length} máquina(s) en clave: ${key}`;
                            break;
                        } catch (e) {
                            console.error(`Error al parsear ${key}:`, e);
                        }
                    }
                }
            }

            let extractedProcesses = [];
            
            if (machinesData.length > 0) {
                // Extraer procesos de cada máquina
                machinesData.forEach((machine, index) => {
                    const machineName = machine.name || machine.nombre || `Máquina-${index + 1}`;
                    const machineId = machine.id || machine.codigo || `MACH-${index + 1}`;
                    
                    // Buscar procesos en la máquina (diferentes estructuras posibles)
                    let machineProcesses = [];
                    
                    if (machine.processes && Array.isArray(machine.processes)) {
                        machineProcesses = machine.processes;
                    } else if (machine.procesos && Array.isArray(machine.procesos)) {
                        machineProcesses = machine.procesos;
                    } else if (machine.capabilities && Array.isArray(machine.capabilities)) {
                        machineProcesses = machine.capabilities;
                    } else if (machine.operaciones && Array.isArray(machine.operaciones)) {
                        machineProcesses = machine.operaciones;
                    }
                    
                    // Procesar cada proceso encontrado
                    machineProcesses.forEach((proc, procIndex) => {
                        const processName = proc.name || proc.nombre || `Proceso ${procIndex + 1}`;
                        const processCode = proc.code || proc.codigo || `${machineId}_PROC${procIndex + 1}`;
                        const processTime = proc.time || proc.tiempo || proc.duracion || "60 min";
                        const processCategory = proc.category || proc.categoria || "General";
                        
                        // Crear objeto de proceso estandarizado
                        extractedProcesses.push({
                            id: extractedProcesses.length + 1,
                            name: processName,
                            code: processCode,
                            machines: machineName,
                            time: processTime,
                            category: processCategory,
                            source: `Máquina: ${machineName}`,
                            status: "active",
                            originalMachineId: machineId
                        });
                    });
                });
                
                showMessage(`✅ Extraídos ${extractedProcesses.length} procesos de ${machinesData.length} máquina(s)`, "success");
            } else {
                // Usar datos de ejemplo si no hay máquinas
                showMessage("⚠️ No se encontraron máquinas. Usando datos de ejemplo.", "warning");
                extractedProcesses = sampleProcesses;
            }
            
            // Guardar procesos en localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(extractedProcesses));
            
            // Mostrar en tabla
            renderProcessesTable(extractedProcesses);
        }

        // Renderizar tabla de procesos
        function renderProcessesTable(processes) {
            if (processes.length === 0) {
                processesBody.innerHTML = `
                    <tr>
                        <td colspan="9" class="loading">
                            No se encontraron procesos. Haz clic en "Escanear Máquinas"
                        </td>
                    </tr>
                `;
                return;
            }
            
            let tableHTML = '';
            
            processes.forEach(process => {
                tableHTML += `
                    <tr>
                        <td>${process.id}</td>
                        <td><strong>${process.name}</strong></td>
                        <td><code>${process.code}</code></td>
                        <td>${process.machines}</td>
                        <td>${process.time}</td>
                        <td>${process.category}</td>
                        <td><small>${process.source}</small></td>
                        <td><span class="status status-${process.status}">
                            ${process.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span></td>
                        <td class="actions">
                            <button class="edit-btn" onclick="editProcess(${process.id})">Editar</button>
                            <button class="delete-btn" onclick="deleteProcess(${process.id})">Eliminar</button>
                        </td>
                    </tr>
                `;
            });
            
            processesBody.innerHTML = tableHTML;
        }

        // Mostrar mensajes
        function showMessage(text, type = "info") {
            const messageDiv = document.createElement('div');
            messageDiv.className = type === 'error' ? 'error' : 
                                 type === 'success' ? 'success' : 'info-panel';
            messageDiv.innerHTML = text;
            
            messageContainer.innerHTML = '';
            messageContainer.appendChild(messageDiv);
            
            // Auto-eliminar después de 5 segundos
            if (type === 'success' || type === 'error') {
                setTimeout(() => {
                    messageDiv.remove();
                }, 5000);
            }
        }

        // Editar proceso
        window.editProcess = function(id) {
            const processes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
            const process = processes.find(p => p.id === id);
            
            if (process) {
                const newName = prompt("Nuevo nombre del proceso:", process.name);
                if (newName && newName.trim() !== '') {
                    process.name = newName.trim();
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(processes));
                    renderProcessesTable(processes);
                    showMessage("✅ Proceso actualizado correctamente", "success");
                }
            }
        };

        // Eliminar proceso
        window.deleteProcess = function(id) {
            if (confirm("¿Está seguro de eliminar este proceso?")) {
                let processes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
                processes = processes.filter(p => p.id !== id);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(processes));
                renderProcessesTable(processes);
                showMessage("✅ Proceso eliminado correctamente", "success");
            }
        };

        // Sincronizar con ProcessConfiguration
        function syncWithProcessConfiguration() {
            const processes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
            
            // Guardar también en la clave que ProcessConfiguration espera
            localStorage.setItem('processTypes', JSON.stringify(processes));
            localStorage.setItem('availableProcesses', JSON.stringify(processes));
            
            showMessage("✅ Procesos sincronizados con ProcessConfiguration", "success");
            
            // Mostrar código de ejemplo para ProcessConfiguration
            const exampleCode = `
// En ProcessConfiguration.html, agregar este código:
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const processes = JSON.parse(localStorage.getItem('processTypes')) || [];
        const select = document.querySelector('#processSelect, select[name="process"], .process-select');
        
        if (select) {
            processes.forEach(process => {
                const option = document.createElement('option');
                option.value = process.code;
                option.textContent = \`\${process.name} (\${process.code})\`;
                select.appendChild(option);
            });
        }
    });
<\/script>
            `;
            
            alert("Procesos sincronizados. Pega este código en ProcessConfiguration:\n\n" + exampleCode);
        }

        // Cargar datos al iniciar
        function loadInitialData() {
            loadingMessage.textContent = "Cargando datos existentes...";
            
            // Intentar cargar procesos guardados
            const savedProcesses = JSON.parse(localStorage.getItem(STORAGE_KEY));
            
            if (savedProcesses && savedProcesses.length > 0) {
                renderProcessesTable(savedProcesses);
                showMessage(`✅ Cargados ${savedProcesses.length} procesos desde almacenamiento`, "success");
            } else {
                // Escanear automáticamente al cargar
                setTimeout(() => {
                    scanMachinesForProcesses();
                }, 1000);
            }
        }

        // Event Listeners
        scanMachinesBtn.addEventListener('click', scanMachinesForProcesses);
        refreshBtn.addEventListener('click', () => loadInitialData());
        syncConfigBtn.addEventListener('click', syncWithProcessConfiguration);

        // Inicializar
        document.addEventListener('DOMContentLoaded', loadInitialData);

        // Función global para que otras páginas accedan a los procesos
        window.getProcessTypesMaster = function() {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        };

        // Función para buscar proceso por código
        window.findProcessByCode = function(code) {
            const processes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
            return processes.find(p => p.code === code);
        };
    </script>
</body>
</html>