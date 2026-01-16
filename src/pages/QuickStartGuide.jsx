import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Zap,
  LogIn,
  Calendar,
  Eye,
  CheckCircle,
  ArrowRight,
  BookOpen
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function QuickStartGuidePage() {
  const appUrl = window.location.origin;

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-4xl mx-auto">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-emerald-50 to-blue-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-600 to-blue-600 rounded-xl">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Guía de Inicio Rápido</CardTitle>
              <p className="text-slate-600 mt-1">Comienza en 3 minutos</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {/* PASO 1 */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-xl shrink-0">
                <LogIn className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-blue-600">Paso 1</Badge>
                  <h3 className="font-bold text-lg">Inicia Sesión</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-700">
                    1. Accede a: <code className="bg-slate-100 px-2 py-1 rounded text-xs">{appUrl}</code>
                  </p>
                  <p className="text-sm text-slate-700">
                    2. Introduce tu <strong>email corporativo</strong> y <strong>contraseña</strong>
                  </p>
                  <p className="text-sm text-slate-700">
                    3. Haz clic en <strong>"Iniciar Sesión"</strong>
                  </p>
                  <div className="p-3 bg-blue-50 rounded mt-2">
                    <p className="text-xs text-blue-800">
                      💡 Si es tu primera vez, primero debes activar tu cuenta desde el email de invitación que recibiste
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PASO 2 */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-xl shrink-0">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-600">Paso 2</Badge>
                  <h3 className="font-bold text-lg">Explora el Dashboard</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-700">
                    El <strong>Dashboard</strong> es tu punto de partida - muestra:
                  </p>
                  <ul className="text-sm space-y-1 text-slate-700 list-disc list-inside ml-4">
                    <li>Resumen de ausencias del equipo</li>
                    <li>Estado de máquinas y mantenimiento</li>
                    <li>Próximos cumpleaños y eventos</li>
                    <li>Tu planificación del día</li>
                  </ul>
                  <Link to={createPageUrl("Dashboard")}>
                    <Button variant="outline" size="sm" className="mt-2">
                      Ver Dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PASO 3 */}
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-xl shrink-0">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-purple-600">Paso 3</Badge>
                  <h3 className="font-bold text-lg">Acciones Comunes</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 rounded">
                    <h4 className="font-semibold text-sm mb-2">📅 Para Solicitar una Ausencia:</h4>
                    <p className="text-sm text-slate-700">
                      <strong>RRHH → Gestión de Ausencias → Nueva Ausencia</strong>
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded">
                    <h4 className="font-semibold text-sm mb-2">🗓️ Para Ver tu Planificación:</h4>
                    <p className="text-sm text-slate-700">
                      <strong>Planning → Línea de Tiempo</strong> o <strong>Planning Diario</strong>
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded">
                    <h4 className="font-semibold text-sm mb-2">👤 Para Actualizar tu Perfil:</h4>
                    <p className="text-sm text-slate-700">
                      <strong>RRHH → Empleados → [Tu nombre] → Editar</strong>
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded">
                    <h4 className="font-semibold text-sm mb-2">📱 Para Instalar en Móvil:</h4>
                    <p className="text-sm text-slate-700">
                      Ve a la pestaña <strong>"App Móvil"</strong> en este manual
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RESUMEN */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              ¡Ya Estás Listo!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-700">
              Con estos 3 pasos ya puedes usar la aplicación. Explora el menú lateral para descubrir más funciones.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Link to={createPageUrl("UserManual")}>
                <Button variant="outline" className="w-full">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Manual Completo
                </Button>
              </Link>
              <Link to={createPageUrl("Dashboard")}>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Zap className="w-4 h-4 mr-2" />
                  Ir al Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
