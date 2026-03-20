import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BookOpen, Users, CheckCircle2, AlertCircle, Clock, Sparkles } from 'lucide-react';

export default function TrainingDashboardStats() {
  const { data: modules = [] } = useQuery({
    queryKey: ['training-programs'],
    queryFn: () => base44.entities.TrainingProgram.list()
  });
  const { data: assignments = [] } = useQuery({
    queryKey: ['training-assignments-all'],
    queryFn: () => base44.entities.TrainingAssignment.list()
  });

  const stats = [
    { label: 'Módulos Totales', value: modules.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Publicados', value: modules.filter(m => m.estado === 'Publicado').length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Generados por IA', value: modules.filter(m => m.generadoPorIA).length, icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: 'Asignaciones', value: assignments.length, icon: Users, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/20' },
    { label: 'Completadas', value: assignments.filter(a => a.estado === 'Completado').length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Vencidas', value: assignments.filter(a => a.estado === 'Vencido').length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {stats.map(stat => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-3 flex flex-col items-center text-center`}>
            <Icon className={`w-5 h-5 ${stat.color} mb-1`} />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
            <p className="text-xs text-slate-500 leading-tight mt-0.5">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}