import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, Database } from "lucide-react";

export default function MasterEmployeeImport() {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const [previewData, setPreviewData] = useState([]);
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

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setResult(null);
    setProgress(null);

    if (selectedFile) {
      try {
        const text = await selectedFile.text();
        const data = parseCSV(text);
        
        if (data.length > 0) {
          setParsedData(data);
          setPreviewData(data.slice(0, 3));
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
    setProgress({ stage: 'processing', message: `Procesando ${parsedData.length} registros...` });

    try {
      const errors = [];
      let createdCount = 0;
      let updatedCount = 0;

      const retryWithBackoff = async (fn, maxRetries = 3) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            return await fn();
          } catch (error) {
            const isRateLimit = error.message?.toLowerCase().includes('rate limit');
            if (!isRateLimit || attempt === maxRetries - 1) {
              throw error;
            }
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

          // Importar TODOS los campos del CSV directamente
          Object.entries(row).forEach(([key, value]) => {
            if (value && value.trim() !== '') {
              const trimmedValue = value.trim();
              
              // Conversiones de tipos de datos
              if (['tasa_absentismo', 'horas_no_trabajadas', 'horas_deberian_trabajarse', 
                   'num_horas_jornada', 'salario_anual', 'horas_causa_mayor_consumidas', 
                   'horas_causa_mayor_limite'].includes(key)) {
                const parsed = parseFloat(trimmedValue);
                if (!isNaN(parsed)) employeeData[key] = parsed;
              } else if (key === 'incluir_en_planning') {
                employeeData[key] = ['true', '1', 'si', 'sí', 'yes', 'True', 'TRUE'].includes(trimmedValue);
              } else {
                employeeData[key] = trimmedValue;
              }
            }
          });

          employeeData.estado_sincronizacion = 'Pendiente';

          if (!employeeData.nombre) {
            errors.push({ fila: i + 1, error: 'Nombre es obligatorio', row });
            continue;
          }

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
      'codigo_empleado', 'nombre', 'fecha_nacimiento', 'dni', 'nuss', 'sexo', 'nacionalidad', 
      'direccion', 'email', 'telefono_movil', 'formacion',
      'departamento', 'puesto', 'categoria', 'equipo',
      'tipo_jornada', 'num_horas_jornada', 'tipo_turno',
      'horario_manana_inicio', 'horario_manana_fin', 'horario_tarde_inicio', 'horario_tarde_fin',
      'taquilla_vestuario', 'taquilla_numero',
      'fecha_alta', 'tipo_contrato', 'codigo_contrato', 'fecha_fin_contrato', 'empresa_ett',
      'estado_empleado', 'incluir_en_planning'
    ];

    const exampleData = [
      'EMP001', 'Juan Pérez García', '1990-01-15', '12345678A', '12-3456789012-34', 
      'Masculino', 'ESPAÑOLA', 'Calle Principal 123', 'juan.perez@empresa.com', '600123456', 'FP Grado Medio',
      'FABRICACION', 'OPERARIA DE LINEA', 'Categoría 1', 'Equipo 1',
      'Jornada Completa', '40', 'Rotativo',
      '07:00', '15:00', '14:00', '22:00',
      'Vestuario Masculino Planta Baja', '101',
      '2024-01-01', 'INDEFINIDO', '502', '', '',
      'Alta', 'true'
    ];

    const csvContent = headers.join(';') + '\n' + exampleData.join(';');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Plantilla_Empleados_Completa.csv';
    link.click();
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-3">
          <Database className="w-6 h-6 text-blue-600" />
          Importación Simplificada de Empleados
        </CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          Importa empleados desde CSV - Los encabezados del archivo se usan directamente como campos
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900">Plantilla CSV</p>
                <p className="text-xs text-blue-700">Descarga la plantilla con campos básicos</p>
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
                Archivo: <span className="font-semibold">{file.name}</span>
              </p>
            )}
          </div>

          {/* Preview */}
          {previewData.length > 0 && !importing && (
            <Card className="border-2 border-green-300 bg-green-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-green-900">
                  Vista Previa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-800 mb-3">
                  <strong>{parsedData.length}</strong> empleados detectados
                  <br />
                  <strong>{Object.keys(previewData[0] || {}).length}</strong> campos por empleado
                </p>
                <div className="bg-white p-3 rounded border text-xs overflow-x-auto">
                  <p className="font-semibold mb-2">Campos detectados:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(previewData[0] || {}).map((field) => (
                      <Badge key={field} className="bg-blue-600">{field}</Badge>
                    ))}
                  </div>
                  <p className="font-semibold mt-3 mb-2">Primeras 3 filas:</p>
                  {previewData.map((emp, idx) => (
                    <div key={idx} className="mb-2 pb-2 border-b border-slate-200">
                      <strong>Fila {idx + 1}:</strong> {emp.nombre || emp.Nombre || 'Sin nombre'}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Button */}
          {parsedData.length > 0 && !importing && (
            <Button
              onClick={handleImport}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <Upload className="w-5 h-5 mr-2" />
              Importar {parsedData.length} Empleados
            </Button>
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
                      <div className="flex gap-4 mb-2 flex-wrap">
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
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-sm text-blue-900">
              <p className="font-semibold mb-2">⚠️ ORDEN CORRECTO DE COLUMNAS EN CSV:</p>
              <div className="text-xs space-y-2 bg-white p-3 rounded border border-blue-200">
                <p><strong>1. Datos Personales:</strong> codigo_empleado, nombre, fecha_nacimiento, dni, nuss, sexo, nacionalidad, direccion, email, telefono_movil, formacion</p>
                <p><strong>2. Organización:</strong> departamento, puesto, categoria, equipo</p>
                <p><strong>3. Jornada:</strong> tipo_jornada, num_horas_jornada, tipo_turno, horario_manana_inicio, horario_manana_fin, horario_tarde_inicio, horario_tarde_fin</p>
                <p><strong>4. Taquilla:</strong> taquilla_vestuario, taquilla_numero</p>
                <p><strong>5. Contrato:</strong> fecha_alta, tipo_contrato, codigo_contrato, fecha_fin_contrato, empresa_ett</p>
                <p><strong>6. Estado:</strong> estado_empleado, incluir_en_planning</p>
              </div>
              <p className="mt-2 text-xs">
                ✅ Fechas en formato DD/MM/YYYY o YYYY-MM-DD<br/>
                ✅ Separador: punto y coma (;) recomendado<br/>
                ✅ Después de importar, usa <strong>"Reorganizar Datos"</strong> para corregir campos mal posicionados
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
