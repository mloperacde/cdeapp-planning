import React, { useMemo } from "react";
import { cleanLockerNumber } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Database, Trash2, RefreshCw, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePersistentAppConfig } from "@/hooks/usePersistentAppConfig";
import { buildLockerAudit, canonicalVestuario } from "@/utils/lockerAudit";
import LockerAuditIssues from "./LockerAuditIssues";

function StatCard({ label, hint, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 border-slate-200 text-slate-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
    green: "bg-green-50 border-green-200 text-green-700",
    amber: "bg-amber-50 border-amber-300 text-amber-800",
    red: "bg-red-50 border-red-300 text-red-700",
  };
  const badgeTones = {
    slate: "bg-slate-600",
    blue: "bg-blue-600",
    indigo: "bg-indigo-600",
    green: "bg-green-600",
    amber: "bg-amber-600",
    red: "bg-red-600",
  };
  return (
    <div className={`p-3 rounded-lg border-2 ${tones[tone]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">{label}</span>
        <Badge className={badgeTones[tone]}>{value}</Badge>
      </div>
      <p className="text-[11px] opacity-80">{hint}</p>
    </div>
  );
}

export default function LockerAudit({ employees, lockerAssignments, lockerRoomConfigs = [] }) {
  const queryClient = useQueryClient();

  const { data: config = { mode: "all", departments: {} } } = usePersistentAppConfig(
    "locker_requirement_config",
    { mode: "all", departments: {} },
    "lockerRequirementConfig",
    false,
    { enabled: true }
  );

  const audit = useMemo(() => {
    const requiresLocker = (emp) => {
      if ((emp.estado_empleado || "Alta") !== "Alta") return false;
      if (config.mode !== "config") return true;
      const deptConfig = config.departments?.[emp.departamento];
      if (!deptConfig || !deptConfig.enabled) return false;
      if (deptConfig.allPositions) return true;
      return (deptConfig.positions || []).includes(emp.puesto);
    };

    return buildLockerAudit({
      employees,
      lockerAssignments,
      lockerRoomConfigs,
      requiresLocker,
    });
  }, [employees, lockerAssignments, lockerRoomConfigs, config]);

  const sincronizables = audit.desincronizadas.filter(
    (d) => d.activo && d.fichaNumero && d.tipo !== "solo_modulo"
  );
  const sinCoincidencia = audit.desincronizadas.filter((d) => d.tipo !== "solo_modulo");
  const totalProblemas =
    audit.sinTaquilla.length +
    audit.huerfanas.length +
    audit.duplicadas.length +
    sinCoincidencia.length +
    audit.fueraCatalogo.length +
    audit.vestuariosInvalidos.length;

  const deleteDuplicatesMutation = useMutation({
    mutationFn: async (grupos) => {
      const ids = [];
      grupos.forEach((grupo) => {
        const delModulo = grupo.entries.filter((e) => e.source === "modulo" && e.assignment);
        if (delModulo.length < 2) return;
        const ordenados = [...delModulo].sort((a, b) => {
          const da = new Date(a.assignment.fecha_asignacion || a.assignment.created_date || 0).getTime();
          const db = new Date(b.assignment.fecha_asignacion || b.assignment.created_date || 0).getTime();
          return db - da;
        });
        ordenados.slice(1).forEach((e) => ids.push(e.assignment.id));
      });

      for (const id of ids) {
        await base44.entities.LockerAssignment.delete(id);
      }
      return ids.length;
    },
    onSuccess: (borrados) => {
      queryClient.invalidateQueries({ queryKey: ["lockerAssignments"] });
      if (borrados > 0) {
        toast.success(`${borrados} registro(s) duplicado(s) eliminados del módulo`);
      } else {
        toast.info("Los duplicados no provienen del módulo: revisa las fichas de empleado");
      }
    },
    onError: (error) => toast.error(`Error al eliminar duplicados: ${error.message}`),
  });

  const deleteOrphanedMutation = useMutation({
    mutationFn: async (asignaciones) => {
      for (const la of asignaciones) {
        await base44.entities.LockerAssignment.delete(la.id);
      }
      return asignaciones.length;
    },
    onSuccess: (total) => {
      queryClient.invalidateQueries({ queryKey: ["lockerAssignments"] });
      toast.success(`${total} asignación(es) huérfana(s) eliminada(s)`);
    },
    onError: (error) => toast.error(`Error al eliminar huérfanas: ${error.message}`),
  });

  const syncFromFichaMutation = useMutation({
    mutationFn: async (filas) => {
      let creadas = 0;
      let actualizadas = 0;
      const omitidas = [];

      for (const fila of filas) {
        const vestuario = canonicalVestuario(fila.fichaVestuario);
        const numero = cleanLockerNumber(fila.fichaNumero);
        if (!vestuario || !numero) {
          omitidas.push(`${fila.nombre} (vestuario no válido)`);
          continue;
        }

        const conflicto = lockerAssignments.find(
          (la) =>
            String(la.employee_id) !== String(fila.employeeId) &&
            la.requiere_taquilla !== false &&
            canonicalVestuario(la.vestuario) === vestuario &&
            cleanLockerNumber(la.numero_taquilla_actual) === numero
        );
        if (conflicto) {
          const ocupante = employees.find((e) => String(e.id) === String(conflicto.employee_id));
          omitidas.push(`${fila.nombre} (taquilla ocupada por ${ocupante?.nombre || "otro empleado"})`);
          continue;
        }

        const existente = lockerAssignments.find(
          (la) => String(la.employee_id) === String(fila.employeeId)
        );
        const payload = {
          employee_id: fila.employeeId,
          requiere_taquilla: true,
          vestuario,
          numero_taquilla_actual: numero,
          numero_taquilla_nuevo: "",
        };

        if (existente) {
          await base44.entities.LockerAssignment.update(existente.id, payload);
          actualizadas++;
        } else {
          await base44.entities.LockerAssignment.create({
            ...payload,
            fecha_asignacion: new Date().toISOString(),
            historial_cambios: [
              {
                fecha: new Date().toISOString(),
                vestuario_anterior: "",
                taquilla_anterior: "",
                vestuario_nuevo: vestuario,
                taquilla_nueva: numero,
                motivo: "Sincronización desde auditoría",
              },
            ],
          });
          creadas++;
        }
      }

      return { creadas, actualizadas, omitidas };
    },
    onSuccess: ({ creadas, actualizadas, omitidas }) => {
      queryClient.invalidateQueries({ queryKey: ["lockerAssignments"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employeeMasterDatabase"] });
      if (creadas + actualizadas > 0) {
        toast.success(`${creadas} creada(s) y ${actualizadas} actualizada(s) en el módulo`);
      }
      if (omitidas.length > 0) {
        toast.warning(`No se pudieron sincronizar: ${omitidas.join(", ")}`, { duration: 8000 });
      }
    },
    onError: (error) => toast.error(`Error al sincronizar: ${error.message}`),
  });

  const hayDuplicadosModulo = audit.duplicadas.some(
    (g) => g.entries.filter((e) => e.source === "modulo").length > 1
  );

  return (
    <div className="space-y-6">
      <Card className={`shadow-lg border-2 ${totalProblemas > 0 ? "bg-amber-50 border-amber-300" : "bg-green-50 border-green-300"}`}>
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Auditoría de asignaciones
            </CardTitle>
            <div className="flex items-center gap-2">
              {sincronizables.length > 0 && (
                <Button
                  onClick={() => syncFromFichaMutation.mutate(sincronizables)}
                  disabled={syncFromFichaMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {syncFromFichaMutation.isPending ? "Sincronizando..." : "Sincronizar fichas"}
                </Button>
              )}
              {hayDuplicadosModulo && (
                <Button
                  onClick={() => deleteDuplicatesMutation.mutate(audit.duplicadas)}
                  disabled={deleteDuplicatesMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteDuplicatesMutation.isPending ? "Eliminando..." : "Eliminar duplicados del módulo"}
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Revisa módulo de vestuarios y fichas de empleado a la vez: es la única forma de ver la asignación real.
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
            <StatCard label="Activos" hint="Empleados en alta" value={audit.stats.totalActive} tone="blue" />
            <StatCard label="Con derecho" hint="Requieren taquilla (según config)" value={audit.stats.totalRequireLocker} tone="indigo" />
            <StatCard label="Asignaciones" hint="Registros en el módulo" value={audit.stats.totalAssignments} tone="slate" />
            <StatCard label="Solo en ficha" hint="Sin registro en el módulo" value={audit.stats.conTaquillaFicha} tone={audit.stats.conTaquillaFicha > 0 ? "amber" : "green"} />
            <StatCard label="Sin taquilla" hint="Con derecho y sin asignar" value={audit.sinTaquilla.length} tone={audit.sinTaquilla.length > 0 ? "amber" : "green"} />
            <StatCard label="Duplicadas" hint="Taquilla con varios empleados" value={audit.duplicadas.length} tone={audit.duplicadas.length > 0 ? "red" : "green"} />
            <StatCard label="Ficha ≠ módulo" hint="Datos distintos o sin registrar" value={sinCoincidencia.length} tone={sinCoincidencia.length > 0 ? "red" : "green"} />
            <StatCard label="No válidas" hint="Fuera de catálogo o vestuario" value={audit.fueraCatalogo.length + audit.vestuariosInvalidos.length} tone={audit.fueraCatalogo.length + audit.vestuariosInvalidos.length > 0 ? "amber" : "green"} />
            <StatCard label="Huérfanas" hint="Asignaciones sin empleado" value={audit.huerfanas.length} tone={audit.huerfanas.length > 0 ? "red" : "green"} />
          </div>

          {totalProblemas === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-semibold text-green-900">Base de datos consistente</p>
              <p className="text-sm text-slate-600 mt-1">No se detectaron duplicidades ni incoherencias</p>
            </div>
          ) : (
            <div className="space-y-4">
              <LockerAuditIssues
                duplicadas={audit.duplicadas}
                desincronizadas={audit.desincronizadas}
                fueraCatalogo={audit.fueraCatalogo}
                vestuariosInvalidos={audit.vestuariosInvalidos}
                huerfanas={audit.huerfanas}
                onSyncFromFicha={(filas) => syncFromFichaMutation.mutate(filas)}
                onDeleteOrphans={(filas) => deleteOrphanedMutation.mutate(filas)}
                syncPending={syncFromFichaMutation.isPending}
                deletePending={deleteOrphanedMutation.isPending}
              />

              {audit.sinTaquilla.length > 0 && (
                <div className="border-2 border-amber-300 rounded-lg p-4 bg-amber-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Empleados con derecho a taquilla sin asignar
                    </h3>
                    <Badge className="bg-amber-600 text-white">{audit.sinTaquilla.length}</Badge>
                  </div>
                  <p className="text-xs text-amber-800 mt-2">
                    Ver detalle en la pestaña <strong>"Sin Taquilla"</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {audit.libres.length > 0 && (
            <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50 mt-4">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Taquillas libres por vestuario
              </h3>
              <div className="space-y-3">
                {audit.libres.map((v) => (
                  <div key={v.vestuario} className="bg-white rounded-lg border border-blue-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-slate-800">{v.vestuario}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-slate-50">{v.ocupadas}/{v.totalInstaladas} ocupadas</Badge>
                        <Badge className={v.libresCount > 0 ? "bg-green-600 text-white" : "bg-red-600 text-white"}>
                          {v.libresCount} libres
                        </Badge>
                      </div>
                    </div>
                    {v.libresCount > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {v.libres.map((num) => (
                          <span key={num} className="px-2 py-0.5 text-xs font-mono rounded bg-green-100 text-green-800 border border-green-300">
                            {num}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-red-700 font-medium">Sin taquillas libres — todas ocupadas</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}