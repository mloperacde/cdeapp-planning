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
  Wrench
} from "lucide-react";

export default function DataImportPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState("employees");
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

  const handleImport = async () => {
    if (!selectedFile) {
      alert('Por favor selecciona un archivo primero');
      return;
    }

    setImporting(true);
    try {
      // Subir archivo
      const uploadResult = await base44.integrations.Core.UploadFile({ file: selectedFile });
      const fileUrl = uploadResult.file_url;

      // Definir esquema según entidad seleccionada
      let jsonSchema = {};
      let entityName = "";

      switch (selectedEntity) {
        case "employees":
          entityName = "Employee";
          jsonSchema = {
            type: "array",
            items: {
              type: "object",
              properties: {
                codigo_empleado: { type: "string" },
                nombre: { type: "string" },
                fecha_nacimiento: { type: "string" },
                dni: { type: "string" },
                nuss: { type: "string" },
                sexo: { type: "string" },
                nacionalidad: { type: "string" },
                direccion: { type: "string" },
                formacion: { type: "string" },
                email: { type: "string" },
                telefono_movil: { type: "string" },
                contacto_emergencia_nombre: { type: "string" },
                contacto_emergencia_telefono: { type: "string" },
                departamento: { type: "string" },
                puesto: { type: "string" },
                categoria: { type: "string" },
                tipo_jornada: { type: "string" },
                num_horas_jornada: { type: "number" },
                tipo_turno: { type: "string" },
                equipo: { type: "string" },
                horario_manana_inicio: { type: "string" },
                horario_manana_fin: { type: "string" },
                horario_tarde_inicio: { type: "string" },
                horario_tarde_fin: { type: "string" },
                fecha_alta: { type: "string" },
                tipo_contrato: { type: "string" },
                codigo_contrato: { type: "string" },
                fecha_fin_contrato: { type: "string" },
                salario_anual: { type: "number" },
                disponibilidad: { type: "string" }
              },
              required: ["nombre", "tipo_jornada", "tipo_turno"]
            }
          };
          break;

        case "machines":
          entityName = "Machine";
          jsonSchema = {
            type: "array",
            items: {
              type: "object",
              properties: {
                nombre: { type: "string" },
                codigo: { type: "string" },
                tipo: { type: "string" },
                ubicacion: { type: "string" },
                estado: { type: "string" },
                descripcion: { type: "string" },
                orden: { type: "number" }
              },
              required: ["nombre", "codigo", "estado"]
            }
          };
          break;

        case "maintenances":
          entityName = "MaintenanceSchedule";
          jsonSchema = {
            type: "array",
            items: {
              type: "object",
              properties: {
                machine_id: { type: "string" },
                tipo: { type: "string" },
                prioridad: { type: "string" },
                estado: { type: "string" },
                fecha_programada: { type: "string" },
                duracion_estimada: { type: "number" },
                descripcion: { type: "string" }
              },
              required: ["machine_id", "tipo", "fecha_programada"]
            }
          };
          break;
      }

      // Extraer datos del archivo
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: jsonSchema
      });

      if (extractResult.status === "error") {
        throw new Error(extractResult.details || "Error extrayendo datos del archivo");
      }

      const extractedData = extractResult.output;

      // Validar que hay datos
      if (!Array.isArray(extractedData) || extractedData.length === 0) {
        throw new Error("No se encontraron datos válidos en el archivo");
      }

      // Crear registros en masa
      const createResult = await base44.entities[entityName].bulkCreate(extractedData);

      setImportResult({
        success: true,
        total: extractedData.length,
        message: `Se importaron ${extractedData.length} registros exitosamente`
      });

      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: [entityName.toLowerCase() + 's'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });

    } catch (error) {
      console.error('Error importando:', error);
      setImportResult({
        success: false,
        message: error.message || 'Error al importar datos'
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = (type) => {
    let csvContent = "";
    let filename = "";

    switch (type) {
      case "employees":
        csvContent = "codigo_empleado,nombre,fecha_nacimiento,dni,nuss,sexo,nacionalidad,direccion,formacion,email,telefono_movil,contacto_emergencia_nombre,contacto_emergencia_telefono,departamento,puesto,categoria,tipo_jornada,num_horas_jornada,tipo_turno,equipo,horario_manana_inicio,horario_manana_fin,horario_tarde_inicio,horario_tarde_fin,fecha_alta,tipo_contrato,codigo_contrato,fecha_fin_contrato,salario_anual,disponibilidad\n";
        csvContent += "EMP001,Juan Pérez,1985-05-15,12345678A,12-3456789012-34,Masculino,Española,Calle Mayor 1,Grado en Ingeniería,juan@email.com,600123456,María Pérez,600654321,FABRICACION,Operario,Categoría 1,Jornada Completa,40,Rotativo,Equipo Turno Isa,07:00,15:00,14:00,22:00,2020-01-15,Indefinido,CONT001,,,Disponible\n";
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
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Upload className="w-8 h-8 text-blue-600" />
            Importación de Datos
          </h1>
          <p className="text-slate-600 mt-1">
            Importa datos masivos desde archivos Excel o CSV
          </p>
        </div>

        <Tabs defaultValue="employees" onValueChange={setSelectedEntity} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="employees">
              <Users className="w-4 h-4 mr-2" />
              Empleados
            </TabsTrigger>
            <TabsTrigger value="machines">
              <Cog className="w-4 h-4 mr-2" />
              Máquinas
            </TabsTrigger>
            <TabsTrigger value="maintenances">
              <Wrench className="w-4 h-4 mr-2" />
              Mantenimientos
            </TabsTrigger>
          </TabsList>

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

                {selectedFile && (
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
                      {importing ? "Importando..." : "Importar Datos"}
                    </Button>
                  </div>
                )}

                {importResult && (
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
                      <div>
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
                        {importResult.success && importResult.total && (
                          <Badge className="bg-green-600 mt-2">
                            {importResult.total} registros importados
                          </Badge>
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