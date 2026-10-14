import React from "react";
import { Baby, HeartHandshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fmtHours } from "@/utils/workdayCompliance";

/**
 * Definición única de las columnas del Resumen por Empleado.
 * La misma definición alimenta la tabla en pantalla y el Excel exportado,
 * de modo que ambos mantienen siempre la misma estructura y orden.
 *
 * - get(e): valor que se escribe en el Excel.
 * - render(e): cómo se muestra en pantalla (por defecto, el valor del Excel).
 * - excelOnly: columna que solo va al Excel (en pantalla ya se indica con iconos).
 */
export const SUMMARY_COLUMNS = [
  {
    label: "Empleado",
    get: (e) => e.nombre,
    render: (e) => (
      <div className="flex items-center gap-1">
        {e.hasMaternity && <Baby className="w-3 h-3 text-pink-500 flex-shrink-0" />}
        {e.hasMarriage && <HeartHandshake className="w-3 h-3 text-purple-500 flex-shrink-0" />}
        {e.nombre}
      </div>
    ),
    headClassName: "text-xs",
    cellClassName: "text-xs font-medium",
  },
  {
    label: "Departamento",
    get: (e) => e.departamento || "",
    headClassName: "text-xs",
    cellClassName: "text-xs",
  },
  {
    label: "Puesto",
    get: (e) => e.puesto || "",
    headClassName: "text-xs",
    cellClassName: "text-xs",
  },
  {
    label: "Antig.",
    get: (e) => e.antiguedad || "",
    headClassName: "text-xs text-center",
    cellClassName: "text-xs text-center text-slate-500",
  },
  {
    label: "Est. emp.",
    get: (e) => e.estado_empleado || "",
    render: (e) => (
      <Badge className={e.estado_empleado === "Alta" ? "bg-green-100 text-green-700 text-[10px]" : e.estado_empleado === "Baja" ? "bg-red-100 text-red-700 text-[10px]" : "bg-amber-100 text-amber-700 text-[10px]"}>
        {e.estado_empleado}
      </Badge>
    ),
    headClassName: "text-xs text-center",
    cellClassName: "text-xs text-center",
  },
  {
    label: "Días ausente (periodo)",
    get: (e) => e.daysPeriod || 0,
    headClassName: "text-xs text-center",
    cellClassName: "text-xs text-center font-semibold",
  },
  {
    label: "Episodios (periodo)",
    get: (e) => e.episodesPeriod || 0,
    headClassName: "text-xs text-center",
    cellClassName: "text-xs text-center",
  },
  {
    label: "Ep. más largo (periodo)",
    get: (e) => e.longestPeriod || 0,
    headClassName: "text-xs text-center",
    cellClassName: "text-xs text-center text-slate-600",
  },
  {
    label: "Días aus. 12 meses",
    get: (e) => e.days12 || 0,
    headClassName: "text-xs text-center",
    cellClassName: "text-xs text-center font-semibold text-sky-600",
  },
  {
    label: "Días mes en curso",
    get: (e) => e.daysMonth || 0,
    headClassName: "text-xs text-center",
    cellClassName: "text-xs text-center font-semibold",
  },
  {
    label: "Ep. mes en curso",
    get: (e) => e.episodesMonth || 0,
    headClassName: "text-xs text-center",
    cellClassName: "text-xs text-center",
  },
  {
    label: "Retrasos (periodo)",
    title: "Días del periodo con retraso sobre la entrada de su turno",
    get: (e) => e.compliancePeriod?.delayDays || 0,
    headClassName: "text-xs text-center",
    cellClassName: "text-xs text-center text-amber-600",
  },
  {
    label: "Salidas ant. (periodo)",
    title: "Días del periodo con salida antes de la hora de su turno",
    get: (e) => e.compliancePeriod?.earlyDays || 0,
    headClassName: "text-xs text-center",
    cellClassName: "text-xs text-center text-orange-600",
  },
  {
    label: "Horas no trab. (periodo)",
    title: "Horas del periodo no trabajadas (retraso + salida anticipada)",
    get: (e) => Math.round(((e.compliancePeriod?.missingMinutes || 0) / 60) * 10) / 10,
    render: (e) => ((e.compliancePeriod?.missingMinutes || 0) > 0 ? fmtHours(e.compliancePeriod.missingMinutes) : "—"),
    headClassName: "text-xs text-center",
    cellClassName: "text-xs text-center text-red-600 font-medium",
  },
  {
    label: "% cumpl. (periodo)",
    title: "Porcentaje de jornadas laborables del periodo completadas correctamente",
    get: (e) => (e.compliancePeriod?.evaluatedDays ? `${e.compliancePeriod.complianceRate}%` : "—"),
    headClassName: "text-xs text-center",
    cellClassName: "text-xs text-center",
  },
  {
    label: "Estado",
    get: (e) => e.estado || "",
    render: (e) => (
      <Badge className={e.estado === "Ausente" ? "bg-red-100 text-red-700 text-[10px]" : "bg-green-100 text-green-700 text-[10px]"}>
        {e.estado}
      </Badge>
    ),
    headClassName: "text-xs text-center",
    cellClassName: "text-xs text-center",
  },
  {
    label: "Maternidad",
    get: (e) => (e.hasMaternity ? "Sí" : "No"),
    excelOnly: true,
  },
  {
    label: "Matrimonio",
    get: (e) => (e.hasMarriage ? "Sí" : "No"),
    excelOnly: true,
  },
];

// Columnas visibles en la tabla
export const SUMMARY_VISIBLE_COLUMNS = SUMMARY_COLUMNS.filter((c) => !c.excelOnly);

// Fila del Excel manteniendo el mismo orden de columnas que la tabla
export const toSummaryExportRow = (e) =>
  Object.fromEntries(SUMMARY_COLUMNS.map((c) => [c.label, c.get(e)]));