import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  FileSpreadsheet,
  Users
} from "lucide-react";

export default function EmployeeBulkImporter() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState([]);
  const queryClient = useQueryClient();

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
    initialData: [],
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list(),
    initialData: [],
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list(),
    initialData: [],
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
      setErrors([]);
    }
  };

  const downloadTemplate = () => {
    const template = `codigo_empleado,nombre,email,telefono_movil,fecha_nacimiento,dni,nuss,sexo,nacionalidad,direccion,formacion,departamento,puesto,categoria,tipo_jornada,num_horas_jornada,tipo_turno,turno,fecha_alta,tipo_contrato,codigo_contrato,empresa_ett,salario_anual,estado_empleado
EMP001,Juan Pérez,juan.perez@empresa.com,666111222,1990-05-15,12345678A,123456789012,Masculino,Española,Calle Falsa 123,Grado en Ingeniería,Fabricación,Operador de Línea,Operario,Jornada Completa,40,Fijo Mañana,,2020-01-15,Indefinido,CONT001,,25000,Alta
EMP002,María García,maria.garcia@empresa.com,666333444,1985-08-20,87654321B,210987654321,Femenino,Española,Avenida Principal 456,Formación Profesional,Fabricación,Segunda de Línea,Técnico,Jornada Completa,40,Rotativo,,2019-03-10,Indefinido,CONT002,,30000,Alta`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_empleados.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const validateEmployee = (emp, index) => {
    const validationErrors = [];
    
    // Campos obligatorios
    if (!emp.nombre) {
      validationErrors.push(`Fila ${index + 2}: Falta nombre`);
    }
    
    if (!emp.tipo_jornada || !['Jornada Completa', 'Jornada Parcial', 'Reducción de Jornada'].includes(emp.tipo_jornada)) {
      validationErrors.push(`Fila ${index + 2}: tipo_jornada debe ser "Jornada Completa", "Jornada Parcial" o "Reducción de Jornada"`);
    }
    
    if (!emp.tipo_turno || !['Rotativo', 'Fijo Mañana', 'Fijo Tarde', 'Turno Partido'].includes(emp.tipo_turno)) {
      validationErrors.push(`Fila ${index + 2}: tipo_turno debe ser "Rotativo", "Fijo Mañana", "Fijo Tarde" o "Turno Partido"`);
    }

    // Validar email si existe
    if (emp.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emp.email)) {
      validationErrors.push(`Fila ${index + 2}: Email inválido`);
    }

    // Validar sexo
    if (emp.sexo && !['Masculino', 'Femenino', 'Otro'].includes(emp.sexo)) {
      validationErrors.push(`Fila ${index + 2}: sexo debe ser "Masculino", "Femenino" o "Otro"`);
    }

    // Validar estado
    if (emp.estado_empleado && !['Alta', 'Baja'].includes(emp.estado_empleado)) {
      validationErrors.push(`Fila ${index + 2}: estado_empleado debe ser "Alta" o "Baja"`);
    }

    // Buscar IDs de departamento, puesto y turno
    if (emp.departamento) {
      const dept = departments.find(d => d.nombre === emp.departamento || d.codigo === emp.departamento);
      if (dept) {
        emp.department_id = dept.id;
      } else {
        validationErrors.push(`Fila ${index + 2}: Departamento "${emp.departamento}" no encontrado`);
      }
    }

    if (emp.puesto) {
      const pos = positions.find(p => p.nombre === emp.puesto || p.codigo === emp.puesto);
      if (pos) {
        emp.position_id = pos.id;
      } else {
        validationErrors.push(`Fila ${index + 2}: Puesto "${emp.puesto}" no encontrado`);
      }
    }

    if (emp.turno) {
      const shift = shifts.find(s => s.nombre === emp.turno || s.codigo === emp.turno);
      if (shift) {
        emp.shift_id = shift.id;
      }
    }

    return validationErrors;
  };

  const handleImport = async () => {
    if (!file) {
      alert('Por favor selecciona un archivo');
      return;
    }

    try {
      setUploading(true);
      setErrors([]);
      setResults(null);

      // 1. Subir archivo
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResult.file_url;

      setUploading(false);
      setExtracting(true);

      // 2. Extraer datos del archivo
      const jsonSchema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            codigo_empleado: { type: "string" },
            nombre: { type: "string" },
            email: { type: "string" },
            telefono_movil: { type: "string" },
            fecha_nacimiento: { type: "string" },
            dni: { type: "string" },
            nuss: { type: "string" },
            sexo: { type: "string" },
            nacionalidad: { type: "string" },
            direccion: { type: "string" },
            formacion: { type: "string" },
            departamento: { type: "string" },
            puesto: { type: "string" },
            categoria: { type: "string" },
            tipo_jornada: { type: "string" },
            num_horas_jornada: { type: "number" },
            tipo_turno: { type: "string" },
            turno: { type: "string" },
            fecha_alta: { type: "string" },
            tipo_contrato: { type: "string" },
            codigo_contrato: { type: "string" },
            empresa_ett: { type: "string" },
            salario_anual: { type: "number" },
            estado_empleado: { type: "string" }
          }
        }
      };

      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: jsonSchema
      });

      setExtracting(false);

      if (extractResult.status === "error") {
        setErrors([`Error al extraer datos: ${extractResult.details}`]);
        return;
      }

      const employees = extractResult.output;
      
      if (!employees || employees.length === 0) {
        setErrors(['No se encontraron empleados en el archivo']);
        return;
      }

      // 3. Validar empleados
      const allErrors = [];
      const validEmployees = [];

      employees.forEach((emp, index) => {
        const empErrors = validateEmployee(emp, index);
        if (empErrors.length > 0) {
          allErrors.push(...empErrors);
        } else {
          // Limpiar campos que no deben ir a la BD
          delete emp.departamento;
          delete emp.puesto;
          delete emp.turno;
          
          // Establecer valores por defecto
          if (!emp.estado_empleado) emp.estado_empleado = "Alta";
          if (!emp.incluir_en_planning) emp.incluir_en_planning = true;
          if (!emp.disponibilidad) emp.disponibilidad = "Disponible";
          
          validEmployees.push(emp);
        }
      });

      if (allErrors.length > 0) {
        setErrors(allErrors);
        return;
      }

      // 4. Importar empleados
      setImporting(true);
      const created = await base44.entities.Employee.bulkCreate(validEmployees);

      setImporting(false);
      setResults({
        total: employees.length,
        imported: created.length,
        errors: 0
      });

      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setFile(null);

    } catch (error) {
      console.error('Error en importación:', error);
      setErrors([error.message || 'Error desconocido durante la importación']);
      setUploading(false);
      setExtracting(false);
      setImporting(false);
    }
  };

  const isProcessing = uploading || extracting || importing;

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Importación Masiva de Empleados
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Instrucciones */}
          <Alert>
            <FileSpreadsheet className="w-4 h-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Instrucciones:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Descarga la plantilla CSV haciendo clic en "Descargar Plantilla"</li>
                <li>Rellena los datos de los empleados en el archivo</li>
                <li>Asegúrate de que los nombres de departamentos, puestos y turnos coincidan con los configurados</li>
                <li>Sube el archivo completado usando el botón "Seleccionar Archivo"</li>
                <li>Haz clic en "Importar Empleados" para procesar</li>
              </ol>
              <p className="mt-2 text-xs text-slate-600">
                <strong>Campos obligatorios:</strong> nombre, tipo_jornada, tipo_turno
              </p>
            </AlertDescription>
          </Alert>

          {/* Botón descargar plantilla */}
          <div>
            <Button onClick={downloadTemplate} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Descargar Plantilla CSV
            </Button>
          </div>

          {/* Selector de archivo */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Seleccionar Archivo Excel/CSV
            </label>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
            {file && (
              <p className="text-sm text-slate-600">
                Archivo seleccionado: {file.name}
              </p>
            )}
          </div>

          {/* Progreso */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={uploading ? 33 : extracting ? 66 : 100} />
              <p className="text-sm text-center text-slate-600">
                {uploading && "Subiendo archivo..."}
                {extracting && "Extrayendo datos..."}
                {importing && "Importando empleados..."}
              </p>
            </div>
          )}

          {/* Resultados */}
          {results && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription>
                <p className="font-semibold text-green-900">
                  ✅ Importación completada con éxito
                </p>
                <p className="text-sm text-green-800 mt-1">
                  {results.imported} de {results.total} empleados importados
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Errores */}
          {errors.length > 0 && (
            <Alert className="bg-red-50 border-red-200">
              <XCircle className="w-4 h-4 text-red-600" />
              <AlertDescription>
                <p className="font-semibold text-red-900 mb-2">
                  ⚠️ Se encontraron errores de validación:
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {errors.map((error, idx) => (
                    <p key={idx} className="text-xs text-red-800">
                      • {error}
                    </p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Botón importar */}
          <Button 
            onClick={handleImport} 
            disabled={!file || isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isProcessing ? 'Procesando...' : 'Importar Empleados'}
          </Button>

          {/* Información de entidades requeridas */}
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-semibold text-slate-700">Configuraciones disponibles:</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-slate-50 rounded">
                <p className="font-medium">Departamentos: {departments.length}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <p className="font-medium">Puestos: {positions.length}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <p className="font-medium">Turnos: {shifts.length}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 italic">
              Si algún valor no existe, configúralo primero en sus respectivas secciones.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}