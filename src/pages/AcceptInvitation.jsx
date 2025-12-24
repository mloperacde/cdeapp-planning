import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Mail, 
  User, 
  Shield,
  Monitor,
  Smartphone,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function AcceptInvitation() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      loadInvitation(tokenParam);
    } else {
      setValidationError("No se encontró token de invitación en el enlace");
    }
  }, []);

  const loadInvitation = async (invToken) => {
    try {
      // Intentar sin autenticación primero (para usuarios nuevos)
      let invitations = [];
      try {
        invitations = await base44.entities.UserInvitation.filter({ 
          invitation_token: invToken 
        });
      } catch (authError) {
        // Si falla por autenticación, mostrar error más claro
        setValidationError("No se pudo validar la invitación. Intenta acceder desde el enlace enviado por email.");
        return;
      }

      if (invitations.length === 0) {
        setValidationError("Invitación no encontrada. El enlace puede ser inválido.");
        return;
      }

      const inv = invitations[0];

      if (inv.estado === "Aceptada") {
        setValidationError("Esta invitación ya fue aceptada. Puedes iniciar sesión normalmente.");
        return;
      }

      if (inv.estado === "Cancelada") {
        setValidationError("Esta invitación ha sido cancelada. Contacta con el administrador.");
        return;
      }

      if (inv.estado === "Expirada") {
        setValidationError("Esta invitación ha expirado. Solicita una nueva invitación.");
        return;
      }

      const expiration = new Date(inv.token_expiration);
      if (expiration < new Date()) {
        await base44.entities.UserInvitation.update(inv.id, { estado: 'Expirada' });
        setValidationError("Esta invitación ha expirado. Solicita una nueva invitación.");
        return;
      }

      setInvitation(inv);
    } catch (error) {
      setValidationError("Error al validar la invitación: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Asignar el rol al usuario (UserRole no UserRoleAssignment)
      await base44.entities.UserRole.create({
        user_email: invitation.email,
        role_id: invitation.role_id,
        assigned_by: invitation.invited_by,
        assigned_date: new Date().toISOString(),
        active: true,
        notes: `Auto-asignado por invitación ${invitation.id}`
      });

      // 2. Si hay employee_id, actualizar el empleado con el email
      if (invitation.employee_id) {
        await base44.entities.EmployeeMasterDatabase.update(invitation.employee_id, {
          email: invitation.email
        });
      }

      // 3. Marcar invitación como aceptada
      await base44.entities.UserInvitation.update(invitation.id, {
        estado: 'Aceptada',
        accepted_at: new Date().toISOString()
      });

      toast.success("¡Invitación aceptada! Redirigiendo...");

      // Detectar dispositivo y redirigir
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const hasMobileAccess = invitation.plataformas_habilitadas?.includes('movil');

      setTimeout(() => {
        if (isMobile && hasMobileAccess) {
          window.location.href = createPageUrl('MobileHome');
        } else {
          window.location.href = createPageUrl('Dashboard');
        }
      }, 1500);

    } catch (error) {
      toast.error("Error al aceptar invitación: " + error.message);
      setIsSubmitting(false);
    }
  };

  if (validationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <Card className="max-w-md w-full shadow-2xl border-red-200">
          <CardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Invitación Inválida</h2>
            <p className="text-slate-600 mb-6">{validationError}</p>
            <a href="/">
              <Button className="w-full">Ir al Inicio</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <Card className="max-w-md w-full shadow-2xl">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-slate-600">Validando invitación...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="max-w-md w-full shadow-2xl border-0">
        <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-full flex items-center justify-center">
            <Mail className="w-10 h-10 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">¡Bienvenido/a!</CardTitle>
          <p className="text-blue-100 text-sm mt-2">
            Has sido invitado/a a CdeApp Planning
          </p>
        </CardHeader>
        <CardContent className="p-6">
          {/* Invitation Info */}
          <div className="space-y-3 mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-600" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Nombre:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{invitation.nombre_completo}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-600" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Rol:</span>
              <Badge variant="outline">{invitation.role_name}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Plataformas:</span>
              <div className="flex gap-1">
                {invitation.plataformas_habilitadas?.includes('web') && (
                  <Badge className="bg-blue-500 text-white text-xs">
                    <Monitor className="w-3 h-3 mr-1" />
                    Web
                  </Badge>
                )}
                {invitation.plataformas_habilitadas?.includes('movil') && (
                  <Badge className="bg-purple-500 text-white text-xs">
                    <Smartphone className="w-3 h-3 mr-1" />
                    Móvil
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Crear Contraseña *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetir contraseña"
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Aceptar Invitación
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-6">
            Invitado por: {invitation.invited_by_name}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}