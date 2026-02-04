import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getMachineAlias } from "@/utils/machineAlias";

export default function MaintenanceWorkOrderPDF({ order: maintenance, machine, employees }) {
  const getEmployeeName = (employeeId) => {
    if (!employeeId) return "No asignado";
    const emp = employees?.find(e => e.id === employeeId);
    return emp?.nombre || "No asignado";
  };

  const tareasCompletadas = maintenance.tareas?.filter(t => t.completada).length || 0;
  const totalTareas = maintenance.tareas?.length || 0;

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Encabezado */}
      <div className="border-4 border-blue-900 p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-blue-900 mb-2">
              ORDEN DE TRABAJO DE MANTENIMIENTO
            </h1>
            <p className="text-lg text-blue-700">
              OT-{maintenance.id?.substring(0, 8).toUpperCase() || "N/A"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-600">Fecha de Emisión:</div>
            <div className="font-bold">{format(new Date(), "dd/MM/yyyy", { locale: es })}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t-2 border-blue-200">
          <div>
            <span className="font-semibold">Estado:</span>
            <span className={`ml-2 px-2 py-1 rounded ${
              maintenance.estado === "Completado" ? "bg-green-100 text-green-800" :
              maintenance.estado === "En Proceso" ? "bg-blue-100 text-blue-800" :
              "bg-amber-100 text-amber-800"
            }`}>
              {maintenance.estado || "N/A"}
            </span>
          </div>
          <div>
            <span className="font-semibold">Prioridad:</span>
            <span className={`ml-2 px-2 py-1 rounded ${
              maintenance.prioridad === "Urgente" ? "bg-red-100 text-red-800" :
              maintenance.prioridad === "Alta" ? "bg-orange-100 text-orange-800" :
              "bg-blue-100 text-blue-800"
            }`}>
              {maintenance.prioridad || "Media"}
            </span>
          </div>
        </div>
      </div>

      {/* Información de la Máquina */}
      <div className="border-2 border-slate-300 mb-6">
        <div className="bg-blue-900 text-white p-3">
          <h2 className="text-lg font-bold">1. INFORMACIÓN DE LA MÁQUINA</h2>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div>
              <span className="text-sm text-slate-600">Máquina:</span>
              <div className="font-bold text-lg">{machine?.nombre || "N/A"}</div>
            </div>
            <div>
              <span className="text-sm text-slate-600">Código:</span>
              <div className="font-bold">{machine?.codigo || "N/A"}</div>
            </div>
            <div>
              <span className="text-sm text-slate-600">Ubicación:</span>
              <div className="font-bold">{machine?.ubicacion || "N/A"}</div>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-slate-600">Marca/Modelo:</span>
              <div className="font-bold">{machine?.marca || "N/A"} {machine?.modelo || ""}</div>
            </div>
            <div>
              <span className="text-sm text-slate-600">Nº Serie:</span>
              <div className="font-bold">{machine?.numero_serie || "N/A"}</div>
            </div>
            <div>
              <span className="text-sm text-slate-600">Estado:</span>
              <div className="font-bold">{machine?.estado || "N/A"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Información del Mantenimiento */}
      <div className="border-2 border-slate-300 mb-6">
        <div className="bg-blue-900 text-white p-3">
          <h2 className="text-lg font-bold">2. DETALLES DEL MANTENIMIENTO</h2>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-slate-600">Tipo:</span>
            <div className="font-bold">{maintenance.tipo || "N/A"}</div>
          </div>
          <div>
            <span className="text-sm text-slate-600">Fecha Programada:</span>
            <div className="font-bold">
              {maintenance.fecha_programada 
                ? format(new Date(maintenance.fecha_programada), "dd/MM/yyyy HH:mm", { locale: es })
                : "N/A"}
            </div>
          </div>
          <div>
            <span className="text-sm text-slate-600">Duración Estimada:</span>
            <div className="font-bold">{maintenance.duracion_estimada || 0} horas</div>
          </div>
          {maintenance.duracion_real && (
            <div>
              <span className="text-sm text-slate-600">Duración Real:</span>
              <div className="font-bold">{maintenance.duracion_real} horas</div>
            </div>
          )}
          {maintenance.descripcion && (
            <div className="col-span-2">
              <span className="text-sm text-slate-600">Descripción:</span>
              <div className="mt-1 p-2 bg-slate-50 rounded">{maintenance.descripcion}</div>
            </div>
          )}
        </div>
      </div>

      {/* Personal Asignado */}
      <div className="border-2 border-slate-300 mb-6">
        <div className="bg-blue-900 text-white p-3">
          <h2 className="text-lg font-bold">3. PERSONAL ASIGNADO</h2>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-slate-600">Técnico Asignado:</span>
            <div className="font-bold">{getEmployeeName(maintenance.tecnico_asignado)}</div>
          </div>
          <div>
            <span className="text-sm text-slate-600">Creado Por:</span>
            <div className="font-bold">{getEmployeeName(maintenance.creado_por)}</div>
          </div>
          <div>
            <span className="text-sm text-slate-600">Supervisado Por:</span>
            <div className="font-bold">{getEmployeeName(maintenance.revisado_por)}</div>
          </div>
          <div>
            <span className="text-sm text-slate-600">Verificado Por:</span>
            <div className="font-bold">{getEmployeeName(maintenance.verificado_por)}</div>
          </div>
        </div>
      </div>

      {/* Tareas */}
      <div className="border-2 border-slate-300 mb-6 page-break-inside-avoid">
        <div className="bg-blue-900 text-white p-3">
          <h2 className="text-lg font-bold">
            4. TAREAS REALIZADAS ({tareasCompletadas}/{totalTareas} completadas)
          </h2>
        </div>
        <div className="p-4">
          {maintenance.tareas && maintenance.tareas.length > 0 ? (
            <div className="space-y-4">
              {maintenance.tareas.map((tarea, index) => (
                <div key={index} className="border border-slate-200 rounded p-3">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-5 h-5 border-2 border-slate-400 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                      {tarea.completada && <span className="text-green-600 font-bold">✓</span>}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-base">
                        {index + 1}. {tarea.titulo || "Tarea sin título"}
                      </div>
                      {tarea.descripcion && (
                        <div className="text-sm text-slate-600 mt-1">{tarea.descripcion}</div>
                      )}
                    </div>
                  </div>

                  {tarea.subtareas && tarea.subtareas.length > 0 && (
                    <div className="ml-8 mt-2 space-y-1.5 border-l-2 border-slate-200 pl-4">
                      {tarea.subtareas.map((subtarea, subIndex) => (
                        <div key={subIndex} className="flex items-start gap-2">
                          <div className="w-4 h-4 border-2 border-slate-300 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                            {subtarea.completada && <span className="text-green-600 text-xs font-bold">✓</span>}
                          </div>
                          <span className="text-sm">{subtarea.titulo || "Subtarea"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-400 py-4">
              No hay tareas definidas
            </div>
          )}
        </div>
      </div>

      {/* Registro de Tiempos */}
      <div className="border-2 border-slate-300 mb-6">
        <div className="bg-blue-900 text-white p-3">
          <h2 className="text-lg font-bold">5. REGISTRO DE TIEMPOS</h2>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4">
          {maintenance.fecha_inicio && (
            <div>
              <span className="text-sm text-slate-600">Fecha/Hora Inicio:</span>
              <div className="font-bold">
                {format(new Date(maintenance.fecha_inicio), "dd/MM/yyyy HH:mm", { locale: es })}
              </div>
            </div>
          )}
          {maintenance.fecha_finalizacion && (
            <div>
              <span className="text-sm text-slate-600">Fecha/Hora Finalización:</span>
              <div className="font-bold">
                {format(new Date(maintenance.fecha_finalizacion), "dd/MM/yyyy HH:mm", { locale: es })}
              </div>
            </div>
          )}
          {maintenance.duracion_real && (
            <div className="col-span-2">
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <span className="text-sm text-blue-900 font-semibold">
                  Duración Total: {maintenance.duracion_real.toFixed(2)} horas
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Firmas */}
      <div className="border-2 border-slate-300 mb-6 page-break-before">
        <div className="bg-blue-900 text-white p-3">
          <h2 className="text-lg font-bold">6. VALIDACIÓN Y FIRMAS</h2>
        </div>
        <div className="p-4 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="border border-slate-300 p-4">
              <div className="font-semibold mb-2">Técnico Ejecutor:</div>
              <div className="text-sm text-slate-600 mb-2">{getEmployeeName(maintenance.tecnico_asignado)}</div>
              {maintenance.firma_tecnico ? (
                <img 
                  src={maintenance.firma_tecnico} 
                  alt="Firma Técnico" 
                  className="border border-slate-300 h-24 w-full object-contain bg-white"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="border-2 border-dashed border-slate-300 h-24 flex items-center justify-center text-slate-400">
                  Firma Pendiente
                </div>
              )}
              <div className="text-xs text-slate-500 mt-2">
                Fecha: _______________
              </div>
            </div>

            <div className="border border-slate-300 p-4">
              <div className="font-semibold mb-2">Supervisor:</div>
              <div className="text-sm text-slate-600 mb-2">{getEmployeeName(maintenance.revisado_por)}</div>
              {maintenance.firma_revisado ? (
                <img 
                  src={maintenance.firma_revisado} 
                  alt="Firma Supervisor" 
                  className="border border-slate-300 h-24 w-full object-contain bg-white"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="border-2 border-dashed border-slate-300 h-24 flex items-center justify-center text-slate-400">
                  Firma Pendiente
                </div>
              )}
              <div className="text-xs text-slate-500 mt-2">
                Fecha: _______________
              </div>
            </div>

            <div className="border border-slate-300 p-4">
              <div className="font-semibold mb-2">Verificación Final:</div>
              <div className="text-sm text-slate-600 mb-2">{getEmployeeName(maintenance.verificado_por)}</div>
              {maintenance.firma_verificado ? (
                <img 
                  src={maintenance.firma_verificado} 
                  alt="Firma Verificador" 
                  className="border border-slate-300 h-24 w-full object-contain bg-white"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="border-2 border-dashed border-slate-300 h-24 flex items-center justify-center text-slate-400">
                  Firma Pendiente
                </div>
              )}
              <div className="text-xs text-slate-500 mt-2">
                Fecha: _______________
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notas */}
      {maintenance.notas && (
        <div className="border-2 border-slate-300 mb-6">
          <div className="bg-blue-900 text-white p-3">
            <h2 className="text-lg font-bold">7. OBSERVACIONES Y NOTAS</h2>
          </div>
          <div className="p-4">
            <div className="bg-slate-50 p-3 rounded whitespace-pre-wrap">
              {maintenance.notas}
            </div>
          </div>
        </div>
      )}

      {/* Pie */}
      <div className="border-t-4 border-blue-900 pt-4 mt-8 text-center text-xs text-slate-500">
        <p className="mb-2">
          Documento generado el {format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
        </p>
        <p className="font-semibold">
          Este documento es válido con las firmas digitales de las partes implicadas
        </p>
        <p className="mt-2 text-slate-400">
          Código OT: {maintenance.id || "N/A"} | Sistema de Gestión de Mantenimiento
        </p>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .page-break-before {
            page-break-before: always;
          }

          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
          
          .bg-blue-900, .bg-green-100, .bg-red-100, .bg-amber-100, .bg-orange-100, .bg-blue-100, .bg-slate-50, .bg-blue-50 {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}