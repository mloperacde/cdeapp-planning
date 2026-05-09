import { UserCheck, AlertTriangle, Settings, DollarSign, Clock } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export default function AuditStatsBar({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <StatCard icon={Clock}       label="Total registros"  value={stats.total}    color="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" />
      <StatCard icon={UserCheck}   label="Empleados"        value={stats.employee} color="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
      <StatCard icon={AlertTriangle} label="Ausencias"      value={stats.absence}  color="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" />
      <StatCard icon={DollarSign}  label="Salarial"         value={stats.salary}   color="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
      <StatCard icon={Settings}    label="Configuración"    value={stats.config}   color="bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" />
    </div>
  );
}