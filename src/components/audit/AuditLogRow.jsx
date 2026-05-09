import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ACTION_CONFIG = {
  create:  { label: 'Creación',      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  update:  { label: 'Modificación',  color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  delete:  { label: 'Eliminación',   color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  approve: { label: 'Aprobación',    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  reject:  { label: 'Rechazo',       color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  export:  { label: 'Exportación',   color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  view_sensitive: { label: 'Vista sensible', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
};

const CATEGORY_CONFIG = {
  employee: { label: 'Empleado',      color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  absence:  { label: 'Ausencia',      color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  salary:   { label: 'Salarial',      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  config:   { label: 'Configuración', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
  presence: { label: 'Presencia',     color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
};

function formatDate(ts) {
  if (!ts) return '—';
  try {
    return format(new Date(ts), 'dd/MM/yyyy HH:mm', { locale: es });
  } catch {
    return ts;
  }
}

export default function AuditLogRow({ log }) {
  const action = ACTION_CONFIG[log.action_type || log.action] || { label: log.action_type || log.action || '—', color: 'bg-slate-100 text-slate-600' };
  const category = CATEGORY_CONFIG[log.category] || null;
  const timestamp = log.timestamp || log.change_date || log.hora_evento || log.created_date;
  const actor = log.user_email || log.changed_by || log.changed_by_name || '—';
  const target = log.target_employee_name || log.employee_name || log.entity_type || '—';
  const detail = log.change_reason || log.motivo || (log.details ? JSON.stringify(log.details).slice(0, 80) : '') || '—';

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {formatDate(timestamp)}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${action.color}`}>
          {action.label}
        </span>
      </td>
      {category && (
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${category.color}`}>
            {category.label}
          </span>
        </td>
      )}
      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
        {target}
      </td>
      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
        {actor}
      </td>
      <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 max-w-xs truncate">
        {detail}
      </td>
    </tr>
  );
}