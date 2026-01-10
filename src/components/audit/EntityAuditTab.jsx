import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Database, AlertCircle, CheckCircle2, Filter } from "lucide-react";

export default function EntityAuditTab({ entities }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const categories = useMemo(() => {
    const cats = new Set(entities.map((e) => e.category));
    return ["all", ...Array.from(cats)];
  }, [entities]);

  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      const matchesSearch =
        searchTerm === "" ||
        entity.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || entity.category === categoryFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && entity.hasRecords) ||
        (statusFilter === "inactive" && !entity.hasRecords);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [entities, searchTerm, categoryFilter, statusFilter]);

  const getCategoryColor = (category) => {
    const colors = {
      Core: "bg-green-100 text-green-800",
      RRHH: "bg-purple-100 text-purple-800",
      Planning: "bg-blue-100 text-blue-800",
      Mantenimiento: "bg-orange-100 text-orange-800",
      Calidad: "bg-emerald-100 text-emerald-800",
      Configuracion: "bg-slate-100 text-slate-800",
      Auditoria: "bg-amber-100 text-amber-800",
      Comunicacion: "bg-cyan-100 text-cyan-800",
      Seguridad: "bg-red-100 text-red-800",
      ML: "bg-indigo-100 text-indigo-800",
      Otros: "bg-gray-100 text-gray-800",
    };
    return colors[category] || colors.Otros;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventario de Entidades</CardTitle>
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar entidades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.slice(1).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Con registros</SelectItem>
              <SelectItem value="inactive">Sin registros</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entidad</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Registros</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Última Actualización</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntities.map((entity) => (
                <TableRow key={entity.name}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-slate-400" />
                      {entity.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(entity.category)}>
                      {entity.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        entity.recordCount === 0
                          ? "text-orange-600 font-semibold"
                          : ""
                      }
                    >
                      {entity.recordCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    {entity.hasRecords ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm">Activo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-orange-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">Inactivo</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {entity.lastUpdate
                      ? new Date(entity.lastUpdate).toLocaleDateString("es-ES")
                      : "N/A"}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {entity.error && (
                      <span className="text-red-600">Error: {entity.error}</span>
                    )}
                    {!entity.hasRecords && !entity.error && (
                      <span className="text-orange-600">Candidata a eliminar</span>
                    )}
                    {entity.category === "Core" && (
                      <span className="text-green-600">Mantener</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm text-slate-600">
          Mostrando {filteredEntities.length} de {entities.length} entidades
        </div>
      </CardContent>
    </Card>
  );
}