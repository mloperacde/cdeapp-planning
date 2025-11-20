import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, Users, Database, ArrowLeftRight, RefreshCw } from "lucide-react";

export default function MasterEmployeeImport() {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const [showMapping, setShowMapping] = useState(false);
  const [detectedHeaders, setDetectedHeaders] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [parsedData, setParsedData] = useState([]);
  const queryClient = useQueryClient();

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];

    const delimiter = text.includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
    return data;
  };

  const AVAILABLE_FIELDS = [
    { value: '', label: '-- No importar --' },
    { value: 'codigo_empleado', label: 'Código Empleado' },
    { value: 'nombre', label: 'Nombre' },
    { value: 'estado_empleado', label: 'Estado' },
    { value: 'fecha_baja', label: 'Fecha Baja' },
    { value: 'motivo_baja', label: 'Motivo Baja' },
    { value: 'tasa_absentismo', label: 'Tasa Absentismo' },
    { value: 'horas_no_trabajadas', label: 'Horas No Trabajadas' },
    { value: 'horas_deberian_trabajarse', label: 'Horas Deberían Trabajarse' },
    { value: 'ultima_actualizacion_absentismo', label: 'Última Act. Absentismo' },
    { value: 'fecha_nacimiento', label: 'Fecha Nacimiento' },
    { value: 'dni', label: 'DNI' },
    { value: 'nuss', label: 'NUSS' },
    { value: 'sexo', label: 'Sexo' },
    { value: 'nacionalidad', label: 'Nacionalidad' },
    { value: 'direccion', label: 'Dirección' },
    { value: 'formacion', label: 'Formación' },
    { value: 'email', label: 'Email' },
    { value: 'telefono_movil', label: 'Teléfono Móvil' },
    { value: 'contacto_emergencia_nombre', label: 'Contacto Emergencia' },
    { value: 'contacto_emergencia_telefono', label: 'Teléfono Emergencia' },
    { value: 'departamento', label: 'Departamento' },
    { value: 'puesto', label: 'Puesto' },
    { value: 'categoria', label: 'Categoría' },
    { value: 'tipo_jornada', label: 'Tipo Jornada' },
    { value: 'num_horas_jornada', label: 'Horas Jornada' },
    { value: 'tipo_turno', label: 'Tipo Turno' },
    { value: 'equipo', label: 'Equipo' },
    { value: 'horario_manana_inicio', label: 'Horario Mañana Inicio' },
    { value: 'horario_manana_fin', label: 'Horario Mañana Fin' },
    { value: 'horario_tarde_inicio', label: 'Horario Tarde Inicio' },
    { value: 'horario_tarde_fin', label: 'Horario Tarde Fin' },
    { value: 'turno_partido_entrada1', label: 'Turno Partido Entrada 1' },
    { value: 'turno_partido_salida1', label: 'Turno Partido Salida 1' },
    { value: 'turno_partido_entrada2', label: 'Turno Partido Entrada 2' },
    { value: 'turno_partido_salida2', label: 'Turno Partido Salida 2' },
    { value: 'taquilla_vestuario', label: 'Vestuario' },
    { value: 'taquilla_numero', label: 'Número Taquilla' },
    { value: 'disponibilidad', label: 'Disponibilidad' },
    { value: 'ausencia_inicio', label: 'Ausencia Inicio' },
    { value: 'ausencia_fin', label: 'Ausencia Fin' },
    { value: 'ausencia_motivo', label: 'Ausencia Motivo' },
    { value: 'incluir_en_planning', label: 'Incluir en Planning' },
    { value: 'fecha_alta', label: 'Fecha Alta' },
    { value: 'tipo_contrato', label: 'Tipo Contrato' },
    { value: 'codigo_contrato', label: 'Código Contrato' },
    { value: 'fecha_fin_contrato', label: 'Fecha Fin Contrato' },
    { value: 'empresa_ett', label: 'Empresa ETT' },
    { value: 'salario_anual', label: 'Salario Anual' },
    { value: 'evaluacion_responsable', label: 'Evaluación Responsable' },
    { value: 'propuesta_cambio_categoria', label: 'Propuesta Cambio Categoría' },
    { value: 'propuesta_cambio_quien', label: 'Propuesto Por' },
    { value: 'horas_causa_mayor_consumidas', label: 'Horas Causa Mayor Consumidas' },
    { value: 'horas_causa_mayor_limite', label: 'Horas Causa Mayor Límite' },
    { value: 'ultimo_reset_causa_mayor', label: 'Último Reset Causa Mayor' },
    { value: 'maquina_1', label: 'Máquina 1' },
    { value: 'maquina_2', label: 'Máquina 2' },
    { value: 'maquina_3', label: 'Máquina 3' },
    { value: 'maquina_4', label: 'Máquina 4' },
    { value: 'maquina_5', label: 'Máquina 5' },
    { value: 'maquina_6', label: 'Máquina 6' },
    { value: 'maquina_7', label: 'Máquina 7' },
    { value: 'maquina_8', label: 'Máquina 8' },
    { value: 'maquina_9', label: 'Máquina 9' },
    { value: 'maquina_10', label: 'Máquina 10' },
  ];

  const autoMapField = (header) => {
    const normalized = header.toLowerCase().trim();
    const match = AVAILABLE_FIELDS.find(f => 
      f.value && (
        f.value === normalized ||
        f.label.toLowerCase() === normalized ||
        normalized.includes(f.value) ||
        f.value.includes(normalized)
      )
    );
    return match ? match.value : '';
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setResult(null);
    setProgress(null);
    setShowMapping(false);

    if (selectedFile) {
      try {
        const text = await selectedFile.text();
        const data = parseCSV(text);
        
        if (data.length > 0) {
          const headers = Object.keys(data[0]);
          setDetectedHeaders(headers);
          setParsedData(data);
          setPreviewData(data.slice(0, 3));
          
          // Auto-mapeo inicial
          const initialMapping = {};
          headers.forEach(header => {
            initialMapping[header] = autoMapField(header);
          });
          setFieldMapping(initialMapping);
          setShowMapping(true);
        }
      } catch (error) {
        console.error('Error al analizar archivo:', error);
      }
    }
  };

  const handleImport = async () => {
    if (!parsedData || parsedData.length === 0) return;

    setImporting(true);
    setResult(null);
    setShowMapping(false);
    setProgress({ stage: 'processing', message: `Procesando ${parsedData.length} registros...` });

    try {
      const errors = [];
      let createdCount = 0;
      let updatedCount = 0;

      // Función de reintento con backoff exponencial
      const retryWithBackoff = async (fn, maxRetries = 3) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            return await fn();
          } catch (error) {
            const isRateLimit = error.message?.toLowerCase().includes('rate limit');
            if (!isRateLimit || attempt === maxRetries - 1) {
              throw error;
            }
            // Esperar más tiempo con cada intento (1s, 2s, 4s)
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      };

      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];

        setProgress({
          stage: 'creating',
          message: `Procesando registro ${i + 1} de ${parsedData.length}...`,
          current: i + 1,
          total: parsedData.length,
          progress: Math.round(((i + 1) / parsedData.length) * 100)
        });

        try {
          const employeeData = {};

          // Aplicar el mapeo configurado
          Object.entries(fieldMapping).forEach(([csvHeader, targetField]) => {
            if (targetField && row[csvHeader]) {
              const value = row[csvHeader].trim();

              // Conversiones especiales
              if (['tasa_absentismo', 'horas_no_trabajadas', 'horas_deberian_trabajarse', 
                   'num_horas_jornada', 'salario_anual', 'horas_causa_mayor_consumidas', 
                   'horas_causa_mayor_limite'].includes(targetField)) {
                const parsed = parseFloat(value);
                if (!isNaN(parsed)) employeeData[targetField] = parsed;
              } else if (targetField === 'incluir_en_planning') {
                employeeData[targetField] = ['true', '1', 'si', 'sí', 'yes'].includes(value.toLowerCase());
              } else if (value) {
                employeeData[targetField] = value;
              }
            }
          });

          employeeData.estado_sincronizacion = 'Pendiente';

          if (!employeeData.nombre) {
            errors.push({ fila: i + 1, error: 'Nombre es obligatorio', row });
            continue;
          }

          // Check if employee exists by codigo_empleado con reintentos
          await retryWithBackoff(async () => {
            if (employeeData.codigo_empleado) {
              const existing = await base44.entities.EmployeeMasterDatabase.filter({ 
                codigo_empleado: employeeData.codigo_empleado 
              });

              if (existing.length > 0) {
                await base44.entities.EmployeeMasterDatabase.update(existing[0].id, employeeData);
                updatedCount++;
              } else {
                await base44.entities.EmployeeMasterDatabase.create(employeeData);
                createdCount++;
              }
            } else {
              await base44.entities.EmployeeMasterDatabase.create(employeeData);
              createdCount++;
            }
          });

          // Delay aumentado para evitar rate limit
          await new Promise(resolve => setTimeout(resolve, 800));

        } catch (error) {
          errors.push({ 
            fila: i + 1, 
            nombre: row['Nombre'] || row['nombre'] || 'Sin nombre',
            error: error.message 
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });

      setResult({
        success: true,
        total: parsedData.length,
        created: createdCount,
        updated: updatedCount,
        errors: errors.length,
        errorDetails: errors,
        message: `✅ Importación completada: ${createdCount} creados, ${updatedCount} actualizados, ${errors.length} errores`
      });

    } catch (error) {
      setResult({
        success: false,
        message: `❌ Error: ${error.message}`
      });
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'codigo_empleado', 'nombre', 'estado_empleado', 'fecha_baja', 'motivo_baja',
      'tasa_absentismo', 'horas_no_trabajadas', 'horas_deberian_trabajarse', 'ultima_actualizacion_absentismo',
      'fecha_nacimiento', 'dni', 'nuss', 'sexo', 'nacionalidad', 'direccion', 'formacion',
      'email', 'telefono_movil', 'contacto_emergencia_nombre', 'contacto_emergencia_telefono',
      'department_id', 'position_id', 'categoria', 'tipo_jornada', 'num_horas_jornada',
      'tipo_turno', 'team_id', 'horario_manana_inicio', 'horario_manana_fin',
      'horario_tarde_inicio', 'horario_tarde_fin', 'turno_partido_entrada1', 'turno_partido_salida1',
      'turno_partido_entrada2', 'turno_partido_salida2', 'taquilla_vestuario', 'taquilla_numero',
      'disponibilidad', 'ausencia_inicio', 'ausencia_fin', 'ausencia_motivo', 'incluir_en_planning',
      'fecha_alta', 'tipo_contrato', 'codigo_contrato', 'fecha_fin_contrato', 'empresa_ett',
      'salario_anual', 'evaluacion_responsable', 'propuesta_cambio_categoria', 'propuesta_cambio_quien',
      'horas_causa_mayor_consumidas', 'horas_causa_mayor_limite', 'ultimo_reset_causa_mayor',
      'maquina_1', 'maquina_2', 'maquina_3', 'maquina_4', 'maquina_5',
      'maquina_6', 'maquina_7', 'maquina_8', 'maquina_9', 'maquina_10'
    ];
    
    const exampleData = [
      'EMP001', 'Juan Pérez García', 'Alta', '', '',
      '0', '0', '0', '',
      '1990-01-15', '12345678A', '12-3456789012-34', 'Masculino', 'Española', 'Calle Principal 123', 'Grado en Ingeniería',
      'juan.perez@empresa.com', '600123456', 'María Pérez', '600654321',
      '', '', 'Categoría 1', 'Jornada Completa', '40',
      'Rotativo', '', '07:00', '15:00',
      '14:00', '22:00', '', '',
      '', '', 'Vestuario Masculino Planta Baja', '101',
      'Disponible', '', '', '', 'true',
      '2024-01-01', 'Indefinido', 'CONT001', '', '',
      '25000', '', '', '',
      '0', '20', '',
      '', '', '', '', '',
      '', '', '', '', ''
    ];

    const csvContent = headers.join(',') + '\n' + exampleData.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Plantilla_Base_Datos_Empleados.csv';
    link.click();
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-3">
          <Database className="w-6 h-6 text-blue-600" />
          Base de Datos Maestra de Empleados
        </CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          Importa y gestiona el archivo maestro de empleados desde CSV
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900">Plantilla de Importación</p>
                <p className="text-xs text-blue-700">Descarga la plantilla CSV con el formato correcto</p>
              </div>
            </div>
            <Button onClick={downloadTemplate} variant="outline" className="border-blue-300">
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">Seleccionar archivo CSV</Label>
            <Input
              id="file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={importing}
            />
            {file && !showMapping && (
              <p className="text-sm text-slate-600">
                Archivo seleccionado: <span className="font-semibold">{file.name}</span>
              </p>
            )}
          </div>

          {/* Field Mapping */}
          {showMapping && !importing && (
            <Card className="border-2 border-blue-300 bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                  Mapeo de Campos
                </CardTitle>
                <p className="text-xs text-slate-600 mt-1">
                  {detectedHeaders.length} columnas detectadas. Asigna cada columna del CSV a un campo de la ficha de empleado.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-green-600">
                    {Object.values(fieldMapping).filter(v => v).length} campos mapeados
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newMapping = {};
                      detectedHeaders.forEach(h => newMapping[h] = autoMapField(h));
                      setFieldMapping(newMapping);
                    }}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Auto-mapear
                  </Button>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2 p-2 bg-white rounded border">
                  {detectedHeaders.map((header, idx) => (
                    <div key={header} className="p-3 bg-slate-50 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-slate-600 mb-1 block">Columna del CSV:</Label>
                          <div className="font-mono text-sm font-semibold text-slate-900 bg-white p-2 rounded border">
                            {header}
                          </div>
                          {previewData[0] && (
                            <div className="text-xs text-slate-500 mt-1 truncate">
                              Ejemplo: {previewData[0][header]}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600 mb-1 block">
                            Campo de la ficha:
                          </Label>
                          <select
                            value={fieldMapping[header] || ''}
                            onChange={(e) => setFieldMapping({
                              ...fieldMapping,
                              [header]: e.target.value
                            })}
                            className="w-full p-2 border rounded text-sm"
                          >
                            {AVAILABLE_FIELDS.map(field => (
                              <option key={field.value} value={field.value}>
                                {field.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {previewData.length > 0 && (
                  <Alert className="border-slate-200 bg-slate-50">
                    <AlertDescription className="text-xs">
                      <p className="font-semibold mb-1">Vista previa (primeras 3 filas):</p>
                      <div className="text-slate-700">
                        Total de registros a importar: <strong>{parsedData.length}</strong>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Import Button */}
          {showMapping && !importing && (
            <Button
              onClick={handleImport}
              disabled={Object.values(fieldMapping).filter(v => v).length === 0}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <Upload className="w-5 h-5 mr-2" />
              Importar {parsedData.length} Empleados
            </Button>
          )}

          {!showMapping && file && !importing && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription className="text-amber-900 text-sm">
                Archivo cargado. Configura el mapeo de campos arriba.
              </AlertDescription>
            </Alert>
          )}

          {/* Progress */}
          {progress && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-900">{progress.message}</span>
              </div>
              {progress.progress !== undefined && (
                <div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mb-1">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-blue-700 text-center">{progress.progress}%</div>
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription className={result.success ? 'text-green-900' : 'text-red-900'}>
                    <p className="font-semibold mb-2">{result.message}</p>
                    {result.total && (
                      <div className="flex gap-4 mb-2">
                        <Badge className="bg-blue-600">Total: {result.total}</Badge>
                        {result.created > 0 && <Badge className="bg-green-600">Creados: {result.created}</Badge>}
                        {result.updated > 0 && <Badge className="bg-amber-600">Actualizados: {result.updated}</Badge>}
                        {result.errors > 0 && <Badge className="bg-red-600">Errores: {result.errors}</Badge>}
                      </div>
                    )}
                  </AlertDescription>

                  {result.errorDetails && result.errorDetails.length > 0 && (
                    <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded max-h-60 overflow-y-auto">
                      <p className="text-xs font-semibold text-red-900 mb-2">
                        Detalles de errores ({result.errors} total):
                      </p>
                      <div className="text-xs text-red-800 space-y-1">
                        {result.errorDetails.map((err, i) => (
                          <div key={i} className="border-b border-red-200 pb-1">
                            <div className="font-semibold">Fila {err.fila}: {err.nombre}</div>
                            <div className="text-red-700 ml-2">→ {err.error}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Alert>
          )}

          {/* Info */}
          <Alert className="border-slate-200 bg-slate-50">
            <AlertDescription className="text-sm text-slate-700">
              <p className="font-semibold mb-1">📋 Instrucciones:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Descarga la plantilla CSV y complétala con los datos de empleados</li>
                <li>Usa comas (,) o punto y coma (;) como separador de campos</li>
                <li>Cada fila representa un empleado en la base de datos maestra</li>
                <li>Los empleados con código existente serán actualizados, los nuevos serán creados</li>
                <li>Los datos importados quedarán pendientes de sincronización con el sistema operativo</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}