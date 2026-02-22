import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, AlertTriangle, Zap, ArrowRight, MoveRight, Search, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const REC_CONFIG = {
  mantener: { label: "Mantener", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2, iconColor: "text-green-500" },
  urgente: { label: "Urgente", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Zap, iconColor: "text-amber-500" },
  en_riesgo: { label: "En Riesgo", color: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle, iconColor: "text-red-500" },
  reubicar: { label: "Reubicar", color: "bg-blue-100 text-blue-800 border-blue-200", icon: MoveRight, iconColor: "text-blue-500" },
};

export default function AIOptimizationPlan({ plan, machines, approvedItems, rejectedItems, onApprove, onReject }) {
  const [search, setSearch] = useState("");
  const [filterRec, setFilterRec] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  if (!plan?.plan) return null;

  const filtered = plan.plan.filter(item => {
    if (filterRec !== "all" && item.recomendacion !== filterRec) return false;
    if (filterStatus === "approved" && !approvedItems[item.orden]) return false;
    if (filterStatus === "rejected" && !rejectedItems[item.orden]) return false;
    if (filterStatus === "pending" && (approvedItems[item.orden] || rejectedItems[item.orden])) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchOrden = (item.orden || "").toLowerCase().includes(q);
      const matchMachine = (item.machine?.alias || "").toLowerCase().includes(q);
      const matchClient = (item.order?.client_name || item.order?.["Cliente"] || "").toLowerCase().includes(q);
      const matchProduct = (item.order?.product_name || item.order?.["Nombre"] || "").toLowerCase().includes(q);
      if (!matchOrden && !matchMachine && !matchClient && !matchProduct) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center bg-white p-3 rounded-lg border">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar orden, máquina, cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={filterRec} onValueChange={setFilterRec}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Recomendación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="mantener">Mantener</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
            <SelectItem value="en_riesgo">En Riesgo</SelectItem>
            <SelectItem value="reubicar">Reubicar</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Estado revisión" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="approved">Aprobadas</SelectItem>
            <SelectItem value="rejected">Rechazadas</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} de {plan.plan.length} órdenes</span>
      </div>

      {/* Lista de órdenes */}
      <div className="space-y-2">
        {filtered.map((item, i) => {
          const rec = REC_CONFIG[item.recomendacion] || REC_CONFIG.mantener;
          const Icon = rec.icon;
          const isApproved = approvedItems[item.orden];
          const isRejected = rejectedItems[item.orden];
          const order = item.order;
          const priority = order?.priority ?? order?.["Pry"] ?? "—";
          const client = order?.client_name || order?.["Cliente"] || "—";
          const product = order?.product_name || order?.["Nombre"] || "—";
          const delivery = order?.committed_delivery_date || order?.new_delivery_date || order?.["Fecha Entrega"] || "—";
          const qty = order?.quantity || order?.["Cantidad"] || "—";

          return (
            <div
              key={i}
              className={`bg-white rounded-lg border p-4 transition-all ${
                isApproved ? "border-green-300 bg-green-50/30" :
                isRejected ? "border-red-200 bg-red-50/20 opacity-60" :
                "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                {/* Orden info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className={`w-5 h-5 ${rec.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900">#{item.orden}</span>
                      <Badge variant="outline" className={`text-xs ${rec.color}`}>{rec.label}</Badge>
                      {priority !== "—" && (
                        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600">
                          Pry {priority}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {client} · {product} · {qty} uds · Entrega: {delivery}
                    </div>
                    {/* Máquina actual → nueva */}
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-600">
                      <span className="font-medium">{item.machine?.alias || "Sin máquina"}</span>
                      {item.newMachine && (
                        <>
                          <ArrowRight className="w-3 h-3 text-blue-500" />
                          <span className="font-medium text-blue-600">{item.newMachine.alias}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Motivo y acción */}
                <div className="flex-1 min-w-0 border-l pl-3">
                  <p className="text-xs text-slate-600 font-medium">{item.motivo}</p>
                  <p className="text-xs text-slate-500 mt-0.5 italic">{item.accion_sugerida}</p>
                </div>

                {/* Botones de aprobación (solo para no-mantener) */}
                {item.recomendacion !== "mantener" && (
                  <div className="flex gap-2 flex-shrink-0">
                    {!isApproved ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50"
                        onClick={() => onApprove(item.orden)}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Aprobar
                      </Button>
                    ) : (
                      <Badge className="bg-green-100 text-green-800 border border-green-300 px-3 py-1">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Aprobada
                      </Badge>
                    )}
                    {!isRejected ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => onReject(item.orden)}
                      >
                        <XCircle className="w-3 h-3 mr-1" /> Rechazar
                      </Button>
                    ) : (
                      <Badge className="bg-red-50 text-red-700 border border-red-200 px-3 py-1">
                        <XCircle className="w-3 h-3 mr-1" /> Rechazada
                      </Badge>
                    )}
                  </div>
                )}

                {item.recomendacion === "mantener" && (
                  <Badge variant="outline" className="flex-shrink-0 bg-green-50 text-green-700 border-green-200 px-3">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Sin cambios
                  </Badge>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No hay órdenes con los filtros aplicados.</p>
          </div>
        )}
      </div>
    </div>
  );
}