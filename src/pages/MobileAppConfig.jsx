import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, QrCode, Download, CheckCircle } from "lucide-react";

export default function MobileAppConfigPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Smartphone className="w-8 h-8 text-blue-600" />
            Aplicación Móvil
          </h1>
          <p className="text-slate-600 mt-1">
            Información y guía para la aplicación móvil de CDE PlanApp
          </p>
        </div>

        {/* Características de la App */}
        <Card className="mb-6 shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle>Funcionalidades de la App Móvil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold">Autenticación Segura</h3>
                <p className="text-sm text-slate-600">
                  Registro mediante teléfono móvil con código de acceso temporal enviado por SMS
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold">Solicitud de Ausencias</h3>
                <p className="text-sm text-slate-600">
                  Comunica ausencias con adjuntos de documentos justificativos (PDF, imágenes)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold">Consulta de Asignaciones</h3>
                <p className="text-sm text-slate-600">
                  Visualiza tu asignación diaria de máquinas y planificación
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold">Actualización de Estado de Máquinas (Técnicos)</h3>
                <p className="text-sm text-slate-600">
                  Los técnicos pueden actualizar el estado de las máquinas en tiempo real
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold">Órdenes de Trabajo de Mantenimiento</h3>
                <p className="text-sm text-slate-600">
                  Registra y actualiza órdenes de trabajo de mantenimiento desde el campo
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold">Notificaciones Push</h3>
                <p className="text-sm text-slate-600">
                  Recibe alertas importantes en tiempo real sobre mantenimientos, ausencias y más
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guía de Registro */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Cómo Registrarse en la App</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Badge className="bg-blue-600 text-white text-lg px-3 py-1 flex-shrink-0">1</Badge>
              <div>
                <h4 className="font-semibold">Descarga la Aplicación</h4>
                <p className="text-sm text-slate-600">
                  Disponible en Google Play Store y Apple App Store. Busca "CDE PlanApp"
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-blue-600 text-white text-lg px-3 py-1 flex-shrink-0">2</Badge>
              <div>
                <h4 className="font-semibold">Ingresa tu Número de Teléfono</h4>
                <p className="text-sm text-slate-600">
                  Debe coincidir exactamente con el número registrado en tu ficha de empleado
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-blue-600 text-white text-lg px-3 py-1 flex-shrink-0">3</Badge>
              <div>
                <h4 className="font-semibold">Recibe tu Código de Acceso</h4>
                <p className="text-sm text-slate-600">
                  Se enviará un código de 6 dígitos por SMS válido por 10 minutos
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-blue-600 text-white text-lg px-3 py-1 flex-shrink-0">4</Badge>
              <div>
                <h4 className="font-semibold">Ingresa el Código</h4>
                <p className="text-sm text-slate-600">
                  Una vez validado, tendrás acceso completo a tus funciones según tu rol
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roles y Permisos en la App */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Permisos por Rol en la App Móvil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-l-4 border-red-500 pl-4 py-2">
              <h4 className="font-semibold text-red-900">Admin / Supervisor</h4>
              <p className="text-sm text-slate-600">
                Acceso completo: Ver y aprobar ausencias, actualizar todas las máquinas, 
                gestionar órdenes de trabajo, recibir todas las notificaciones
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4 py-2">
              <h4 className="font-semibold text-green-900">Técnico</h4>
              <p className="text-sm text-slate-600">
                Actualizar estado de máquinas, registrar y completar órdenes de mantenimiento, 
                solicitar ausencias, ver asignaciones
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h4 className="font-semibold text-blue-900">Operario</h4>
              <p className="text-sm text-slate-600">
                Ver asignación diaria de máquinas, solicitar ausencias con justificantes, 
                recibir notificaciones de cambios en su planificación
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Nota Técnica */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Nota:</strong> La aplicación móvil está en desarrollo como PWA (Progressive Web App) 
            para máxima compatibilidad. También habrá versiones nativas para iOS y Android con 
            funcionalidades offline avanzadas.
          </p>
        </div>
      </div>
    </div>
  );
}