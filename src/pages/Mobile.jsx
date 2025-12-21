import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Smartphone, Check, Apple, Chrome, Share2 } from "lucide-react";

export default function MobilePage() {
  const appUrl = window.location.origin;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl">
            <Smartphone className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Configuración App Móvil</h1>
            <p className="text-sm text-slate-500 mt-1">PWA instalable en iOS y Android</p>
          </div>
        </div>
        <Link to={createPageUrl("Configuration")}>
          <Button variant="outline" size="sm">Volver</Button>
        </Link>
      </div>
      
      <Card className="border-2 border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Check className="w-5 h-5" />
            Estado del Servicio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-700 bg-white p-3 rounded-lg border border-green-200">
            <Check className="w-5 h-5" />
            <span className="font-medium">App Móvil Activa</span>
          </div>
          <p className="text-sm text-slate-600 mt-4">
            La versión móvil está disponible para todos los empleados. Pueden acceder a través de la URL de la aplicación en sus dispositivos.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instalación en Dispositivos Móviles</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="ios" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ios" className="flex items-center gap-2">
                <Apple className="w-4 h-4" />
                <span className="hidden sm:inline">iPhone/iPad</span>
                <span className="sm:hidden">iOS</span>
              </TabsTrigger>
              <TabsTrigger value="android" className="flex items-center gap-2">
                <Chrome className="w-4 h-4" />
                <span className="hidden sm:inline">Android</span>
                <span className="sm:hidden">Android</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ios" className="space-y-4 mt-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Apple className="w-5 h-5 text-blue-600" />
                  Instalación en iOS (iPhone/iPad)
                </h4>
                <div className="space-y-3">
                  {[
                    { num: "1", text: "Abre Safari (navegador de Apple)" },
                    { num: "2", text: `Accede a: ${appUrl}`, code: true },
                    { num: "3", text: "Inicia sesión con tus credenciales" },
                    { num: "4", text: "Toca el botón Compartir", icon: <Share2 className="w-4 h-4 inline ml-1" /> },
                    { num: "5", text: "Desplaza hacia abajo y toca 'Añadir a pantalla de inicio'" },
                    { num: "6", text: "Confirma tocando 'Añadir'" }
                  ].map((step) => (
                    <div key={step.num} className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-blue-600">{step.num}</Badge>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700">
                          {step.text}
                          {step.icon}
                        </p>
                        {step.code && (
                          <code className="block mt-1 text-xs bg-white px-2 py-1 rounded border break-all">
                            {appUrl}
                          </code>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-amber-50 rounded border border-amber-200 text-xs text-amber-800">
                  ⚠️ Importante: Debe ser Safari, no funciona con Chrome en iOS
                </div>
              </div>
            </TabsContent>

            <TabsContent value="android" className="space-y-4 mt-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Chrome className="w-5 h-5 text-green-600" />
                  Instalación en Android
                </h4>
                <div className="space-y-3">
                  {[
                    { num: "1", text: "Abre Chrome (navegador de Google)" },
                    { num: "2", text: `Accede a: ${appUrl}`, code: true },
                    { num: "3", text: "Inicia sesión con tus credenciales" },
                    { num: "4", text: "Aparecerá un mensaje emergente: 'Añadir a pantalla de inicio'" },
                    { num: "5", text: "Si no aparece automáticamente:", sub: true },
                    { num: "5a", text: "Toca el menú ⋮ (tres puntos arriba a la derecha)" },
                    { num: "5b", text: "Selecciona 'Instalar aplicación' o 'Añadir a pantalla de inicio'" }
                  ].map((step) => (
                    <div key={step.num} className={`flex items-start gap-3 ${step.sub ? 'ml-8' : ''}`}>
                      <Badge className="shrink-0 bg-green-600">{step.num}</Badge>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700">{step.text}</p>
                        {step.code && (
                          <code className="block mt-1 text-xs bg-white px-2 py-1 rounded border break-all">
                            {appUrl}
                          </code>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">✓ Ventajas de la PWA</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-slate-700">
              <li>• No ocupa espacio en el dispositivo</li>
              <li>• Actualizaciones automáticas</li>
              <li>• Mismo inicio de sesión que web</li>
              <li>• Funciona sin conexión (limitado)</li>
              <li>• Interfaz optimizada para móvil</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">📱 Funciones Móviles</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-slate-700">
              <li>• Solicitar ausencias</li>
              <li>• Ver planificación</li>
              <li>• Recibir notificaciones</li>
              <li>• Actualizar perfil</li>
              <li>• Mensajería con equipo</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}