import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CalendarDays } from "lucide-react";
import { countCompensationDays, sumPendingVacationDays } from "@/utils/vacationPendingCompensation";

export default function VacationCompensationField({
  employeeId,
  fechaInicio,
  fechaFin,
  checked,
  onCheckedChange,
}) {
  const { data: balances = [] } = useQuery({
    queryKey: ["vacationPendingBalances", "employee", employeeId],
    queryFn: () => base44.entities.VacationPendingBalance.filter({ employee_id: employeeId }),
    enabled: !!employeeId,
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => base44.entities.Holiday.list(),
    staleTime: 10 * 60 * 1000,
  });

  const disponibles = sumPendingVacationDays(balances);
  const requeridos = countCompensationDays(fechaInicio, fechaFin, holidays);
  const sinFechas = !fechaInicio || !fechaFin;
  const suficiente = requeridos > 0 && requeridos <= disponibles;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20 dark:border-emerald-900 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Checkbox
          id="compensacion-vacaciones"
          checked={checked}
          disabled={disponibles <= 0 || sinFechas}
          onCheckedChange={(value) => onCheckedChange?.(!!value)}
        />
        <div className="space-y-0.5">
          <Label
            htmlFor="compensacion-vacaciones"
            className="text-sm font-medium text-emerald-900 dark:text-emerald-100 cursor-pointer"
          >
            Justificar por compensación de vacaciones pendientes
          </Label>
          <p className="text-xs text-emerald-800 dark:text-emerald-300">
            Los días laborables de la ausencia se descuentan del saldo de vacaciones pendientes de disfrutar y el saldo se recalcula automáticamente.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className="border-emerald-300 text-emerald-800 dark:text-emerald-200">
          <CalendarDays className="w-3 h-3 mr-1" />
          Saldo disponible: {disponibles} día(s)
        </Badge>
        {!sinFechas && (
          <Badge variant="outline" className="border-emerald-300 text-emerald-800 dark:text-emerald-200">
            Días a compensar: {requeridos}
          </Badge>
        )}
      </div>

      {checked && !suficiente && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          {sinFechas
            ? "Indica fecha de inicio y fin (conocida) para poder compensar la ausencia."
            : `Saldo insuficiente: ${disponibles} día(s) disponibles y se necesitan ${requeridos}.`}
        </p>
      )}

      {disponibles <= 0 && (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          El empleado no tiene saldo de vacaciones pendientes de disfrutar.
        </p>
      )}
    </div>
  );
}