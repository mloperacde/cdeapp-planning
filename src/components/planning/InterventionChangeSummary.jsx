import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';

const TYPE_COLORS = {
  'Mecánico':  'bg-orange-100 text-orange-800',
  'Calidad':   'bg-blue-100 text-blue-800',
  'Supply':    'bg-purple-100 text-purple-800',
  'Almacén':   'bg-green-100 text-green-800',
  'Otros':     'bg-slate-100 text-slate-700',
};

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Handle "DD/MM/YYYY" and "DD/MM/YYYY HH:mm" formats
  const match = String(dateStr).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) return new Date(`${match[3]}-${match[2]}-${match[1]}`);
  return new Date(dateStr);
}

function formatDate(dateStr) {
  if (!dateStr) return 'Sin fecha';
  const d = parseDate(dateStr);
  if (!d || isNaN(d)) return dateStr;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toSortKey(dateStr) {
  if (!dateStr) return '';
  const match = String(dateStr).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return dateStr;
}

function getTotalMinutes(interventions) {
  return interventions.reduce((s, i) => s + (i.duration_minutes || 0), 0);
}

function getApplicableInterventions(configs, orderA, orderB) {
  return configs.filter(cfg => {
    if (!cfg.active) return false;
    const condition = cfg.trigger_condition || 'Siempre';
    if (condition === 'Siempre') return true;
    if (condition === 'Cambio de producto') return orderA.product_article_code !== orderB.product_article_code;
    if (condition === 'Cambio de cliente') return orderA.client_name !== orderB.client_name;
    if (condition === 'Cambio de formato') return orderA.material_type !== orderB.material_type;
    return false;
  });
}

export default function InterventionChangeSummary({ interventionConfigs }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [orders, machs] = await Promise.all([
        base44.entities.WorkOrder.list('priority', 2000),
        base44.entities.MachineMasterDatabase.list('-created_date', 200),
      ]);
      setWorkOrders(Array.isArray(orders) ? orders : []);
      setMachines(Array.isArray(machs) ? machs : []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="text-center py-12 text-slate-400">Cargando órdenes...</div>;

  // Group orders by machine, sorted by priority (null priorities go last)
  const machineMap = new Map(machines.map(m => [m.id, m]));
  const ordersByMachine = {};
  for (const o of workOrders) {
    if (!o.machine_id) continue;
    if (!ordersByMachine[o.machine_id]) ordersByMachine[o.machine_id] = [];
    ordersByMachine[o.machine_id].push(o);
  }
  for (const key of Object.keys(ordersByMachine)) {
    ordersByMachine[key].sort((a, b) => {
      if (a.priority == null && b.priority == null) return 0;
      if (a.priority == null) return 1;
      if (b.priority == null) return -1;
      return a.priority - b.priority;
    });
  }

  // Build change events: for each machine, consecutive pairs
  const changeEvents = [];
  for (const [machineId, orders] of Object.entries(ordersByMachine)) {
    const machine = machineMap.get(machineId);
    for (let i = 0; i < orders.length - 1; i++) {
      const orderA = orders[i];
      const orderB = orders[i + 1];
      const applicable = getApplicableInterventions(interventionConfigs, orderA, orderB);
      if (applicable.length === 0) continue;
      // Date = committed_delivery_date of ending order, or start_date of next
      const date = orderA.committed_delivery_date || orderA.start_date || null;
      changeEvents.push({ date, machine, orderA, orderB, interventions: applicable });
    }
  }

  if (changeEvents.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No hay cambios de orden detectados</p>
        <p className="text-sm mt-1">Asegúrate de tener órdenes importadas y intervenciones configuradas</p>
      </div>
    );
  }

  // Group by date
  const byDate = {};
  for (const ev of changeEvents) {
    const key = ev.date || '__sin_fecha__';
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(ev);
  }

  // Sort dates
  const sortedDates = Object.keys(byDate).sort((a, b) => {
    if (a === '__sin_fecha__') return 1;
    if (b === '__sin_fecha__') return -1;
    return toSortKey(a).localeCompare(toSortKey(b));
  });

  const toggleDate = (date) => setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-2">
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-800 dark:text-white">{changeEvents.length}</span> cambios de orden detectados en{' '}
          <span className="font-semibold text-slate-800 dark:text-white">{sortedDates.length}</span> fechas
        </div>
      </div>

      {sortedDates.map(dateKey => {
        const events = byDate[dateKey];
        const isExpanded = expandedDates[dateKey] !== false; // default expanded
        const totalMins = events.reduce((s, e) => s + getTotalMinutes(e.interventions), 0);

        return (
          <Card key={dateKey} className="overflow-hidden">
            <button
              className="w-full text-left"
              onClick={() => toggleDate(dateKey)}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {dateKey === '__sin_fecha__' ? 'Sin fecha asignada' : formatDate(dateKey)}
                    </span>
                    <span className="ml-3 text-sm text-slate-500">{events.length} máquina{events.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>{totalMins} min total</span>
                </div>
              </div>
            </button>

            {isExpanded && (
              <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
                {events.map((ev, idx) => (
                  <div key={idx} className="p-4">
                    {/* Machine + order transition */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white mb-1">
                          {ev.machine?.nombre || ev.machine?.codigo_maquina || 'Máquina desconocida'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                          <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded max-w-[200px] truncate">
                            <span className="text-slate-400 mr-1">Termina:</span>
                            <span className="font-medium">#{ev.orderA.priority ?? '–'}</span> {ev.orderA.product_name || ev.orderA.order_number}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded max-w-[200px] truncate">
                            <span className="text-slate-400 mr-1">Comienza:</span>
                            <span className="font-medium">#{ev.orderB.priority ?? '–'}</span> {ev.orderB.product_name || ev.orderB.order_number}
                          </span>
                        </div>
                        {/* Reason for change */}
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {ev.orderA.product_article_code !== ev.orderB.product_article_code && (
                            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Cambio de producto</span>
                          )}
                          {ev.orderA.client_name !== ev.orderB.client_name && (
                            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Cambio de cliente</span>
                          )}
                          {ev.orderA.material_type !== ev.orderB.material_type && (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">Cambio de formato</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500 flex-shrink-0">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {getTotalMinutes(ev.interventions)} min
                      </div>
                    </div>

                    {/* Interventions list */}
                    <div className="flex flex-wrap gap-2">
                      {ev.interventions.map((cfg, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs"
                        >
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[cfg.type] || TYPE_COLORS['Otros']}`}>
                            {cfg.type}
                          </span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{cfg.name}</span>
                          <span className="text-slate-400">{cfg.duration_minutes}min</span>
                          {cfg.required_personnel > 1 && (
                            <span className="text-slate-400">· {cfg.required_personnel}p</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}