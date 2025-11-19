import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, Users, Database } from "lucide-react";

export default function MasterEmployeeImport() {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(null);
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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setResult(null);
    setProgress(null);
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);
    setProgress({ stage: 'reading', message: 'Leyendo archivo...' });

    try {
      const text = await file.text();
      const extractedData = parseCSV(text);

      if (extractedData.length === 0) {
        throw new Error('El archivo no contiene datos');
      }

      setProgress({ 
        stage: 'processing', 
        message: `Procesando ${extractedData.length} registros...`,
        total: extractedData.length 
      });

      const errors = [];
      let createdCount = 0;
      let updatedCount = 0;

      for (let i = 0; i < extractedData.length; i++) {
        const row = extractedData[i];
        
        setProgress({
          stage: 'creating',
          message: `Procesando registro ${i + 1} de ${extractedData.length}...`,
          current: i + 1,
          total: extractedData.length,
          progress: Math.round(((i + 1) / extractedData.length) * 100)
        });

        try {
          const employeeData = {};
          
          // Mapear todos los campos del CSV a la entidad
          const fieldMapping = {
            'codigo_empleado': row['codigo_empleado'] || '',
            'nombre': row['nombre'] || '',
            'estado_empleado': row['estado_empleado'] || 'Alta',
            'fecha_baja': row['fecha_baja'] || '',
            'motivo_baja': row['motivo_baja'] || '',
            'tasa_absentismo': row['tasa_absentismo'] ? parseFloat(row['tasa_absentismo']) : null,
            'horas_no_trabajadas': row['horas_no_trabajadas'] ? parseFloat(row['horas_no_trabajadas']) : 0,
            'horas_deberian_trabajarse': row['horas_deberian_trabajarse'] ? parseFloat(row['horas_deberian_trabajarse']) : 0,
            'ultima_actualizacion_absentismo': row['ultima_actualizacion_absentismo'] || '',
            'fecha_nacimiento': row['fecha_nacimiento'] || '',
            'dni': row['dni'] || '',
            'nuss': row['nuss'] || '',
            'sexo': row['sexo'] || '',
            'nacionalidad': row['nacionalidad'] || '',
            'direccion': row['direccion'] || '',
            'formacion': row['formacion'] || '',
            'email': row['email'] || '',
            'telefono_movil': row['telefono_movil'] || '',
            'contacto_emergencia_nombre': row['contacto_emergencia_nombre'] || '',
            'contacto_emergencia_telefono': row['contacto_emergencia_telefono'] || '',
            'department_id': row['department_id'] || '',
            'position_id': row['position_id'] || '',
            'categoria': row['categoria'] || '',
            'tipo_jornada': row['tipo_jornada'] || 'Jornada Completa',
            'num_horas_jornada': row['num_horas_jornada'] ? parseFloat(row['num_horas_jornada']) : null,
            'tipo_turno': row['tipo_turno'] || 'Rotativo',
            'team_id': row['team_id'] || '',
            'horario_manana_inicio': row['horario_manana_inicio'] || '',
            'horario_manana_fin': row['horario_manana_fin'] || '',
            'horario_tarde_inicio': row['horario_tarde_inicio'] || '',
            'horario_tarde_fin': row['horario_tarde_fin'] || '',
            'turno_partido_entrada1': row['turno_partido_entrada1'] || '',
            'turno_partido_salida1': row['turno_partido_salida1'] || '',
            'turno_partido_entrada2': row['turno_partido_entrada2'] || '',
            'turno_partido_salida2': row['turno_partido_salida2'] || '',
            'taquilla_vestuario': row['taquilla_vestuario'] || '',
            'taquilla_numero': row['taquilla_numero'] || '',
            'disponibilidad': row['disponibilidad'] || 'Disponible',
            'ausencia_inicio': row['ausencia_inicio'] || '',
            'ausencia_fin': row['ausencia_fin'] || '',
            'ausencia_motivo': row['ausencia_motivo'] || '',
            'incluir_en_planning': row['incluir_en_planning'] === 'true' || row['incluir_en_planning'] === '1' || row['incluir_en_planning'] === 'si',
            'fecha_alta': row['fecha_alta'] || '',
            'tipo_contrato': row['tipo_contrato'] || '',
            'codigo_contrato': row['codigo_contrato'] || '',
            'fecha_fin_contrato': row['fecha_fin_contrato'] || '',
            'empresa_ett': row['empresa_ett'] || '',
            'salario_anual': row['salario_anual'] ? parseFloat(row['salario_anual']) : null,
            'evaluacion_responsable': row['evaluacion_responsable'] || '',
            'propuesta_cambio_categoria': row['propuesta_cambio_categoria'] || '',
            'propuesta_cambio_quien': row['propuesta_cambio_quien'] || '',
            'horas_causa_mayor_consumidas': row['horas_causa_mayor_consumidas'] ? parseFloat(row['horas_causa_mayor_consumidas']) : 0,
            'horas_causa_mayor_limite': row['horas_causa_mayor_limite'] ? parseFloat(row['horas_causa_mayor_limite']) : null,
            'ultimo_reset_causa_mayor': row['ultimo_reset_causa_mayor'] || '',
            'maquina_1': row['maquina_1'] || '',
            'maquina_2': row['maquina_2'] || '',
            'maquina_3': row['maquina_3'] || '',
            'maquina_4': row['maquina_4'] || '',
            'maquina_5': row['maquina_5'] || '',
            'maquina_6': row['maquina_6'] || '',
            'maquina_7': row['maquina_7'] || '',
            'maquina_8': row['maquina_8'] || '',
            'maquina_9': row['maquina_9'] || '',
            'maquina_10': row['maquina_10'] || ''
          };
          
          // Solo agregar campos que no estén vacíos (o que sean números válidos)
          Object.keys(fieldMapping).forEach(key => {
            const value = fieldMapping[key];
            if (value !== '' && value !== null && value !== undefined) {
              employeeData[key] = value;
            }
          });
          
          employeeData.estado_sincronizacion = 'Pendiente';

          if (!employeeData.nombre) {
            errors.push({ fila: i + 1, error: 'Nombre es obligatorio', row });
            continue;
          }

          // Check if employee exists by codigo_empleado
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

          // Delay para evitar rate limit
          await new Promise(resolve => setTimeout(resolve, 200));

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
        total: extractedData.length,
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
            {file && (
              <p className="text-sm text-slate-600">
                Archivo seleccionado: <span className="font-semibold">{file.name}</span>
              </p>
            )}
          </div>

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {importing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Importar Base de Datos
              </>
            )}
          </Button>

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