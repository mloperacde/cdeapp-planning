import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, PlayCircle, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

let base44Instance = null;

// Inicializar base44 dinámicamente
const getBase44 = async () => {
  if (!base44Instance) {
    const module = await import('@/api/base44Client');
    base44Instance = module.base44;
  }
  return base44Instance;
};

export default function DataRecoveryDashboard() {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryResult, setRecoveryResult] = useState(null);
  const [hasBase44, setHasBase44] = useState(false);

  useEffect(() => {
    getBase44().then(() => setHasBase44(true));
  }, []);

  const handleRecover = async () => {
    if (!hasBase44) {
      toast.error('Base44 aún no está inicializado');
      return;
    }
    
    setIsRecovering(true);
    setRecoveryResult(null);
    
    try {
      const base44 = await getBase44();
      const response = await base44.functions.invoke('recoverEmployeeMachineAssignments');
      const data = response.data || response;
      
      if (data.status === 'success') {
        setRecoveryResult(data);
        toast.success(`✅ Recuperación completada: ${data.summary.skillsCreated} habilidades creadas`);
      } else {
        toast.error('Error en la recuperación');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al ejecutar recuperación');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          Recuperación de Datos: Asignaciones Empleado-Máquina
        </h1>
        <p className="text-slate-600 mt-2">
          Migra las asignaciones históricas desde campos legacy a la entidad EmployeeSkill
        </p>
      </div>

      <Alert className="mb-6 bg-amber-50 border-amber-200">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>¿Qué hace esta migración?</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Lee campos maquina_1 a maquina_10 de EmployeeMasterDatabase</li>
            <li>• Mapea IDs legacy de Machine → IDs nuevos de MachineMasterDatabase</li>
            <li>• Crea registros en EmployeeSkill con nivel "Experto"</li>
            <li>• No borra datos antiguos, solo crea nuevos registros</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Estado de Migración</CardTitle>
        </CardHeader>
        <CardContent>
          {!recoveryResult && !isRecovering && (
            <div className="text-center py-8">
              <Database className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600 mb-4">
                La migración no se ha ejecutado aún
              </p>
              <Button 
                onClick={handleRecover}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
                disabled={!hasBase44}
              >
                <PlayCircle className="w-5 h-5 mr-2" />
                {hasBase44 ? 'Ejecutar Recuperación' : 'Inicializando...'}
              </Button>
            </div>
          )}

          {isRecovering && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-600 mb-4" />
              <p className="text-lg font-medium text-slate-700">Recuperando datos...</p>
              <p className="text-sm text-slate-500 mt-2">
                Esto puede tardar 30-60 segundos
              </p>
            </div>
          )}

          {recoveryResult && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">
                    Migración Completada Exitosamente
                  </h3>
                  <p className="text-sm text-green-700">
                    Los datos históricos se han recuperado
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-slate-50">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {recoveryResult.summary.totalEmployees}
                    </div>
                    <div className="text-xs text-slate-600">Total Empleados</div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-900">
                      {recoveryResult.summary.employeesWithMachines}
                    </div>
                    <div className="text-xs text-blue-700">Con Máquinas</div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-900">
                      {recoveryResult.summary.skillsCreated}
                    </div>
                    <div className="text-xs text-green-700">Skills Creadas</div>
                  </CardContent>
                </Card>

                <Card className="bg-amber-50">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-amber-900">
                      {recoveryResult.summary.errors || 0}
                    </div>
                    <div className="text-xs text-amber-700">Errores</div>
                  </CardContent>
                </Card>
              </div>

              {recoveryResult.summary.employeesSkipped > 0 && (
                <Alert className="bg-slate-50">
                  <AlertDescription className="text-sm">
                    <strong>Nota:</strong> {recoveryResult.summary.employeesSkipped} empleados 
                    sin máquinas asignadas fueron omitidos
                  </AlertDescription>
                </Alert>
              )}

              {recoveryResult.errors && recoveryResult.errors.length > 0 && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <strong className="text-red-900">Errores detectados:</strong>
                    <ul className="mt-2 text-sm text-red-800 space-y-1">
                      {recoveryResult.errors.map((err, idx) => (
                        <li key={idx}>
                          {err.employee}: {err.issue}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 justify-center pt-4">
                <Button 
                  variant="outline"
                  onClick={() => setRecoveryResult(null)}
                >
                  Limpiar Resultados
                </Button>
                <Button 
                  onClick={() => window.location.href = '/MachineAssignments'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Ir a Asignaciones de Equipos
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información Técnica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">Entidades Involucradas:</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">EmployeeMasterDatabase</Badge>
              <Badge variant="outline">MachineMasterDatabase</Badge>
              <Badge variant="outline">EmployeeSkill</Badge>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">Mapeo de Campos:</h4>
            <div className="bg-slate-50 p-3 rounded text-xs font-mono space-y-1">
              <div>employee.maquina_1...10 → legacy_machine_id</div>
              <div>machine.machine_id_legacy → mapeo a nuevo ID</div>
              <div>EmployeeSkill.create(employee_id, machine_id, nivel: Experto)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}