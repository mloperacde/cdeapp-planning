import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, UserPlus, UserMinus, Edit, Trash2, Shield, Search } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function RoleAuditLogViewer() {
  const [searchTerm, setSearchTerm] = React.useState("");

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['roleAuditLogs'],
    queryFn: () => base44.entities.RoleAuditLog.list('-fecha_accion'),
    initialData: []
  });

  const filteredLogs = useMemo(() => {
    if (!searchTerm) return auditLogs;
    
    const lower = searchTerm.toLowerCase();
    return auditLogs.filter(log => 
      log.usuario_ejecutor?.toLowerCase().includes(lower) ||
      log.usuario_afectado?.toLowerCase().includes(lower) ||
      log.role_name?.toLowerCase().includes(lower) ||
      log.descripcion?.toLowerCase().includes(lower)
    );
  }, [auditLogs, searchTerm]);

  const getActionIcon = (tipo) => {
    switch (tipo) {
      case "crear_rol": return <Shield className="w-4 h-4 text-green-600" />;
      case "editar_rol": return <Edit className="w-4 h-4 text-blue-600" />;
      case "eliminar_rol": return <Trash2 className="w-4 h-4 text-red-600" />;
      case "asignar_rol": return <UserPlus className="w-4 h-4 text-purple-600" />;
      case "revocar_rol": return <UserMinus className="w-4 h-4 text-orange-600" />;
      case "modificar_permisos": return <FileText className="w-4 h-4 text-amber-600" />;
      default: return <Shield className="w-4 h-4 text-slate-600" />;
    }
  };

  const getActionBadge = (tipo) => {
    const config = {
      "crear_rol": { bg: "bg-green-100 text-green-800", label: "Crear Rol" },
      "editar_rol": { bg: "bg-blue-100 text-blue-800", label: "Editar Rol" },
      "eliminar_rol": { bg: "bg-red-100 text-red-800", label: "Eliminar Rol" },
      "asignar_rol": { bg: "bg-purple-100 text-purple-800", label: "Asignar Rol" },
      "revocar_rol": { bg: "bg-orange-100 text-orange-800", label: "Revocar Rol" },
      "modificar_permisos": { bg: "bg-amber-100 text-amber-800", label: "Modificar Permisos" }
    }[tipo] || { bg: "bg-slate-100 text-slate-800", label: tipo };

    return <Badge className={config.bg}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Log de Auditoría de Roles ({filteredLogs.length})
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar en log..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No hay registros de auditoría
            </div>
          ) : (
            <div className="divide-y">
              {filteredLogs.map((log, idx) => (
                <div key={log.id || idx} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getActionIcon(log.tipo_accion)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getActionBadge(log.tipo_accion)}
                        {log.role_name && (
                          <Badge variant="outline" className="text-xs">
                            {log.role_name}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-700 mb-1">
                        {log.descripcion || "Sin descripción"}
                      </p>
                      
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>👤 {log.usuario_ejecutor}</span>
                        {log.usuario_afectado && (
                          <span>→ {log.usuario_afectado}</span>
                        )}
                        <span>📅 {format(new Date(log.fecha_accion), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                        {log.ip_address && (
                          <span>🌐 {log.ip_address}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}