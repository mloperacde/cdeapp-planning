import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
} from "lucide-react";

export default function SecurityAuditTab({ securityAnalysis }) {
  return (
    <div className="space-y-6">
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-red-900">
          <strong>Crítico:</strong> Se han detectado{" "}
          {securityAnalysis.conflicts.length} problemas de seguridad que requieren
          atención inmediata.
        </AlertDescription>
      </Alert>

      {/* Sistema Nativo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Sistema de Seguridad Nativo (Base44)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Estado</span>
            <Badge className="bg-green-100 text-green-800">
              {securityAnalysis.nativeSystem.status}
            </Badge>
          </div>
          <p className="text-sm text-slate-600">
            {securityAnalysis.nativeSystem.description}
          </p>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-red-700">Problemas Detectados:</p>
            <ul className="space-y-2">
              {securityAnalysis.nativeSystem.issues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Módulos Personalizados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-600" />
            Módulos de Seguridad Personalizados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {securityAnalysis.customModules.map((module, idx) => (
              <div
                key={idx}
                className="p-4 border rounded-lg bg-amber-50 border-amber-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-amber-900">{module.name}</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Entidades: {module.entities.join(", ")}
                    </p>
                  </div>
                  <Badge className="bg-amber-600">{module.status}</Badge>
                </div>
                <div className="flex items-start gap-2 mt-3 bg-white p-3 rounded">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Recomendación:</p>
                    <p className="text-sm text-amber-800">{module.recommendation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conflictos de Seguridad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Unlock className="w-5 h-5" />
            Conflictos de Seguridad Detectados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {securityAnalysis.conflicts.map((conflict, idx) => (
              <div
                key={idx}
                className="p-4 border-2 border-red-200 rounded-lg bg-red-50"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-red-900">{conflict.entity}</p>
                      <Badge className="bg-red-600">Alta Prioridad</Badge>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-red-800">Problema:</p>
                        <p className="text-sm text-red-700">{conflict.issue}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-red-200">
                        <p className="text-sm font-medium text-green-800 mb-1">
                          Solución Recomendada:
                        </p>
                        <p className="text-sm text-green-700">
                          {conflict.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan de Migración */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <CheckCircle2 className="w-5 h-5" />
            Plan de Migración Recomendado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-semibold">Auditar Permisos Actuales</p>
                <p className="text-sm text-slate-600">
                  Documentar todos los permisos configurados en módulos personalizados
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-semibold">Configurar Sistema Nativo</p>
                <p className="text-sm text-slate-600">
                  Establecer roles y permisos en el sistema de seguridad nativo de Base44
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-semibold">Migrar Usuarios</p>
                <p className="text-sm text-slate-600">
                  Transferir roles de usuarios de módulos personalizados al sistema nativo
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                4
              </div>
              <div>
                <p className="font-semibold">Periodo de Prueba</p>
                <p className="text-sm text-slate-600">
                  Ejecutar ambos sistemas en paralelo durante 2 semanas para validación
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                5
              </div>
              <div>
                <p className="font-semibold">Desactivar Módulos Legacy</p>
                <p className="text-sm text-slate-600">
                  Eliminar entidades Role, UserRole y módulos personalizados de permisos
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}