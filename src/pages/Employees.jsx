import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Users, Database, Settings, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EmployeesPage() {
  const { data: masterEmployees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    initialData: [],
  });

  const { data: syncedEmployees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Gestión de Empleados
          </h1>
          <p className="text-slate-600 mt-1">
            Sistema basado en Base de Datos Maestra
          </p>
        </div>

        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <p className="font-semibold mb-2">Nuevo Sistema de Gestión de Empleados</p>
            <p className="text-sm">
              Este sistema ahora funciona con una <strong>Base de Datos Maestra</strong> como fuente única de verdad. 
              Todos los empleados deben ser importados y gestionados desde el archivo maestro.
            </p>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Empleados en BD Maestra</p>
                  <p className="text-4xl font-bold mt-2">{masterEmployees.length}</p>
                  <p className="text-blue-100 text-xs mt-1">Fuente única de verdad</p>
                </div>
                <Database className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Empleados Sincronizados</p>
                  <p className="text-4xl font-bold mt-2">{syncedEmployees.length}</p>
                  <p className="text-green-100 text-xs mt-1">Sistema operativo</p>
                </div>
                <Users className="w-12 h-12 text-green-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to={createPageUrl("MasterEmployeeDatabase")}>
            <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 border-blue-200 hover:border-blue-400">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                      Base de Datos Maestra
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Importa, gestiona y sincroniza empleados desde el archivo maestro
                    </p>
                    <ul className="text-xs text-slate-500 space-y-1">
                      <li>• Importación masiva desde CSV</li>
                      <li>• Sincronización con sistema operativo</li>
                      <li>• Historial de cambios</li>
                      <li>• Gestión de estados</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("AdvancedConfiguration")}>
            <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 border-purple-200 hover:border-purple-400">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-purple-600 transition-colors">
                      Configuración Avanzada
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Personaliza departamentos, puestos, horarios y parámetros
                    </p>
                    <ul className="text-xs text-slate-500 space-y-1">
                      <li>• Gestión de departamentos y puestos</li>
                      <li>• Configuración de horarios</li>
                      <li>• Parámetros de sincronización</li>
                      <li>• Mapeo de campos CSV</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="mt-8 p-6 bg-slate-50 rounded-lg border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-3">Flujo de Trabajo</h3>
          <ol className="space-y-3 text-sm text-slate-700">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <strong>Importar archivo maestro:</strong> Sube tu CSV con todos los empleados a la Base de Datos Maestra
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <strong>Configurar mapeo:</strong> Asigna cada columna del CSV a los campos del sistema
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <strong>Sincronizar:</strong> Sincroniza los empleados con el sistema operativo
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">4</span>
              <div>
                <strong>Configurar parámetros:</strong> Ajusta departamentos, puestos y horarios en Configuración Avanzada
              </div>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}