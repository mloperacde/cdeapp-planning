import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw, CheckCircle2, AlertCircle, AlertTriangle, Users,
  UserPlus, UserMinus, ArrowUpDown, Database, Link2, KeyRound, Search
} from "lucide-react";
import { toast } from "sonner";

export default function CucoSyncDashboard() {
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [syncingId, setSyncingId] = useState(null);

  const runCheck = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await base44.functions.invoke("cucoCheckConsistency", {});
      setCheckResult(res.data);
      if (res.data.consistent) {
        toast.success("✓ Las bases de datos están sincronizadas");
      } else {
        toast.warning("⚠ Se encontraron discrepancias entre las bases de datos");
      }
    } catch (err) {
      toast.error("Error al verificar: " + err.message);
    } finally {
      setChecking(false);
    }
  };

  const fixEmployeeCode = async (employeeId, newCode, nombre) => {
    if (!confirm(`¿Actualizar el código de ${nombre} de su valor actual a "${newCode}" (código real en Cuco360)?`)) return;
    try {
      await base44.entities.EmployeeMasterDatabase.update(employeeId, { codigo_empleado: newCode });
      toast.success(`✓ Código de ${nombre} actualizado a ${newCode}`);
      await runCheck();
    } catch (err) {
      toast.error("Error al actualizar código: " + err.message);
    }
  };

  const syncEmployee = async (employeeId, action, nombre) => {
    setSyncingId(employeeId + action);
    try {
      const res = await base44.functions.invoke("cucoSyncEmployee", { action, employeeId });
      const status = res.data?.result?.status;
      if (status === 200 || status === 201) {
        toast.success(`✓ ${nombre} sincronizado correctamente en Cuco360`);
        // Refrescar check
        await runCheck();
      } else {
        const msg = res.data?.result?.data?.message || res.data?.result?.data?.error || "Error desconocido";
        toast.error(`Error al sincronizar ${nombre}: ${msg}`);
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setSyncingId(null);
    }
  };

  const cr = checkResult;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Link2 className="w-6 h-6 text-blue-600" />
            Sincronización Cuco360
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Verifica y sincroniza empleados entre la Base de Datos Maestra y Cuco360
          </p>
        </div>
        <Button
          onClick={runCheck}
          disabled={checking}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Verificando..." : "Verificar Consistencia"}
        </Button>
      </div>

      {/* Info Box */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <Database className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-300 text-sm">
          <strong>Flujo de sincronización:</strong> La Base de Datos Maestra (CDEApp) es la fuente de verdad. 
          Los cambios se propagan a Cuco360. Empleados marcados como <em>sujeto a control horario</em> deben 
          tener <strong>PIN y número de tarjeta</strong> configurados obligatoriamente.
        </AlertDescription>
      </Alert>

      {/* KPIs */}
      {cr && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">En BD Maestra</p>
                  <p className="text-2xl font-bold">{cr.summary.total_our_active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <Database className="w-8 h-8 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">En Cuco360</p>
                  <p className="text-2xl font-bold">{cr.summary.total_cuco_active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-xs text-slate-500">En Ambas</p>
                  <p className="text-2xl font-bold text-green-600">{cr.summary.in_both}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-8 h-8 ${cr.consistent ? "text-green-500" : "text-red-500"}`} />
                <div>
                  <p className="text-xs text-slate-500">Discrepancias</p>
                  <p className={`text-2xl font-bold ${cr.consistent ? "text-green-600" : "text-red-600"}`}>
                    {cr.summary.only_in_ours + cr.summary.only_in_cuco}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Estado general */}
      {cr && (
        <Card className={cr.consistent ? "border-green-300" : "border-red-300"}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              {cr.consistent ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-700">Las bases de datos están sincronizadas</p>
                    <p className="text-xs text-slate-500">Verificado: {new Date(cr.checked_at).toLocaleString("es-ES")}</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-700">Se detectaron discrepancias — requieren acción</p>
                    <p className="text-xs text-slate-500">Verificado: {new Date(cr.checked_at).toLocaleString("es-ES")}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discrepancias: Solo en nuestra BD */}
      {cr && cr.discrepancies.only_in_ours.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-orange-700">
              <UserPlus className="w-4 h-4" />
              Empleados en BD Maestra pero NO en Cuco360 ({cr.discrepancies.only_in_ours.length})
            </CardTitle>
            <p className="text-xs text-slate-500">
              Comparación realizada exclusivamente por <strong>código de empleado</strong> (cod_int_empleado). 
              Estos empleados deben crearse en Cuco360 o revisar si tienen asignado PIN/tarjeta.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-orange-50 dark:bg-orange-950/20">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-600">Código</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-600">Nombre</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-600">PIN / Tarjeta</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-600">¿Match por nombre?</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-slate-600">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cr.discrepancies.only_in_ours.map(e => (
                  <EmployeeDiscrepancyRow
                    key={e.codigo}
                    emp={e}
                    action="create"
                    actionLabel="Crear en Cuco360"
                    actionClass="bg-orange-600 hover:bg-orange-700"
                    syncingId={syncingId}
                    onSync={syncEmployee}
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Discrepancias: Solo en Cuco360 */}
      {cr && cr.discrepancies.only_in_cuco.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <UserMinus className="w-4 h-4" />
              Empleados en Cuco360 pero NO en BD Maestra ({cr.discrepancies.only_in_cuco.length})
            </CardTitle>
            <p className="text-xs text-slate-500">Revisar manualmente — puede tratarse de empleados no registrados en el maestro</p>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-red-50 dark:bg-red-950/20">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-600">Código Cuco</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-600">Nombre</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-slate-600">Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cr.discrepancies.only_in_cuco.map(e => (
                  <tr key={e.codigo} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-slate-600">{e.codigo}</td>
                    <td className="px-4 py-2.5 font-medium">{e.nombre}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                        Sin registro en BD Maestra
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Acciones manuales rápidas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-blue-600" />
            Sincronización Manual por Empleado
          </CardTitle>
          <p className="text-xs text-slate-500">
            Usa el módulo de <strong>Base de Datos de Empleados</strong> para crear o modificar empleados. 
            Los cambios se pueden sincronizar a Cuco360 desde aquí o directamente desde el perfil del empleado.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
              <UserPlus className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-sm">Alta de Empleado</p>
              <p className="text-xs text-slate-500 mt-1">
                Crear en BD Maestra → sincroniza a Cuco360 automáticamente
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
              <RefreshCw className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="font-semibold text-sm">Actualización</p>
              <p className="text-xs text-slate-500 mt-1">
                Modificar datos en BD Maestra → sincroniza cambios a Cuco360
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
              <UserMinus className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="font-semibold text-sm">Baja de Empleado</p>
              <p className="text-xs text-slate-500 mt-1">
                Cambiar estado a "Baja" en BD Maestra → da de baja en Cuco360
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmployeeDiscrepancyRow({ emp, action, actionLabel, actionClass, syncingId, onSync }) {
  const isLoading = syncingId === emp.id + action;

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
      <td className="px-4 py-2.5 font-mono text-slate-600">{emp.codigo}</td>
      <td className="px-4 py-2.5 font-medium">{emp.nombre}</td>
      <td className="px-4 py-2.5">
        {emp.tiene_credenciales !== undefined ? (
          emp.tiene_credenciales ? (
            <div className="flex items-center gap-1 text-green-600 text-xs">
              <KeyRound className="w-3 h-3" />
              <span>PIN: {emp.pin ?? "—"} / T: {emp.numero_tarjeta ?? "—"}</span>
            </div>
          ) : (
            <Badge variant="outline" className="text-red-500 border-red-200 text-[10px]">
              Sin PIN ni tarjeta
            </Badge>
          )
        ) : null}
      </td>
      <td className="px-4 py-2.5">
        {emp.posible_match_cuco ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-1 text-amber-700 text-xs">
              <Search className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                Mismo nombre en Cuco con código <strong>{emp.posible_match_cuco.cod_int}</strong>
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-[10px] h-6 border-amber-400 text-amber-700 hover:bg-amber-50 px-2"
              onClick={() => fixEmployeeCode(emp.id, emp.posible_match_cuco.cod_int, emp.nombre)}
            >
              Corregir código → {emp.posible_match_cuco.cod_int}
            </Button>
          </div>
        ) : (
          <span className="text-[10px] text-slate-400">No encontrado por nombre</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <Button
          size="sm"
          disabled={isLoading || !emp.id}
          className={`text-xs h-7 ${actionClass}`}
          onClick={() => onSync(emp.id, action, emp.nombre)}
        >
          {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : actionLabel}
        </Button>
      </td>
    </tr>
  );
}