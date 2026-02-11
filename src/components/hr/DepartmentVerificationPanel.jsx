import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Users, Building2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import OrganizationalChart from "./OrganizationalChart";

export default function DepartmentVerificationPanel() {
  const queryClient = useQueryClient();
  const [recalculating, setRecalculating] = useState(false);

  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      setRecalculating(true);
      const [deptResponse, posResponse] = await Promise.all([
        base44.functions.invoke('recalculateDepartmentData', {}),
        base44.functions.invoke('syncPositionDepartmentNames', {})
      ]);
      return {
        departments: deptResponse.data,
        positions: posResponse.data
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast.success(`${data.departments.message} y ${data.positions.message}`);
      setRecalculating(false);
    },
    onError: (error) => {
      toast.error('Error al recalcular: ' + error.message);
      setRecalculating(false);
    }
  });

  if (loadingDepts) {
    return <div className="p-6 text-center">Cargando datos...</div>;
  }

  // Verificaciones
  const deptsWithParentName = departments.filter(d => d.parent_id && d.parent_name);
  const deptsWithTotalCount = departments.filter(d => d.total_employee_count !== undefined);
  const deptsWithChildren = departments.filter(d => 
    departments.some(child => child.parent_id === d.id)
  );

  return (
    <div className="space-y-6 p-6">
      {/* Botón de recálculo */}
      <div className="flex justify-end">
        <Button 
          onClick={() => recalculateMutation.mutate()}
          disabled={recalculating}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
          {recalculating ? 'Recalculando...' : 'Recalcular Datos'}
        </Button>
      </div>

      {/* Panel de verificación */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Campo parent_name
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {deptsWithParentName.length > 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-600" />
              )}
              <div>
                <p className="text-2xl font-bold">{deptsWithParentName.length}</p>
                <p className="text-xs text-slate-500">
                  departamentos con parent_name
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Campo total_employee_count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {deptsWithTotalCount.length > 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-600" />
              )}
              <div>
                <p className="text-2xl font-bold">{deptsWithTotalCount.length}</p>
                <p className="text-xs text-slate-500">
                  departamentos con conteo total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Jerarquía
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{deptsWithChildren.length}</p>
                <p className="text-xs text-slate-500">
                  departamentos con sub-departamentos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de verificación detallada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Departamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-2">Departamento</th>
                  <th className="text-left p-2">Código</th>
                  <th className="text-left p-2">Padre</th>
                  <th className="text-left p-2">parent_name</th>
                  <th className="text-right p-2">Total Empleados</th>
                  <th className="text-center p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(dept => {
                  const parent = departments.find(d => d.id === dept.parent_id);
                  const hasParentName = dept.parent_id && dept.parent_name;
                  const hasTotalCount = dept.total_employee_count !== undefined;
                  const isValid = (!dept.parent_id) || (hasParentName && hasTotalCount);
                  
                  return (
                    <tr key={dept.id} className="border-t">
                      <td className="p-2 font-medium">{dept.name}</td>
                      <td className="p-2 text-slate-500">{dept.code || '-'}</td>
                      <td className="p-2 text-slate-500">{parent?.name || '-'}</td>
                      <td className="p-2">
                        {dept.parent_name ? (
                          <Badge variant="secondary" className="text-xs">
                            {dept.parent_name}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-2 text-right font-semibold">
                        {dept.total_employee_count !== undefined ? (
                          dept.total_employee_count
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {isValid ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-orange-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Organigrama visual */}
      <Card>
        <CardHeader>
          <CardTitle>Vista de Organigrama</CardTitle>
        </CardHeader>
        <CardContent>
          <OrganizationalChart 
            departments={departments}
            positions={positions}
            employees={employees}
          />
        </CardContent>
      </Card>
    </div>
  );
}