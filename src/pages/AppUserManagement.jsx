import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Shield, Lock, Mail, ExternalLink, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAppData } from "@/components/data/DataProvider";

export default function AppUserManagement() {
  const { employees, rolesConfig } = useAppData();

  // Calcular estadísticas
  const totalEmployees = employees.length;
  const employeesWithEmail = employees.filter(e => e.email).length;
  const employeesWithRole = employees.filter(e => {
    const assignedRole = rolesConfig?.user_assignments?.[e.email];
    return !!assignedRole;
  }).length;

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              Gestión de Accesos y Seguridad
            </h1>
            <p className="text-slate-500">
              Centro de control para el acceso de usuarios a la aplicación
            </p>
          </div>
          <Link to="/Configuration">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-700 dark:text-blue-300 text-lg flex items-center gap-2">
                <Lock className="w-5 h-5" /> Autenticación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                Gestionada por <strong>Base44</strong>.
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                <li>Requiere cuenta de Base44</li>
                <li>Email y Contraseña seguros</li>
                <li>Gestión en el Dashboard de la Plataforma</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-purple-700 dark:text-purple-300 text-lg flex items-center gap-2">
                <Users className="w-5 h-5" /> Identidad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-purple-800 dark:text-purple-200 mb-2">
                Vinculación vía <strong>Email</strong>.
              </p>
              <div className="flex justify-between items-center text-xs mt-2">
                <span>Total Empleados:</span>
                <span className="font-bold">{totalEmployees}</span>
              </div>
              <div className="flex justify-between items-center text-xs mt-1">
                <span>Con Email corporativo:</span>
                <span className="font-bold">{employeesWithEmail}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-rose-700 dark:text-rose-300 text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" /> Autorización
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-rose-800 dark:text-rose-200 mb-2">
                Gestionada por <strong>RolesConfig</strong>.
              </p>
              <div className="flex justify-between items-center text-xs mt-2">
                <span>Roles Configurados:</span>
                <span className="font-bold">{rolesConfig?.roles ? Object.keys(rolesConfig.roles).length : 0}</span>
              </div>
              <div className="flex justify-between items-center text-xs mt-1">
                <span>Usuarios con Rol:</span>
                <span className="font-bold">{employeesWithRole}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>¿Cómo dar acceso a un nuevo usuario?</CardTitle>
              <CardDescription>Sigue estos pasos para habilitar el acceso a la aplicación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
                <div className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Invitar a la Plataforma</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    El usuario debe ser invitado al Workspace de Base44. Esto le enviará un correo para configurar su contraseña.
                  </p>
                  <Alert className="mt-3 bg-blue-50 border-blue-200">
                    <ExternalLink className="w-4 h-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">Acción Externa</AlertTitle>
                    <AlertDescription className="text-blue-700 text-xs">
                      Ve al Dashboard de Base44 &gt; Settings &gt; Users &gt; Invite User.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
                <div className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Registrar Empleado</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Asegúrate de que el usuario existe en la base de datos de empleados y tiene su email registrado correctamente.
                  </p>
                  <div className="mt-3">
                    <Link to="/MasterEmployeeDatabase">
                      <Button variant="outline" size="sm">
                        <Users className="w-4 h-4 mr-2" /> Ir a Base de Datos de Empleados
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
                <div className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Asignar Rol y Permisos</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Define qué puede hacer este usuario dentro de la aplicación asignándole un rol.
                  </p>
                  <div className="mt-3">
                    <Link to="/RolesConfig?tab=users">
                      <Button className="bg-rose-600 hover:bg-rose-700 text-white" size="sm">
                        <Shield className="w-4 h-4 mr-2" /> Asignar Roles
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                 </div>
                 <div>
                    <CardTitle>Diagnóstico de Acceso</CardTitle>
                    <CardDescription>Detecta automáticamente problemas de permisos</CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {employees.filter(e => e.email && !rolesConfig?.user_assignments?.[e.email]).length > 0 ? (
                <div className="space-y-4">
                  <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                    <AlertTitle className="text-amber-800 dark:text-amber-400 font-bold">Acción Requerida</AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-300">
                      Hemos detectado <strong>{employees.filter(e => e.email && !rolesConfig?.user_assignments?.[e.email]).length} empleados</strong> con email que no tienen rol asignado.
                      <br/>Estos usuarios podrán entrar pero verán la pantalla vacía.
                    </AlertDescription>
                  </Alert>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {employees
                      .filter(e => e.email && !rolesConfig?.user_assignments?.[e.email])
                      .slice(0, 6)
                      .map(e => (
                        <div key={e.id} className="flex items-center gap-3 p-3 border rounded bg-white dark:bg-slate-950">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                            {e.nombre?.charAt(0) || '?'}{e.apellidos?.charAt(0) || '?'}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{e.nombre} {e.apellidos}</p>
                            <p className="text-xs text-slate-500 truncate">{e.email}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                  {employees.filter(e => e.email && !rolesConfig?.user_assignments?.[e.email]).length > 6 && (
                    <p className="text-xs text-center text-slate-500 mt-2">
                      ...y {employees.filter(e => e.email && !rolesConfig?.user_assignments?.[e.email]).length - 6} más.
                    </p>
                  )}
                  <div className="flex justify-center mt-4">
                    <Link to="/RolesConfig?tab=users">
                      <Button size="sm">Solucionar en Gestión de Roles</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-green-600">
                  <CheckCircle className="w-12 h-12 mb-2" />
                  <p className="font-medium">Todos los empleados con email tienen rol asignado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
