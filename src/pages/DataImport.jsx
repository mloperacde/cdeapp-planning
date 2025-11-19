import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2,
  Users,
  Cog,
  Wrench,
  KeyRound,
  UserPlus
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DataImportPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState("employees");
  const [importProgress, setImportProgress] = useState(null);
  const [lockerFile, setLockerFile] = useState(null);
  const [importingLockers, setImportingLockers] = useState(false);
  const [lockerImportResult, setLockerImportResult] = useState(null);
  const queryClient = useQueryClient();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          file.type === "application/vnd.ms-excel" ||
          file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        alert('Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV');
      }
    }
  };

  const parseCSV = (text, delimiter = ',') => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    // Parse headers
    const headers = lines[0].split(delimiter).map(h => 
      h.trim().replace(/^["']|["']$/g, '').toLowerCase().replace(/\s+/g, '_')
    );
    
    console.log('Headers detectados:', headers);
    
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Split respetando comillas
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          values.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^["']|["']$/g, ''));
      
      // Crear objeto solo si tiene datos válidos
      if (values.some(v => v && v !== '')) {
        const obj = {};
        headers.forEach((header, index) => {
          let value = values[index];
          
          if (value && value !== '') {
            // Convertir números
            if (!isNaN(value) && (
              header.includes('num_') || 
              header.includes('horas') || 
              header.includes('salario') ||
              header.includes('orden')
            )) {
              value = parseFloat(value);
            }
            obj[header] = value;
          }
        });
        
        if (Object.keys(obj).length > 0) {
          data.push(obj);
        }
      }
    }
    
    console.log(`Parseados ${data.length} registros válidos`);
    return data;
  };

  const handleImport = async () => {
    if (!selectedFile) {
      alert('Por favor selecciona un archivo primero');
      return;
    }

    setImporting(true);
    setImportProgress({ stage: 'reading', message: 'Leyendo archivo...' });
    console.log('Iniciando importación...');
    
    try {
      let entityName = "";
      
      switch (selectedEntity) {
        case "employees":
          entityName = "Employee";
          break;
        case "machines":
          entityName = "Machine";
          break;
        case "maintenances":
          entityName = "MaintenanceSchedule";
          break;
      }

      // Leer archivo CSV directamente
      setImportProgress({ stage: 'parse', message: 'Analizando datos del archivo...' });
      console.log('Leyendo archivo:', selectedFile.name);
      
      let text = await selectedFile.text();
      
      // Detectar delimitador
      const firstLine = text.split('\n')[0];
      const delimiter = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
      console.log('Delimitador detectado:', delimiter);
      
      const extractedData = parseCSV(text, delimiter);
      
      console.log(`Datos parseados: ${extractedData.length} registros`);
      if (extractedData.length > 0) {
        console.log('Primer registro:', extractedData[0]);
      }

      // Validar que hay datos
      if (!Array.isArray(extractedData) || extractedData.length === 0) {
        throw new Error("❌ No se encontraron datos válidos.\n\n✅ Verifica que:\n• El archivo tenga una fila de encabezados\n• Haya al menos una fila de datos\n• Los nombres de columna coincidan con la plantilla");
      }
      
      // Validar campos obligatorios según entidad
      const requiredFields = {
        "Employee": ["nombre", "tipo_jornada", "tipo_turno"],
        "Machine": ["nombre", "codigo"],
        "MaintenanceSchedule": ["machine_id", "tipo", "fecha_programada"]
      };
      
      const required = requiredFields[entityName] || [];
      const firstRow = extractedData[0];
      const missingFields = required.filter(field => !firstRow[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`❌ Faltan columnas obligatorias: ${missingFields.join(', ')}\n\n📋 Columnas detectadas: ${Object.keys(firstRow).join(', ')}\n\n💡 Descarga la plantilla para ver el formato correcto.`);
      }

      // Crear registros uno por uno para manejar errores individuales
      setImportProgress({ 
        stage: 'create', 
        message: `Creando registros (0/${extractedData.length})...`,
        logs: []
      });
      let createdCount = 0;
      let errors = [];
      let logs = [];
      
      for (let i = 0; i < extractedData.length; i++) {
        const registro = extractedData[i];
        const logEntry = { fila: i + 1, nombre: registro.nombre || 'Sin nombre', status: 'pending' };
        
        try {
          console.log(`\n📝 Fila ${i + 1}/${extractedData.length}:`, registro);
          
          // Validar campos requeridos
          if (entityName === "Employee") {
            if (!registro.nombre) throw new Error("Falta campo 'nombre'");
            if (!registro.tipo_jornada) throw new Error("Falta campo 'tipo_jornada'");
            if (!registro.tipo_turno) throw new Error("Falta campo 'tipo_turno'");
          }
          
          await base44.entities[entityName].create(registro);
          createdCount++;
          logEntry.status = 'success';
          console.log(`✅ Registro ${i + 1} creado exitosamente`);
          
        } catch (err) {
          logEntry.status = 'error';
          logEntry.error = err.message;
          console.error(`❌ Error fila ${i + 1}:`, err.message, registro);
          errors.push({ fila: i + 1, nombre: registro.nombre || 'Sin nombre', error: err.message });
        }
        
        logs.push(logEntry);
        
        setImportProgress({ 
          stage: 'create', 
          message: `Procesando: ${createdCount} ✅ | ${errors.length} ❌ (${i + 1}/${extractedData.length})`,
          progress: Math.round(((i + 1) / extractedData.length) * 100),
          logs: [...logs],
          currentRow: i + 1,
          created: createdCount,
          failed: errors.length
        });
        
        // Pequeña pausa para evitar sobrecarga
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 100));
      }
      
      console.log(`Importación completada. Creados: ${createdCount}, Errores: ${errors.length}`);

      setImportResult({
        success: createdCount > 0,
        total: extractedData.length,
        created: createdCount,
        errors: errors.length,
        errorDetails: errors,
        message: createdCount === extractedData.length 
          ? `✅ Se importaron ${createdCount} registros exitosamente`
          : `⚠️ Se importaron ${createdCount} de ${extractedData.length} registros. ${errors.length} errores encontrados.`
      });

      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: [entityName.toLowerCase() + 's'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });

    } catch (error) {
      console.error('Error importando:', error);
      setImportResult({
        success: false,
        message: error.message || 'Error al importar datos',
        details: error.toString()
      });
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  const handleLockerFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          file.type === "application/vnd.ms-excel" ||
          file.name.endsWith('.csv')) {
        setLockerFile(file);
        setLockerImportResult(null);
      } else {
        alert('Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV');
      }
    }
  };

  const handleLockerImport = async () => {
    if (!lockerFile) {
      alert('Por favor selecciona un archivo primero');
      return;
    }

    setImportingLockers(true);
    try {
      // Subir archivo
      const uploadResult = await base44.integrations.Core.UploadFile({ file: lockerFile });
      const fileUrl = uploadResult.file_url;

      // Leer archivo CSV directamente en el navegador
      const text = await lockerFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Saltar la primera línea si es encabezado
      const hasHeader = lines[0].toLowerCase().includes('vestuario') || 
                        lines[0].toLowerCase().includes('empleado') ||
                        lines[0].toLowerCase().includes('taquilla');
      
      const dataLines = hasHeader ? lines.slice(1) : lines;
      
      const extractedData = [];
      
      for (const line of dataLines) {
        // Separar por coma o punto y coma
        const parts = line.includes(';') ? line.split(';') : line.split(',');
        
        if (parts.length < 3) continue;
        
        let vestuario = parts[0].trim();
        const empleado = parts[1].trim();
        const numero_taquilla = parts[2].trim();
        
        if (!empleado || !numero_taquilla) continue;
        
        // Normalizar vestuario
        const vestuarioUpper = vestuario.toUpperCase();
        if (vestuarioUpper.includes('FEMENINO') && vestuarioUpper.includes('BAJA')) {
          vestuario = "Vestuario Femenino Planta Baja";
        } else if (vestuarioUpper.includes('FEMENINO') && vestuarioUpper.includes('ALTA')) {
          vestuario = "Vestuario Femenino Planta Alta";
        } else if (vestuarioUpper.includes('MASCULINO')) {
          vestuario = "Vestuario Masculino Planta Baja";
        }
        
        extractedData.push({
          vestuario,
          empleado,
          numero_taquilla
        });
      }

      if (!Array.isArray(extractedData) || extractedData.length === 0) {
        throw new Error("No se encontraron datos válidos en el archivo");
      }

      // Obtener empleados y asignaciones actuales
      const employees = await base44.entities.Employee.list();
      const lockerAssignments = await base44.entities.LockerAssignment.list();

      const normalizeString = (str) => {
        if (!str) return "";
        return str
          .toUpperCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^A-Z0-9]/g, "");
      };

      let matched = 0;
      let notFound = [];
      let updated = [];

      for (const row of extractedData) {
        if (!row.empleado || row.empleado.trim() === "") continue;

        const normalizedSearch = normalizeString(row.empleado);
        const employee = employees.find(emp => 
          normalizeString(emp.nombre) === normalizedSearch
        );

        if (!employee) {
          notFound.push(row.empleado);
          continue;
        }

        const existingAssignment = lockerAssignments.find(la => la.employee_id === employee.id);

        const assignmentData = {
          employee_id: employee.id,
          requiere_taquilla: true,
          vestuario: row.vestuario,
          numero_taquilla_actual: row.numero_taquilla,
          numero_taquilla_nuevo: null,
          fecha_asignacion: new Date().toISOString(),
          notificacion_enviada: false
        };

        if (existingAssignment) {
          await base44.entities.LockerAssignment.update(existingAssignment.id, assignmentData);
        } else {
          await base44.entities.LockerAssignment.create(assignmentData);
        }

        matched++;
        updated.push(`${employee.nombre} -> ${row.vestuario} #${row.numero_taquilla}`);
      }

      setLockerImportResult({
        success: true,
        total: extractedData.length,
        matched,
        notFound: notFound.length,
        notFoundList: notFound.slice(0, 10),
        message: `Se procesaron ${matched} de ${extractedData.length} registros exitosamente`
      });

      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });

    } catch (error) {
      console.error('Error importando taquillas:', error);
      setLockerImportResult({
        success: false,
        message: error.message || 'Error al importar datos de taquillas'
      });
    } finally {
      setImportingLockers(false);
    }
  };

  const downloadTemplate = (type) => {
    let csvContent = "";
    let filename = "";

    switch (type) {
      case "lockers":
        csvContent = "vestuario,empleado,numero_taquilla\n";
        csvContent += "Vestuario Femenino Planta Baja,MARIA LOPEZ,1\n";
        csvContent += "Vestuario Femenino Planta Alta,ANA GARCIA,101\n";
        csvContent += "Vestuario Masculino Planta Baja,JUAN PEREZ,1\n";
        filename = "plantilla_taquillas.csv";
        break;

      case "employees":
        csvContent = "codigo_empleado,nombre,estado_empleado,fecha_baja,motivo_baja,fecha_nacimiento,dni,nuss,sexo,nacionalidad,direccion,formacion,email,telefono_movil,contacto_emergencia_nombre,contacto_emergencia_telefono,departamento,puesto,categoria,tipo_jornada,num_horas_jornada,tipo_turno,equipo,horario_manana_inicio,horario_manana_fin,horario_tarde_inicio,horario_tarde_fin,turno_partido_entrada1,turno_partido_salida1,turno_partido_entrada2,turno_partido_salida2,taquilla_vestuario,taquilla_numero,disponibilidad,ausencia_inicio,ausencia_fin,ausencia_motivo,incluir_en_planning,fecha_alta,tipo_contrato,codigo_contrato,fecha_fin_contrato,empresa_ett,salario_anual,evaluacion_responsable,propuesta_cambio_categoria,propuesta_cambio_quien,horas_causa_mayor_consumidas,horas_causa_mayor_limite,ultimo_reset_causa_mayor,maquina_1,maquina_2,maquina_3,maquina_4,maquina_5,maquina_6,maquina_7,maquina_8,maquina_9,maquina_10\n";
        csvContent += "EMP001,Juan Pérez García,Alta,,,,12345678A,12-3456789012-34,Masculino,Española,Calle Mayor 1,Grado en Ingeniería,juan@email.com,600123456,María Pérez,600654321,FABRICACION,Operario,Categoría 1,Jornada Completa,40,Rotativo,Equipo Turno Isa,07:00,15:00,14:00,22:00,,,,,Vestuario Masculino Planta Baja,101,Disponible,,,,true,2020-01-15,Indefinido,CONT001,,,25000,,,,0,20,,,,,,,,,,\n";
        csvContent += "EMP002,Ana López Martín,Alta,,,1990-03-20,87654321B,12-9876543210-98,Femenino,Española,Avenida Central 45,FP Superior,ana@email.com,610987654,Pedro López,610123456,FABRICACION,Operario,Categoría 2,Jornada Completa,40,Fijo Mañana,Equipo Turno Isa,07:00,15:00,,,,,,,Vestuario Femenino Planta Baja,25,Disponible,,,,true,2019-06-10,Temporal,CONT002,2024-12-31,,22000,,,,0,20,,,,,,,,,,\n";
        filename = "plantilla_empleados.csv";
        break;

      case "machines":
        csvContent = "nombre,codigo,tipo,ubicacion,estado,descripcion,orden\n";
        csvContent += "Máquina 1,M001,Producción,Nave A,Disponible,Máquina de producción principal,1\n";
        filename = "plantilla_maquinas.csv";
        break;

      case "maintenances":
        csvContent = "machine_id,tipo,prioridad,estado,fecha_programada,duracion_estimada,descripcion\n";
        csvContent += "ID_MAQUINA,Mantenimiento Planificado,Media,Pendiente,2024-12-01T10:00:00,2,Revisión periódica\n";
        filename = "plantilla_mantenimientos.csv";
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Upload className="w-8 h-8 text-blue-600" />
                Importación de Datos
              </h1>
              <p className="text-slate-600 mt-1">
                Importa datos masivos desde archivos Excel o CSV
              </p>
            </div>
            <Link to={createPageUrl("DirectDataEntry")}>
              <Button variant="outline" className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100">
                <UserPlus className="w-4 h-4 mr-2" />
                Entrada Manual (Alternativa)
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="employees" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="employees" onClick={() => setSelectedEntity("employees")}>
              <Users className="w-4 h-4 mr-2" />
              Empleados
            </TabsTrigger>
            <TabsTrigger value="lockers" onClick={() => setSelectedEntity("lockers")}>
              <KeyRound className="w-4 h-4 mr-2" />
              Taquillas
            </TabsTrigger>
            <TabsTrigger value="machines" onClick={() => setSelectedEntity("machines")}>
              <Cog className="w-4 h-4 mr-2" />
              Máquinas
            </TabsTrigger>
            <TabsTrigger value="maintenances" onClick={() => setSelectedEntity("maintenances")}>
              <Wrench className="w-4 h-4 mr-2" />
              Mantenimientos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lockers">
            <Card>
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Importar Asignaciones de Taquillas</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Instrucciones</h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Descarga la plantilla de ejemplo o prepara tu archivo con las columnas: vestuario, empleado, numero_taquilla</li>
                    <li>El sistema buscará automáticamente coincidencias de nombres de empleados</li>
                    <li>Los vestuarios válidos son: "Vestuario Femenino Planta Baja", "Vestuario Femenino Planta Alta", "Vestuario Masculino Planta Baja"</li>
                    <li>Las asignaciones se crearán/actualizarán automáticamente</li>
                  </ol>
                </div>

                <Button
                  onClick={() => downloadTemplate("lockers")}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Plantilla de Taquillas
                </Button>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <KeyRound className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <input
                    type="file"
                    id="file-upload-lockers"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleLockerFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload-lockers"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Haz clic para seleccionar archivo
                  </label>
                  <p className="text-sm text-slate-500 mt-2">
                    Formatos: Excel (.xlsx, .xls) o CSV
                  </p>
                </div>

                {lockerFile && (
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-900">{lockerFile.name}</span>
                    </div>
                    <Button
                      onClick={handleLockerImport}
                      disabled={importingLockers}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {importingLockers ? "Procesando..." : "Importar y Asignar"}
                    </Button>
                  </div>
                )}

                {lockerImportResult && (
                  <div className={`p-4 rounded-lg border ${
                    lockerImportResult.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      {lockerImportResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`font-semibold ${
                          lockerImportResult.success ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {lockerImportResult.success ? '¡Importación Exitosa!' : 'Error en la Importación'}
                        </p>
                        <p className={`text-sm mt-1 ${
                          lockerImportResult.success ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {lockerImportResult.message}
                        </p>
                        {lockerImportResult.success && (
                          <div className="mt-3 space-y-2">
                            <div className="flex gap-2">
                              <Badge className="bg-green-600">
                                {lockerImportResult.matched} asignaciones exitosas
                              </Badge>
                              {lockerImportResult.notFound > 0 && (
                                <Badge className="bg-amber-600">
                                  {lockerImportResult.notFound} no encontrados
                                </Badge>
                              )}
                            </div>
                            {lockerImportResult.notFoundList && lockerImportResult.notFoundList.length > 0 && (
                              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                                <p className="text-xs font-semibold text-amber-900 mb-1">Empleados no encontrados:</p>
                                <ul className="text-xs text-amber-800 list-disc list-inside">
                                  {lockerImportResult.notFoundList.map((name, i) => (
                                    <li key={i}>{name}</li>
                                  ))}
                                  {lockerImportResult.notFound > lockerImportResult.notFoundList.length && (
                                    <li>... y {lockerImportResult.notFound - lockerImportResult.notFoundList.length} más</li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees">
            <Card>
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Importar Empleados</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Instrucciones</h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Descarga la plantilla de ejemplo haciendo clic en el botón inferior</li>
                    <li>Rellena los datos en el archivo Excel/CSV</li>
                    <li>Sube el archivo completado</li>
                    <li>Los campos obligatorios son: nombre, tipo_jornada, tipo_turno</li>
                  </ol>
                </div>

                <Button
                  onClick={() => downloadTemplate("employees")}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Plantilla de Empleados
                </Button>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <input
                    type="file"
                    id="file-upload-employees"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload-employees"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Haz clic para seleccionar archivo
                  </label>
                  <p className="text-sm text-slate-500 mt-2">
                    Formatos: Excel (.xlsx, .xls) o CSV
                  </p>
                </div>

                {selectedFile && selectedEntity === "employees" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-900">{selectedFile.name}</span>
                      </div>
                      <Button
                        onClick={handleImport}
                        disabled={importing}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {importing ? "Procesando..." : "Importar Datos"}
                      </Button>
                    </div>

                    {importProgress && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm font-medium text-blue-900">{importProgress.message}</span>
                        </div>
                        
                        {importProgress.progress !== undefined && (
                          <div>
                            <div className="w-full bg-blue-200 rounded-full h-2 mb-1">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${importProgress.progress}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-blue-700">{importProgress.progress}%</div>
                          </div>
                        )}
                        
                        {importProgress.logs && importProgress.logs.length > 0 && (
                          <div className="max-h-60 overflow-y-auto bg-white rounded border border-blue-200 p-2">
                            <div className="text-xs space-y-1">
                              {importProgress.logs.slice(-20).map((log, i) => (
                                <div key={i} className={`flex items-center gap-2 ${
                                  log.status === 'success' ? 'text-green-700' : 
                                  log.status === 'error' ? 'text-red-700' : 'text-slate-500'
                                }`}>
                                  <span className="font-mono">#{log.fila}</span>
                                  <span className="flex-1 truncate">{log.nombre}</span>
                                  {log.status === 'success' && <span>✅</span>}
                                  {log.status === 'error' && (
                                    <span className="text-red-600 text-xs" title={log.error}>❌ {log.error}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {importResult && selectedEntity === "employees" && (
                  <div className={`p-4 rounded-lg border ${
                    importResult.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      {importResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`font-semibold ${
                          importResult.success ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {importResult.success ? '¡Importación Exitosa!' : 'Error en la Importación'}
                        </p>
                        <p className={`text-sm mt-1 ${
                          importResult.success ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {importResult.message}
                        </p>
                        {importResult.created > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="flex gap-2">
                              <Badge className="bg-green-600">
                                {importResult.created} registros creados
                              </Badge>
                              {importResult.errors > 0 && (
                                <Badge className="bg-red-600">
                                  {importResult.errors} errores
                                </Badge>
                              )}
                            </div>
                            {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded max-h-60 overflow-y-auto">
                                <p className="text-xs font-semibold text-red-900 mb-2">Detalles de errores ({importResult.errors} total):</p>
                                <div className="text-xs text-red-800 space-y-1">
                                  {importResult.errorDetails.map((err, i) => (
                                    <div key={i} className="border-b border-red-200 pb-1">
                                      <div className="font-semibold">Fila {err.fila}: {err.nombre}</div>
                                      <div className="text-red-700 ml-2">→ {err.error}</div>
                                    </div>
                                  ))}
                                  {importResult.errors > importResult.errorDetails.length && (
                                    <div className="text-red-600 font-semibold pt-2">... y {importResult.errors - importResult.errorDetails.length} errores más</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="machines">
            <Card>
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Importar Máquinas</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Instrucciones</h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Descarga la plantilla de ejemplo</li>
                    <li>Campos obligatorios: nombre, codigo, estado</li>
                    <li>Estado debe ser: "Disponible" o "No disponible"</li>
                  </ol>
                </div>

                <Button
                  onClick={() => downloadTemplate("machines")}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Plantilla de Máquinas
                </Button>

                {/* Same upload section... */}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenances">
            <Card>
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Importar Mantenimientos</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Instrucciones</h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Descarga la plantilla de ejemplo</li>
                    <li>machine_id debe ser un ID válido de máquina existente</li>
                    <li>Campos obligatorios: machine_id, tipo, fecha_programada</li>
                  </ol>
                </div>

                <Button
                  onClick={() => downloadTemplate("maintenances")}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Plantilla de Mantenimientos
                </Button>

                {/* Same upload section... */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Recomendaciones
          </h4>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
            <li>Haz una copia de seguridad de tus datos antes de importar</li>
            <li>Verifica que los datos estén correctamente formateados</li>
            <li>Las fechas deben estar en formato: YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss</li>
            <li>Los valores numéricos no deben contener símbolos de moneda</li>
            <li>Para importaciones grandes (&gt;100 registros), considera dividir en lotes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}