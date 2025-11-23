import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  User, Mail, Phone, MapPin, AlertCircle, UserCheck, Building,
  CheckCircle2, Clock, XCircle, FileText
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ProfileEditor({ employeeId, mode = "full" }) {
  const [editingSection, setEditingSection] = useState(null);
  const [formData, setFormData] = useState({});
  const queryClient = useQueryClient();

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employeeMasterDatabase', employeeId],
    queryFn: async () => {
      const employees = await base44.entities.EmployeeMasterDatabase.list();
      return employees.find(e => e.id === employeeId || e.employee_id === employeeId);
    },
    enabled: !!employeeId
  });

  const { data: changeRequests = [] } = useQuery({
    queryKey: ['profileChangeRequests', employeeId],
    queryFn: async () => {
      const requests = await base44.entities.ProfileChangeRequest.list('-fecha_solicitud');
      return requests.filter(r => r.employee_id === employeeId);
    },
    enabled: !!employeeId
  });

  const pendingRequests = useMemo(() => {
    return changeRequests.filter(r => r.estado === 'Pendiente');
  }, [changeRequests]);

  const submitChangeMutation = useMutation({
    mutationFn: async (changes) => {
      const promises = changes.map(change => 
        base44.entities.ProfileChangeRequest.create({
          ...change,
          employee_id: employeeId,
          fecha_solicitud: new Date().toISOString(),
          estado: 'Pendiente'
        })
      );
      return await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profileChangeRequests'] });
      toast.success("Solicitud de cambio enviada para aprobación");
      setEditingSection(null);
      setFormData({});
    },
    onError: (error) => {
      toast.error("Error al enviar solicitud: " + error.message);
    }
  });

  const handleStartEdit = (section) => {
    setEditingSection(section);
    switch (section) {
      case 'contact':
        setFormData({
          email: employee?.email || '',
          telefono_movil: employee?.telefono_movil || ''
        });
        break;
      case 'address':
        setFormData({
          direccion: employee?.direccion || ''
        });
        break;
      case 'emergency':
        setFormData({
          contacto_emergencia_nombre: employee?.contacto_emergencia_nombre || '',
          contacto_emergencia_telefono: employee?.contacto_emergencia_telefono || '',
          contacto_emergencia_relacion: employee?.contacto_emergencia_relacion || ''
        });
        break;
      case 'banking':
        setFormData({
          iban: employee?.iban || '',
          swift_bic: employee?.swift_bic || '',
          banco_nombre: employee?.banco_nombre || ''
        });
        break;
      default:
        break;
    }
  };

  const handleSubmit = (section) => {
    const changes = [];
    const categoryMap = {
      contact: 'Contacto',
      address: 'Dirección',
      emergency: 'Emergencia',
      banking: 'Bancario'
    };

    Object.entries(formData).forEach(([key, value]) => {
      const currentValue = employee?.[key] || '';
      if (value !== currentValue) {
        changes.push({
          campo_modificado: key,
          valor_actual: currentValue,
          valor_solicitado: value,
          categoria_cambio: categoryMap[section]
        });
      }
    });

    if (changes.length === 0) {
      toast.info("No hay cambios para enviar");
      setEditingSection(null);
      return;
    }

    submitChangeMutation.mutate(changes);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">Cargando perfil...</div>;
  }

  if (!employee) {
    return <div className="text-center py-12 text-slate-500">No se encontró el empleado</div>;
  }

  const fieldLabels = {
    email: 'Email',
    telefono_movil: 'Teléfono Móvil',
    direccion: 'Dirección',
    contacto_emergencia_nombre: 'Nombre',
    contacto_emergencia_telefono: 'Teléfono',
    contacto_emergencia_relacion: 'Relación',
    iban: 'IBAN',
    swift_bic: 'SWIFT/BIC',
    banco_nombre: 'Nombre del Banco'
  };

  return (
    <div className="space-y-6">
      {/* Alertas de solicitudes pendientes */}
      {pendingRequests.length > 0 && (
        <Card className="bg-amber-50 border-2 border-amber-300">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">
                  Solicitudes Pendientes de Aprobación
                </h3>
                <p className="text-sm text-amber-800 mb-2">
                  Tienes {pendingRequests.length} cambio(s) pendiente(s) de revisión por RRHH
                </p>
                <div className="space-y-1">
                  {pendingRequests.slice(0, 3).map(req => (
                    <div key={req.id} className="text-xs text-amber-700 flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      {fieldLabels[req.campo_modificado]}: {req.valor_solicitado}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información de Contacto */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Información de Contacto
            </CardTitle>
            {editingSection !== 'contact' && (
              <Button size="sm" onClick={() => handleStartEdit('contact')}>
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {editingSection === 'contact' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono Móvil</Label>
                <Input
                  type="tel"
                  value={formData.telefono_movil || ''}
                  onChange={(e) => setFormData({ ...formData, telefono_movil: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingSection(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => handleSubmit('contact')} className="bg-blue-600">
                  Solicitar Cambio
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Email</p>
                <p className="text-sm font-medium">{employee.email || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Teléfono Móvil</p>
                <p className="text-sm font-medium">{employee.telefono_movil || 'No especificado'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dirección */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              Dirección
            </CardTitle>
            {editingSection !== 'address' && (
              <Button size="sm" onClick={() => handleStartEdit('address')}>
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {editingSection === 'address' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Dirección Completa</Label>
                <Textarea
                  value={formData.direccion || ''}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  rows={3}
                  placeholder="Calle, Número, Piso, Ciudad, Código Postal..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingSection(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => handleSubmit('address')} className="bg-green-600">
                  Solicitar Cambio
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium whitespace-pre-wrap">
                {employee.direccion || 'No especificada'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contacto de Emergencia */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Contacto de Emergencia
            </CardTitle>
            {editingSection !== 'emergency' && (
              <Button size="sm" onClick={() => handleStartEdit('emergency')}>
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {editingSection === 'emergency' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input
                  value={formData.contacto_emergencia_nombre || ''}
                  onChange={(e) => setFormData({ ...formData, contacto_emergencia_nombre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  type="tel"
                  value={formData.contacto_emergencia_telefono || ''}
                  onChange={(e) => setFormData({ ...formData, contacto_emergencia_telefono: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Relación (ej: Padre, Madre, Cónyuge)</Label>
                <Input
                  value={formData.contacto_emergencia_relacion || ''}
                  onChange={(e) => setFormData({ ...formData, contacto_emergencia_relacion: e.target.value })}
                  placeholder="Familiar, Amigo/a, etc."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingSection(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => handleSubmit('emergency')} className="bg-red-600">
                  Solicitar Cambio
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Nombre</p>
                <p className="text-sm font-medium">{employee.contacto_emergencia_nombre || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Teléfono</p>
                <p className="text-sm font-medium">{employee.contacto_emergencia_telefono || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Relación</p>
                <p className="text-sm font-medium">{employee.contacto_emergencia_relacion || 'No especificada'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Datos Bancarios */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-purple-600" />
              Datos Bancarios (Nóminas)
            </CardTitle>
            {editingSection !== 'banking' && (
              <Button size="sm" onClick={() => handleStartEdit('banking')}>
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {editingSection === 'banking' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>IBAN</Label>
                <Input
                  value={formData.iban || ''}
                  onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                  placeholder="ES00 0000 0000 0000 0000 0000"
                />
              </div>
              <div className="space-y-2">
                <Label>SWIFT/BIC (opcional)</Label>
                <Input
                  value={formData.swift_bic || ''}
                  onChange={(e) => setFormData({ ...formData, swift_bic: e.target.value })}
                  placeholder="BBVAESMM"
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre del Banco</Label>
                <Input
                  value={formData.banco_nombre || ''}
                  onChange={(e) => setFormData({ ...formData, banco_nombre: e.target.value })}
                  placeholder="Ej: Banco Santander"
                />
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-xs text-purple-800">
                  <strong>Importante:</strong> Los cambios en datos bancarios requieren aprobación de RRHH
                  antes de ser efectivos en el sistema de nóminas.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingSection(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => handleSubmit('banking')} className="bg-purple-600">
                  Solicitar Cambio
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">IBAN</p>
                <p className="text-sm font-medium font-mono">
                  {employee.iban ? `${employee.iban.substring(0, 4)} **** **** **** ${employee.iban.slice(-4)}` : 'No especificado'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Banco</p>
                <p className="text-sm font-medium">{employee.banco_nombre || 'No especificado'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial de Cambios */}
      {mode === "full" && changeRequests.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-600" />
              Historial de Solicitudes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {changeRequests.slice(0, 10).map(req => (
                <div key={req.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {req.categoria_cambio}
                      </Badge>
                      <span className="text-sm font-medium">
                        {fieldLabels[req.campo_modificado]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Nuevo valor: <strong>{req.valor_solicitado}</strong>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(req.fecha_solicitud), "dd MMM yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                  <div>
                    {req.estado === 'Pendiente' && (
                      <Badge className="bg-amber-600">
                        <Clock className="w-3 h-3 mr-1" />
                        Pendiente
                      </Badge>
                    )}
                    {req.estado === 'Aprobado' && (
                      <Badge className="bg-green-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Aprobado
                      </Badge>
                    )}
                    {req.estado === 'Rechazado' && (
                      <Badge className="bg-red-600">
                        <XCircle className="w-3 h-3 mr-1" />
                        Rechazado
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}