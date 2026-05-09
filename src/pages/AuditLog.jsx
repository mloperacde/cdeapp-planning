import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuditFilters from '@/components/audit/AuditFilters';
import AuditLogRow from '@/components/audit/AuditLogRow';
import AuditStatsBar from '@/components/audit/AuditStatsBar';

const PAGE_SIZE = 50;

const DEFAULT_FILTERS = {
  search: '',
  category: 'all',
  action: 'all',
  dateFrom: '',
  dateTo: '',
};

export default function AuditLog() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);

  // Cargar todos los logs en paralelo
  const { data: employeeLogs = [], isLoading: l1, refetch: r1 } = useQuery({
    queryKey: ['auditLog_employees'],
    queryFn: () => base44.entities.EmployeeAuditLog.list('-timestamp', 1000),
    staleTime: 2 * 60 * 1000,
  });

  const { data: salaryLogs = [], isLoading: l2, refetch: r2 } = useQuery({
    queryKey: ['auditLog_salary'],
    queryFn: () => base44.entities.SalaryAuditLog.list('-change_date', 1000),
    staleTime: 2 * 60 * 1000,
  });

  const { data: absenceLogs = [], isLoading: l3, refetch: r3 } = useQuery({
    queryKey: ['auditLog_absences'],
    queryFn: () => base44.entities.AbsenceAuditLog.list('-hora_evento', 1000),
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = l1 || l2 || l3;

  // Normalizar y combinar todos los logs con categoría
  const allLogs = useMemo(() => {
    const emp = employeeLogs.map(l => ({ ...l, category: 'employee', _ts: l.timestamp || l.created_date || '' }));
    const sal = salaryLogs.map(l => ({ ...l, category: 'salary', action_type: l.action, _ts: l.change_date || l.created_date || '' }));
    const abs = absenceLogs.map(l => ({ ...l, category: 'absence', action_type: l.action_type, _ts: l.hora_evento || l.created_date || '' }));
    return [...emp, ...sal, ...abs].sort((a, b) => (b._ts > a._ts ? 1 : -1));
  }, [employeeLogs, salaryLogs, absenceLogs]);

  // Stats
  const stats = useMemo(() => ({
    total: allLogs.length,
    employee: employeeLogs.length,
    absence: absenceLogs.length,
    salary: salaryLogs.length,
    config: 0,
  }), [allLogs, employeeLogs, absenceLogs, salaryLogs]);

  // Filtrado
  const filtered = useMemo(() => {
    let result = allLogs;

    if (filters.category !== 'all') {
      result = result.filter(l => l.category === filters.category);
    }
    if (filters.action !== 'all') {
      result = result.filter(l => (l.action_type || l.action) === filters.action);
    }
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(l =>
        (l.user_email || l.changed_by || '').toLowerCase().includes(q) ||
        (l.target_employee_name || l.employee_name || '').toLowerCase().includes(q) ||
        (l.change_reason || l.motivo || '').toLowerCase().includes(q)
      );
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter(l => l._ts && new Date(l._ts) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo + 'T23:59:59');
      result = result.filter(l => l._ts && new Date(l._ts) <= to);
    }

    return result;
  }, [allLogs, filters]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const handleRefresh = () => { r1(); r2(); r3(); };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Auditoría y Logs</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Historial de acciones críticas del sistema</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <AuditStatsBar stats={stats} />

      {/* Filters */}
      <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border p-4">
        <AuditFilters
          filters={filters}
          onChange={handleFilterChange}
          onClear={() => { setFilters(DEFAULT_FILTERS); setPage(0); }}
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-border flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {filtered.length} registros
            {filtered.length !== allLogs.length && <span className="text-slate-400"> (de {allLogs.length} totales)</span>}
          </span>
          {totalPages > 1 && (
            <span className="text-xs text-slate-400">Página {page + 1} de {totalPages}</span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay registros de auditoría que coincidan con los filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Acción</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Afectado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((log, i) => (
                  <AuditLogRow key={log.id || i} log={log} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-border flex items-center justify-between">
            <Button
              variant="outline" size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 2 ? i : page - 2 + i;
                if (p >= totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      p === page
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {p + 1}
                  </button>
                );
              })}
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="gap-1"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}