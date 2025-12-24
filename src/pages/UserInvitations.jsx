import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  UserPlus, 
  Mail, 
  Send, 
  Copy, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  RefreshCw,
  Shield,
  Smartphone,
  Monitor,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ProtectedPage from "../components/roles/ProtectedPage";
import Breadcrumbs from "../components/common/Breadcrumbs";

export default function UserInvitationsPage() {
  return (
    <ProtectedPage module="configuration" action="manage_users">
      <UserInvitationsContent />
    </ProtectedPage>
  );
}

function UserInvitationsContent() {
  const [showForm, setShowForm] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ['userInvitations'],
    queryFn: () => base44.entities.UserInvitation.list('-created_date'),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
  });

  const sendInvitationMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('sendInvitation', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Invitación enviada correctamente");
      queryClient.invalidateQueries({ queryKey: ['userInvitations'] });
      setShowForm(false);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: (id) => base44.entities.UserInvitation.update(id, { estado: 'Cancelada' }),
    onSuccess: () => {
      toast.success("Invitación cancelada");
      queryClient.invalidateQueries({ queryKey: ['userInvitations'] });
    }
  });

  const resendInvitationMutation = useMutation({
    mutationFn: async (invitation) => {
      const response = await base44.functions.invoke('sendInvitation', {
        email: invitation.email,
        nombre_completo: invitation.nombre_completo,
        role_id: invitation.role_id,
        employee_id: invitation.employee_id,
        plataformas_habilitadas: invitation.plataformas_habilitadas,
        notas: invitation.notas
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Invitación reenviada");
      queryClient.invalidateQueries({ queryKey: ['userInvitations'] });
    }
  });

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success("Enlace copiado al portapapeles");
  };

  const getStatusBadge = (estado) => {
    const config = {
      Pendiente: { bg: "bg-yellow-500", icon: Clock },
      Aceptada: { bg: "bg-green-500", icon: CheckCircle2 },
      Expirada: { bg: "bg-slate-400", icon: Clock },
      Cancelada: { bg: "bg-red-500", icon: XCircle }
    };
    const { bg, icon: Icon } = config[estado] || config.Pendiente;
    return (
      <Badge className={`${bg} text-white flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {estado}
      </Badge>
    );
  };

  const pendingInvitations = invitations.filter(i => i.estado === "Pendiente");
  const acceptedInvitations = invitations.filter(i => i.estado === "Aceptada");

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs items={[
          { label: "Configuración", url: createPageUrl("Configuration") },
          { label: "Gestión de Accesos" }
        ]} />

        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <UserPlus className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
              Gestión de Accesos
            </h1>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-1">
              Invita usuarios y gestiona accesos a la plataforma
            </p>
          </div>
          <Button type="button" onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Invitar Usuario
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-700 font-medium">Invitaciones Pendientes</p>
                  <p className="text-3xl font-bold text-yellow-900">{pendingInvitations.length}</p>
                </div>
                <Clock className="w-10 h-10 text-yellow-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Usuarios Activos</p>
                  <p className="text-3xl font-bold text-green-900">{acceptedInvitations.length}</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total Invitaciones</p>
                  <p className="text-3xl font-bold text-blue-900">{invitations.length}</p>
                </div>
                <Mail className="w-10 h-10 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invitations Table */}
        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <CardTitle>Invitaciones Enviadas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800">
                    <TableHead>Email</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Plataformas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Invitación</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map(invitation => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell>{invitation.nombre_completo}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{invitation.role_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {invitation.plataformas_habilitadas?.includes('web') && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              <Monitor className="w-3 h-3 mr-1" />
                              Web
                            </Badge>
                          )}
                          {invitation.plataformas_habilitadas?.includes('movil') && (
                            <Badge className="bg-purple-100 text-purple-800 text-xs">
                              <Smartphone className="w-3 h-3 mr-1" />
                              Móvil
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(invitation.estado)}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {format(new Date(invitation.created_date), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {invitation.estado === "Pendiente" && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => copyLink(invitation.invitation_link)}
                                title="Copiar enlace"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => resendInvitationMutation.mutate(invitation)}
                                title="Reenviar"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                                title="Cancelar"
                              >
                                <XCircle className="w-4 h-4 text-red-600" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Invitation Form Dialog */}
        {showForm && (
          <InvitationFormDialog
            currentUser={currentUser}
            roles={roles}
            employees={employees}
            onClose={() => setShowForm(false)}
            onSubmit={(data) => sendInvitationMutation.mutate(data)}
          />
        )}
      </div>
    </div>
  );
}

function InvitationFormDialog({ currentUser, roles, employees, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    email: "",
    nombre_completo: "",
    role_id: "",
    employee_id: "",
    plataformas_habilitadas: ["web"],
    notas: ""
  });

  const [hasChanges, setHasChanges] = useState(false);

  React.useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setHasChanges(false);
    onSubmit(formData);
  };

  const handleFieldChange = (field, value) => {
    setFormData({...formData, [field]: value});
    setHasChanges(true);
  };

  const togglePlatform = (platform) => {
    setHasChanges(true);
    setFormData(prev => ({
      ...prev,
      plataformas_habilitadas: prev.plataformas_habilitadas.includes(platform)
        ? prev.plataformas_habilitadas.filter(p => p !== platform)
        : [...prev.plataformas_habilitadas, platform]
    }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Invitar Nuevo Usuario
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Nombre Completo *</Label>
              <Input
                value={formData.nombre_completo}
                onChange={(e) => handleFieldChange('nombre_completo', e.target.value)}
                placeholder="Juan Pérez García"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rol a Asignar *</Label>
              <Select value={formData.role_id} onValueChange={(val) => handleFieldChange('role_id', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.filter(r => r.active).map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <Shield className="w-3 h-3" />
                        {role.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roles.length === 0 && (
                <p className="text-xs text-amber-600">⚠️ No hay roles disponibles. Crea roles primero.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Vincular a Empleado (opcional)</Label>
              <Select value={formData.employee_id} onValueChange={(val) => handleFieldChange('employee_id', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin vincular..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sin vincular</SelectItem>
                  {employees
                    .filter(emp => emp.estado_empleado === 'Alta')
                    .sort((a, b) => a.nombre.localeCompare(b.nombre))
                    .map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.nombre}{emp.codigo_empleado ? ` - ${emp.codigo_empleado}` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Plataformas Habilitadas *</Label>
            <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="web"
                  checked={formData.plataformas_habilitadas.includes('web')}
                  onChange={() => togglePlatform('web')}
                  className="w-4 h-4"
                />
                <Label htmlFor="web" className="flex items-center gap-2 cursor-pointer">
                  <Monitor className="w-4 h-4 text-blue-600" />
                  Acceso Web
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="movil"
                  checked={formData.plataformas_habilitadas.includes('movil')}
                  onChange={() => togglePlatform('movil')}
                  className="w-4 h-4"
                />
                <Label htmlFor="movil" className="flex items-center gap-2 cursor-pointer">
                  <Smartphone className="w-4 h-4 text-purple-600" />
                  Acceso Móvil
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => handleFieldChange('notas', e.target.value)}
              placeholder="Información adicional sobre la invitación..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={formData.plataformas_habilitadas.length === 0}
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar Invitación
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}