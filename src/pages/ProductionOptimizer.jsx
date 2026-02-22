import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import AIOptimizationPlan from "@/components/planning/AIOptimizationPlan";
import AIOptimizationSummary from "@/components/planning/AIOptimizationSummary";

const getMachineAlias = (m) => m?.nombre || m?.codigo_maquina || m?.id || "Máquina";

export default function ProductionOptimizer() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState(null);
  const [approvedItems, setApprovedItems] = useState({});
  const [rejectedItems, setRejectedItems] = useState({});

  // Datos necesarios
  const { data: workOrders = [] } = useQuery({
    queryKey: ["workOrders"],
    queryFn: async () => {
      const raw = await base44.entities.WorkOrder.list(undefined, 2000);
      return raw.map(order => {
        let extra = {};
        if (order.notes && typeof order.notes === "string") {
          try { const p = JSON.parse(order.notes); if (p && typeof p === "object") extra = p; } catch (_) {}
        }
        return { ...order, ...extra };
      });
    },
  });

  const { data: machines = [] } = useQuery({
    queryKey: ["machines"],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
      return data.map(m => ({
        id: m.id,
        alias: getMachineAlias(m),
        codigo: m.codigo_maquina || m.codigo,
        tipo: m.tipo,
        ubicacion: m.ubicacion,
        estado: m.estado_operativo || "Operativa",
        orden: m.orden_visualizacion || 999,
      })).sort((a, b) => a.orden - b.orden);
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
  });

  const { data: absences = [] } = useQuery({
    queryKey: ["absences"],
    queryFn: () => base44.entities.Absence.filter({ estado_aprobacion: "Aprobada" }),
  });

  const operarios = employees.filter(e => {
    if ((e.estado_empleado || "Alta") !== "Alta") return false;
    const d = (e.departamento || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return d.includes("produccion") || d.includes("fabricacion");
  });

  const pendingOrders = workOrders.filter(o =>
    o.status !== "Completada" && o.status !== "Cancelada"
  );

  const activeMachines = machines.filter(m => m.estado === "Operativa");

  const generatePlan = async () => {
    if (pendingOrders.length === 0) {
      toast.warning("No hay órdenes pendientes para optimizar.");
      return;
    }
    setIsGenerating(true);
    setPlan(null);
    setApprovedItems({});
    setRejectedItems({});

    try {
      // Preparar contexto resumido para la IA
      const ordersContext = pendingOrders.slice(0, 80).map(o => ({
        orden: o.order_number,
        maquina_id: o.machine_id,
        maquina: machines.find(m => m.id === o.machine_id)?.alias || o.machine_id || "Sin asignar",
        cliente: o.client_name || o["Cliente"],
        producto: o.product_name || o["Nombre"],
        cantidad: o.quantity || o["Cantidad"] || 0,
        prioridad: o.priority ?? 99,
        estado: o.status,
        inicio_limite: o.start_date || o["Fecha Inicio Limite"],
        fecha_entrega: o.committed_delivery_date || o["Fecha Entrega"],
        nueva_entrega: o.new_delivery_date || o["Nueva Fecha Entrega"],
        fecha_fin: o.planned_end_date || o["Fecha Fin"],
        cadencia: o.production_cadence || o["Cadencia"] || 0,
        duracion_estimada_h: (o.production_cadence && o.quantity)
          ? Math.ceil(o.quantity / o.production_cadence)
          : null,
      }));

      const machinesContext = activeMachines.map(m => ({
        id: m.id,
        alias: m.alias,
        tipo: m.tipo,
        ubicacion: m.ubicacion,
        ordenes_asignadas: pendingOrders.filter(o => o.machine_id === m.id).length,
      }));

      const today = new Date().toISOString().split("T")[0];

      const prompt = `Eres un experto en planificación de producción industrial. 
Fecha actual: ${today}

Tienes ${pendingOrders.length} órdenes de producción pendientes y ${activeMachines.length} máquinas operativas con ${operarios.length} operarios disponibles.

ÓRDENES (primeras ${ordersContext.length}):
${JSON.stringify(ordersContext, null, 1)}

MÁQUINAS OPERATIVAS:
${JSON.stringify(machinesContext, null, 1)}

Analiza la situación y genera un plan de producción optimizado considerando:
1. PRIORIDAD: Ordenes con menor número de prioridad son más urgentes
2. FECHAS LÍMITE: Respetar fecha_entrega y nueva_entrega
3. CARGA DE MÁQUINAS: Distribuir equitativamente la carga entre máquinas
4. DURACIÓN: Usar cadencia y cantidad para estimar horas necesarias
5. CONFLICTOS: Detectar sobrecargas o plazos en riesgo

Para cada orden analizada, proporciona:
- recomendacion: "mantener" | "reubicar" | "urgente" | "en_riesgo"
- motivo: explicación breve
- accion_sugerida: qué hacer concretamente
- nueva_maquina_id: solo si recomiendas reubicar (id de la máquina destino)

También genera:
- resumen_ejecutivo: párrafo de 2-3 líneas con el estado general
- alertas: lista de los principales problemas detectados (max 5)
- kpis: { ordenes_en_riesgo, ordenes_urgentes, maquinas_sobrecargadas, eficiencia_estimada_pct }
- recomendaciones_generales: lista de 3-5 acciones globales

Devuelve SOLO JSON válido con esta estructura:
{
  "resumen_ejecutivo": "...",
  "kpis": { "ordenes_en_riesgo": 0, "ordenes_urgentes": 0, "maquinas_sobrecargadas": 0, "eficiencia_estimada_pct": 0 },
  "alertas": ["..."],
  "recomendaciones_generales": ["..."],
  "plan": [
    { "orden": "...", "recomendacion": "...", "motivo": "...", "accion_sugerida": "...", "nueva_maquina_id": null }
  ]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            resumen_ejecutivo: { type: "string" },
            kpis: {
              type: "object",
              properties: {
                ordenes_en_riesgo: { type: "number" },
                ordenes_urgentes: { type: "number" },
                maquinas_sobrecargadas: { type: "number" },
                eficiencia_estimada_pct: { type: "number" },
              },
            },
            alertas: { type: "array", items: { type: "string" } },
            recomendaciones_generales: { type: "array", items: { type: "string" } },
            plan: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  orden: { type: "string" },
                  recomendacion: { type: "string" },
                  motivo: { type: "string" },
                  accion_sugerida: { type: "string" },
                  nueva_maquina_id: { type: "string" },
                },
              },
            },
          },
        },
      });

      // Enriquecer con datos de las órdenes originales
      const enrichedPlan = (result.plan || []).map(item => {
        const order = pendingOrders.find(o => o.order_number === item.orden);
        const machine = machines.find(m => m.id === order?.machine_id);
        const newMachine = item.nueva_maquina_id ? machines.find(m => m.id === item.nueva_maquina_id) : null;
        return { ...item, order, machine, newMachine };
      });

      setPlan({ ...result, plan: enrichedPlan });
      toast.success("Plan de optimización generado.");
    } catch (err) {
      console.error(err);
      toast.error("Error generando el plan: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = (orden) => {
    setApprovedItems(prev => ({ ...prev, [orden]: true }));
    setRejectedItems(prev => { const n = { ...prev }; delete n[orden]; return n; });
  };

  const handleReject = (orden) => {
    setRejectedItems(prev => ({ ...prev, [orden]: true }));
    setApprovedItems(prev => { const n = { ...prev }; delete n[orden]; return n; });
  };

  const handleApproveAll = async () => {
    if (!plan) return;
    const actionable = plan.plan.filter(i => i.recomendacion !== "mantener");
    const newApproved = {};
    actionable.forEach(i => { newApproved[i.orden] = true; });
    setApprovedItems(newApproved);
    setRejectedItems({});
    toast.success(`${actionable.length} recomendaciones aprobadas.`);
  };

  const approvedCount = Object.keys(approvedItems).length;
  const rejectedCount = Object.keys(rejectedItems).length;
  const pendingReview = plan ? plan.plan.filter(i => !approvedItems[i.orden] && !rejectedItems[i.orden]).length : 0;

  return (
    <div className="flex flex-col h-full p-6 gap-4 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Optimización IA de Producción</h1>
            <p className="text-xs text-slate-500">
              {pendingOrders.length} órdenes pendientes · {activeMachines.length} máquinas operativas · {operarios.length} operarios
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {plan && (
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />{approvedCount} aprobadas
              </Badge>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <XCircle className="w-3 h-3 mr-1" />{rejectedCount} rechazadas
              </Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <Clock className="w-3 h-3 mr-1" />{pendingReview} pendientes
              </Badge>
            </div>
          )}
          {plan && (
            <Button variant="outline" size="sm" onClick={handleApproveAll}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Aprobar todo
            </Button>
          )}
          <Button
            onClick={generatePlan}
            disabled={isGenerating || pendingOrders.length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isGenerating
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analizando...</>
              : <><Sparkles className="w-4 h-4 mr-2" />{plan ? "Regenerar Plan" : "Generar Plan IA"}</>
            }
          </Button>
        </div>
      </div>

      {/* Content */}
      {!plan && !isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-purple-200 rounded-xl bg-purple-50/30">
          <Sparkles className="w-12 h-12 text-purple-300" />
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-700">Listo para optimizar</p>
            <p className="text-sm text-slate-500 max-w-md mt-1">
              La IA analizará las {pendingOrders.length} órdenes pendientes, la carga de máquinas, 
              disponibilidad de personal y fechas límite para proponer el plan óptimo de producción.
            </p>
          </div>
          <Button onClick={generatePlan} className="bg-purple-600 hover:bg-purple-700 text-white px-8">
            <Sparkles className="w-4 h-4 mr-2" /> Generar Plan de Optimización
          </Button>
        </div>
      )}

      {isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600" />
            <Sparkles className="w-6 h-6 text-purple-600 absolute inset-0 m-auto" />
          </div>
          <p className="text-slate-600 font-medium">Analizando {pendingOrders.length} órdenes de producción...</p>
          <p className="text-xs text-slate-400">La IA está evaluando prioridades, cargas y fechas límite</p>
        </div>
      )}

      {plan && !isGenerating && (
        <Tabs defaultValue="plan" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-fit">
            <TabsTrigger value="plan">Plan de Acción</TabsTrigger>
            <TabsTrigger value="summary">Resumen Ejecutivo</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="flex-1 mt-2">
            <AIOptimizationSummary plan={plan} machines={machines} orders={pendingOrders} />
          </TabsContent>

          <TabsContent value="plan" className="flex-1 mt-2 overflow-auto">
            <AIOptimizationPlan
              plan={plan}
              machines={machines}
              approvedItems={approvedItems}
              rejectedItems={rejectedItems}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}