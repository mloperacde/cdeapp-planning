import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, ArrowLeft, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EmployeeAbsenceInfoPage() {
  const { data: absenceTypes } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list('orden'),
    initialData: [],
  });

  const visibleTypes = absenceTypes.filter(t => t.visible_empleados && t.activo);

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 print:hidden">
          <Link to={createPageUrl("AbsenceTypeInfo")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8 print:mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 print:text-2xl">
              <FileText className="w-8 h-8 text-blue-600 print:hidden" />
              Guía de Permisos y Ausencias
            </h1>
            <p className="text-slate-600 mt-1 print:text-sm">
              Información para empleados sobre tipos de ausencias y permisos
            </p>
          </div>
          <Button
            onClick={handleDownloadPDF}
            className="bg-blue-600 hover:bg-blue-700 print:hidden"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </Button>
        </div>

        {/* Introducción */}
        <Card className="mb-6 bg-blue-50 border-2 border-blue-300 print:border print:border-blue-300">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Info className="w-6 h-6 text-blue-600 mt-0.5 print:hidden" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-2">Información General</p>
                <p className="mb-2">
                  Esta guía resume los principales permisos recogidos en el Estatuto de los Trabajadores 
                  que están disponibles para los empleados de la empresa.
                </p>
                <p>
                  Para solicitar cualquiera de estos permisos, debes comunicarlo a través del sistema 
                  de gestión de ausencias o la aplicación móvil, proporcionando la documentación necesaria.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listado de Permisos */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 print:text-xl">
            Principales Permisos Retribuidos
          </h2>

          {visibleTypes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-slate-500">
                No hay tipos de ausencias configurados para mostrar a los empleados.
              </CardContent>
            </Card>
          ) : (
            visibleTypes.map((type, index) => (
              <Card key={type.id} className="shadow-lg border-0 bg-white print:border print:border-slate-200 print:shadow-none print:break-inside-avoid">
                <CardHeader className="border-b border-slate-100 bg-slate-50">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{index + 1}. {type.nombre}</span>
                      {type.remunerada && (
                        <Badge className="bg-green-100 text-green-800">Remunerado</Badge>
                      )}
                    </div>
                    {type.articulo_estatuto && (
                      <span className="text-xs text-slate-500 font-normal">
                        {type.articulo_estatuto}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {type.hecho_causante && (
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1">Hecho Causante:</h4>
                        <p className="text-sm text-slate-700">{type.hecho_causante}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1">Duración:</h4>
                        <p className="text-sm text-slate-700">
                          {type.duracion_dias ? `${type.duracion_dias} días` : type.duracion_descripcion || "Variable"}
                        </p>
                        {type.ampliacion_desplazamiento && type.dias_ampliacion && (
                          <p className="text-sm text-orange-700 mt-1">
                            + {type.dias_ampliacion} días adicionales si requiere desplazamiento
                          </p>
                        )}
                      </div>

                      {type.inicio_disfrute && (
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-1">Inicio y Periodo:</h4>
                          <p className="text-sm text-slate-700">{type.inicio_disfrute}</p>
                        </div>
                      )}
                    </div>

                    {type.consideraciones && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 print:border-amber-300">
                        <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          Consideraciones Especiales:
                        </h4>
                        <p className="text-sm text-amber-800">{type.consideraciones}</p>
                      </div>
                    )}

                    {type.requiere_aprobacion && (
                      <div className="text-sm text-slate-600 italic">
                        ℹ️ Este permiso requiere aprobación previa
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-lg print:border-slate-300 print:mt-6">
          <h3 className="font-semibold text-slate-900 mb-2">Información Adicional</h3>
          <div className="text-sm text-slate-700 space-y-2">
            <p>
              • Para solicitar cualquiera de estos permisos, debes comunicarlo con la mayor antelación posible 
              a través del sistema de gestión de ausencias.
            </p>
            <p>
              • Algunos permisos pueden requerir documentación justificativa (certificados médicos, 
              certificados de matrimonio, etc.).
            </p>
            <p>
              • Los permisos retribuidos mantienen tu salario completo durante el periodo de ausencia.
            </p>
            <p>
              • Si tienes dudas sobre algún permiso, consulta con el departamento de Recursos Humanos.
            </p>
          </div>
        </div>

        {/* Print styles */}
        <style>{`
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .print\\:hidden {
              display: none !important;
            }
            .print\\:border {
              border-width: 1px !important;
            }
            .print\\:break-inside-avoid {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
