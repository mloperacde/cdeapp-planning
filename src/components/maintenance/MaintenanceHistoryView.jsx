import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table.jsx";
import { CheckCircle2, AlertTriangle, XCircle, Search, Eye, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MaintenanceRecordDetail from "./MaintenanceRecordDetail";

const EMPTY_ARRAY = [];

export default function MaintenanceHistoryView({ machines = EMPTY_ARRAY, employees = EMPTY_ARRAY }) {
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filterMachine, setFilterMachine] = useState("all");

  const { data: records = EMPTY_ARRAY, isLoading } = useQuery({
    queryKey: ["maintenanceRecords"],
    queryFn: () => base44.entities.MaintenanceRecord.list("-fecha_fin", 500),
    initialData: EMPTY_ARRAY,
  });

  const filtered = records.filter(r => {
    const matchSearch = !search ||
      r.machine_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.machine_codigo?.toLowerCase().includes(search.toLowerCase()) ||
      r.maintenance_plan_nombre?.toLowerCase().includes(search.toLowerCase()) ||
      r.tecnico_nombre?.toLowerCase().includes(search.toLowerCase()) ||
      r.numero_registro?.toLowerCase().includes(search.toLowerCase());
    const matchMachine = filterMachine === "all" || r.machine_id === filterMachine;
    return matchSearch && matchMachine;
  });

  const getStatusBadge = (estado) => {
    const config = {
      "Completado": { icon: CheckCircle2, className: "bg-green-100 text-green-800" },
      "Completado con incidencias": { icon: AlertTriangle, className: "bg-yellow-100 text-yellow-800" },
      "Cancelado": { icon: XCircle, className: "bg-red-100 text-red-800" },
    }[estado] || { icon: CheckCircle2, className: "bg-slate-100 text-slate-800" };
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {estado}
      </Badge>
    );
  };

  const getTypeBadge = (tipo) => {
    const colors = {
      "Preventivo": "bg-blue-100 text-blue-800",
      "Correctivo": "bg-red-100 text-red-800",
      "Predictivo": "bg-purple-100 text-purple-800",
      "Mixto": "bg-orange-100 text-orange-800",
    };
    return <Badge className={colors[tipo] || "bg-slate-100 text-slate-800"}>{tipo}</Badge>;
  };

  // Unique machines in records for filter
  const machineOptions = [...new Map(records.map(r => [r.machine_id, { id: r.machine_id, name: r.machine_name || r.machine_id }])).values()];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{records.filter(r => r.estado === "Completado").length}</p>
          <p className="text-xs text-green-600">Completados</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-yellow-700">{records.filter(r => r.estado === "Completado con incidencias").length}</p>
          <p className="text-xs text-yellow-600">Con incidencias</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-700">{records.length}</p>
          <p className="text-xs text-slate-600">Total registros</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por máquina, técnico, plan, nº registro..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterMachine}
          onChange={e => setFilterMachine(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:border-slate-700"
        >
          <option value="all">Todas las máquinas</option>
          {machineOptions.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">Cargando historial...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No hay registros de mantenimiento</p>
              <p className="text-sm mt-1">Los mantenimientos completados aparecerán aquí automáticamente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead>Nº Registro</TableHead>
                    <TableHead>Máquina</TableHead>
                    <TableHead>Plan / Tipo</TableHead>
                    <TableHead>Fecha Realización</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(record => (
                    <TableRow key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell className="font-mono text-xs text-slate-500">{record.numero_registro || record.id.slice(0,8)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{record.machine_name || "—"}</p>
                          <p className="text-xs text-slate-400">{record.machine_codigo}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-600 dark:text-slate-400">{record.maintenance_plan_nombre || "—"}</span>
                          {getTypeBadge(record.tipo)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.fecha_fin
                          ? format(new Date(record.fecha_fin), "dd/MM/yyyy HH:mm", { locale: es })
                          : record.fecha_inicio
                          ? format(new Date(record.fecha_inicio), "dd/MM/yyyy", { locale: es })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.duracion_minutos ? `${record.duracion_minutos} min` : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{record.tecnico_nombre || "—"}</TableCell>
                      <TableCell>{getStatusBadge(record.estado)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedRecord(record)}
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRecord && (
        <MaintenanceRecordDetail
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}