import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, UserX, Calendar, TrendingUp, FileText, Download, UserPlus, Award, BarChart3, Clock } from "lucide-react";
import { format, differenceInDays, startOfYear, endOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { calculateGlobalAbsenteeism } from "../components/absences/AbsenteeismCalculator";

export default function HRDashboardPage() {
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  const { data: onboardings = [] } = useQuery({
    queryKey: ['onboardings'],
    queryFn: () => base44.entities.EmployeeOnboarding.list(),
    initialData: [],
  });

  const { data: vacationBalances = [] } = useQuery({
    queryKey: ['vacationBalances'],
    queryFn: () => base44.entities.AbsenceDaysBalance.list(),
    initialData: [],
  });

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list('orden'),
    initialData: [],
  });

  const { data: employeeSkills = [] } = useQuery({
    queryKey: ['employeeSkills'],
    queryFn: () => base44.entities.EmployeeSkill.list(),
    initialData: [],
  });

  const { data: trainingNeeds = [] } = useQuery({
    queryKey: ['trainingNeeds'],
    queryFn: () => base44.entities.TrainingNeed.list(),
    initialData: [],
  });

  // Absentismo global
  const { data: globalAbsenteeism } = useQuery({
    queryKey: ['globalAbsenteeism'],
    queryFn: async () => {
      const now = new Date();
      return calculateGlobalAbsenteeism(startOfYear(now), now);
    },
    initialData: { tasaAbsentismoGlobal: 0, totalHorasNoTrabajadas: 0, totalHorasDeberianTrabajarse: 0 },
    staleTime: 60 * 60 * 1000, // Cache 1 hora
  });

  // Active absences today
  const activeAbsences = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return absences.filter(abs => {
      const start = new Date(abs.fecha_inicio);
      const end = new Date(abs.fecha_fin);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return now >= start && now <= end && abs.estado_aprobacion === "Aprobada";
    });
  }, [absences]);

  // Pending absence requests
  const pendingAbsences = useMemo(() => {
    return absences.filter(abs => abs.estado_aprobacion === "Pendiente");
  }, [absences]);

  // Active onboardings
  const activeOnboardings = useMemo(() => {
    return onboardings.filter(o => o.estado !== "Completado");
  }, [onboardings]);

  // Vacation summary
  const vacationSummary = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const thisYearBalances = vacationBalances.filter(v => v.anio === currentYear && v.tipo_permiso === "Vacaciones");
    
    const totalDays = thisYearBalances.reduce((sum, v) => sum + (v.dias_totales_derecho || 0), 0);
    const consumedDays = thisYearBalances.reduce((sum, v) => sum + (v.dias_disfrutados || 0), 0);
    const pendingDays = thisYearBalances.reduce((sum, v) => sum + (v.dias_pendientes || 0), 0);
    
    return { totalDays, consumedDays, pendingDays };
  }, [vacationBalances]);

  // Employee distribution
  const employeeDistribution = useMemo(() => {
    const byDepartment = {};
    employees.forEach(emp => {
      const dept = emp.departamento || 'Sin Departamento';
      if (!byDepartment[dept]) {
        byDepartment[dept] = { total: 0, available: 0 };
      }
      byDepartment[dept].total++;
      if (emp.disponibilidad === "Disponible") {
        byDepartment[dept].available++;
      }
    });
    return Object.entries(byDepartment).sort((a, b) => b[1].total - a[1].total);
  }, [employees]);

  // Recent hires
  const recentHires = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return employees.filter(emp => {
      if (!emp.fecha_alta) return false;
      const hireDate = new Date(emp.fecha_alta);
      return hireDate >= thirtyDaysAgo;
    }).sort((a, b) => new Date(b.fecha_alta) - new Date(a.fecha_alta));
  }, [employees]);

  // Contract expiring
  const expiringContracts = useMemo(() => {
    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(now.getMonth() + 3);
    
    return employees.filter(emp => {
      if (!emp.fecha_fin_contrato) return false;
      const endDate = new Date(emp.fecha_fin_contrato);
      return endDate >= now && endDate <= threeMonthsFromNow;
    }).sort((a, b) => new Date(a.fecha_fin_contrato) - new Date(b.fecha_fin_contrato));
  }, [employees]);

  // Absentismo por departamento
  const absenteeismByDept = useMemo(() => {
    const byDept = {};
    employees.forEach(emp => {
      const dept = emp.departamento || 'Sin Departamento';
      if (!byDept[dept]) {
        byDept[dept] = { 
          total: 0, 
          horasNoTrabajadas: 0, 
          horasDeberianTrabajarse: 0,
          tasa: 0 
        };
      }
      byDept[dept].total++;
      byDept[dept].horasNoTrabajadas += emp.horas_no_trabajadas || 0;
      byDept[dept].horasDeberianTrabajarse += emp.horas_deberian_trabajarse || 0;
      
      if (byDept[dept].horasDeberianTrabajarse > 0) {
        byDept[dept].tasa = (byDept[dept].horasNoTrabajadas / byDept[dept].horasDeberianTrabajarse) * 100;
      }
    });
    return Object.entries(byDept)
      .sort((a, b) => b[1].tasa - a[1].tasa)
      .slice(0, 5);
  }, [employees]);

  // Skills summary
  const skillsSummary = useMemo(() => {
    const employeesWithSkills = new Set(employeeSkills.map(es => es.employee_id)).size;
    const expertCount = employeeSkills.filter(es => es.nivel_competencia === "Experto").length;
    const pendingTraining = trainingNeeds.filter(tn => tn.estado === "Pendiente").length;
    
    return { employeesWithSkills, expertCount, pendingTraining };
  }, [employeeSkills, trainingNeeds]);

  const downloadAbsenceTypesPDF = () => {
    const printWindow = window.open('', '_blank');
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tipos de Ausencias y Permisos - ${format(new Date(), 'dd/MM/yyyy')}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              background: white;
            }
            h1 { 
              color: #1e293b; 
              margin-bottom: 10px;
              font-size: 24px;
            }
            .subtitle { 
              color: #64748b; 
              margin-bottom: 30px;
              font-size: 14px;
            }
            .absence-type {
              margin-bottom: 20px;
              padding: 15px;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              page-break-inside: avoid;
            }
            .absence-header {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 10px;
              padding-bottom: 10px;
              border-bottom: 2px solid #e2e8f0;
            }
            .absence-title {
              font-size: 16px;
              font-weight: bold;
              color: #0f172a;
            }
            .absence-code {
              padding: 2px 8px;
              background: #f1f5f9;
              border-radius: 4px;
              font-size: 11px;
              color: #64748b;
            }
            .badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 10px;
              margin-right: 5px;
              margin-bottom: 5px;
            }
            .badge-green { background: #d1fae5; color: #065f46; }
            .badge-orange { background: #fed7aa; color: #9a3412; }
            .badge-red { background: #fecaca; color: #991b1b; }
            .badge-gray { background: #f1f5f9; color: #475569; }
            .info-section {
              margin-top: 10px;
              font-size: 13px;
              line-height: 1.6;
            }
            .info-label {
              font-weight: bold;
              color: #475569;
            }
            .info-value {
              color: #0f172a;
              margin-bottom: 5px;
            }
            @media print {
              body { padding: 20px; }
              .absence-type { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>Tipos de Ausencias y Permisos</h1>
          <p class="subtitle">Generado el ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
          
          ${absenceTypes.map(type => `
            <div class="absence-type">
              <div class="absence-header">
                <span class="absence-title">${type.nombre}</span>
                <span class="absence-code">${type.codigo}</span>
              </div>
              
              <div>
                ${type.remunerada ? '<span class="badge badge-green">Remunerada</span>' : ''}
                ${type.requiere_aprobacion ? '<span class="badge badge-orange">Requiere Aprobación</span>' : ''}
                ${type.es_critica ? '<span class="badge badge-red">Crítica</span>' : ''}
                <span class="badge badge-gray">${type.categoria_principal}</span>
                <span class="badge badge-gray">${type.subcategoria}</span>
              </div>
              
              <div class="info-section">
                ${type.descripcion ? `<div class="info-value">${type.descripcion}</div>` : ''}
                
                ${type.duracion_descripcion ? `
                  <div><span class="info-label">Duración:</span> <span class="info-value">${type.duracion_descripcion}</span></div>
                ` : ''}
                
                ${type.hecho_causante ? `
                  <div><span class="info-label">Hecho Causante:</span> <span class="info-value">${type.hecho_causante}</span></div>
                ` : ''}
                
                ${type.articulo_referencia ? `
                  <div><span class="info-label">Referencia Legal:</span> <span class="info-value">${type.articulo_referencia}</span></div>
                ` : ''}
                
                ${type.consideraciones ? `
                  <div><span class="info-label">Consideraciones:</span> <span class="info-value">${type.consideraciones}</span></div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Panel de Control RRHH
            </h1>
            <p className="text-slate-600 mt-1">
              Vista general de gestión de empleados
            </p>
          </div>
          <Button onClick={downloadAbsenceTypesPDF} className="bg-blue-600">
            <Download className="w-4 h-4 mr-2" />
            Descargar Guía PDF
          </Button>
        </div>

        {/* KPIs Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Empleados</p>
                  <p className="text-4xl font-bold mt-2">{employees.length}</p>
                </div>
                <Users className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Disponibles</p>
                  <p className="text-4xl font-bold mt-2">
                    {employees.filter(e => e.disponibilidad === "Disponible").length}
                  </p>
                </div>
                <UserCheck className="w-12 h-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Ausencias Activas</p>
                  <p className="text-4xl font-bold mt-2">{activeAbsences.length}</p>
                </div>
                <UserX className="w-12 h-12 text-red-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Solicitudes Pendientes</p>
                  <p className="text-4xl font-bold mt-2">{pendingAbsences.length}</p>
                </div>
                <Calendar className="w-12 h-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vacation Summary */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Resumen de Vacaciones {new Date().getFullYear()}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-900">Días Totales</span>
                  <Badge className="bg-blue-600 text-white text-lg px-3">
                    {vacationSummary.totalDays}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-red-900">Días Consumidos</span>
                  <Badge className="bg-red-600 text-white text-lg px-3">
                    {vacationSummary.consumedDays}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-green-900">Días Pendientes</span>
                  <Badge className="bg-green-600 text-white text-lg px-3">
                    {vacationSummary.pendingDays}
                  </Badge>
                </div>
              </div>
              <Link to={createPageUrl("AbsenceManagement")}>
                <Button className="w-full" variant="outline">Ver Detalles</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Onboarding Status */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Estado de Onboarding
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <div className="text-3xl font-bold text-emerald-900">{activeOnboardings.length}</div>
                <div className="text-sm text-emerald-700">En Proceso</div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Altas Recientes (30 días)</p>
                {recentHires.slice(0, 3).map(emp => (
                  <div key={emp.id} className="p-2 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-900">{emp.nombre}</p>
                    <p className="text-xs text-slate-600">
                      {format(new Date(emp.fecha_alta), "d MMM", { locale: es })} • {emp.puesto || 'Sin puesto'}
                    </p>
                  </div>
                ))}
              </div>
              <Link to={createPageUrl("EmployeeOnboarding")}>
                <Button className="w-full" variant="outline">Ver Onboarding</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Department Distribution */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Distribución por Departamento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                {employeeDistribution.slice(0, 5).map(([dept, stats]) => (
                  <div key={dept} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                    <span className="text-sm font-medium text-slate-700">{dept}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {stats.total}
                      </Badge>
                      <Badge className="bg-green-600 text-white text-xs">
                        {stats.available} disp.
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <Link to={createPageUrl("Employees")}>
                <Button className="w-full mt-4" variant="outline">Ver Empleados</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Absenteeism Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-red-600" />
                Tasa de Absentismo General
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-red-600">
                  {globalAbsenteeism.tasaAbsentismoGlobal.toFixed(2)}%
                </div>
                <div className="text-sm text-slate-600 mt-2">Acumulado año {new Date().getFullYear()}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 p-3 rounded-lg text-center">
                  <div className="text-xs text-red-700 mb-1">Horas No Trabajadas</div>
                  <div className="text-lg font-bold text-red-900">
                    {Math.round(globalAbsenteeism.totalHorasNoTrabajadas)}h
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <div className="text-xs text-blue-700 mb-1">Horas Deberían Trabajarse</div>
                  <div className="text-lg font-bold text-blue-900">
                    {Math.round(globalAbsenteeism.totalHorasDeberianTrabajarse)}h
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                Absentismo por Departamento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {absenteeismByDept.map(([dept, stats]) => (
                  <div key={dept} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">{dept}</div>
                      <div className="text-xs text-slate-600">{stats.total} empleados</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        stats.tasa > 5 ? 'text-red-600' : 
                        stats.tasa > 3 ? 'text-orange-600' : 
                        'text-green-600'
                      }`}>
                        {stats.tasa.toFixed(1)}%
                      </div>
                      <div className="text-xs text-slate-500">
                        {Math.round(stats.horasNoTrabajadas)}h / {Math.round(stats.horasDeberianTrabajarse)}h
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Skills & Training Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Empleados con Habilidades</p>
                  <p className="text-4xl font-bold mt-2">{skillsSummary.employeesWithSkills}</p>
                </div>
                <Award className="w-12 h-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm font-medium">Habilidades Expertas</p>
                  <p className="text-4xl font-bold mt-2">{skillsSummary.expertCount}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-indigo-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Formación Pendiente</p>
                  <p className="text-4xl font-bold mt-2">{skillsSummary.pendingTraining}</p>
                </div>
                <Clock className="w-12 h-12 text-amber-200" />
              </div>
              <Link to={createPageUrl("SkillMatrix")}>
                <Button variant="secondary" size="sm" className="mt-3 w-full bg-white/20 hover:bg-white/30">
                  Ver Matriz
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Pending Absences */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                Solicitudes de Ausencia Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {pendingAbsences.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No hay solicitudes pendientes</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {pendingAbsences.map(abs => {
                    const emp = employees.find(e => e.id === abs.employee_id);
                    return (
                      <div key={abs.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="font-semibold text-sm text-amber-900">{emp?.nombre || 'Empleado'}</p>
                        <p className="text-xs text-amber-700">
                          {abs.motivo} • {format(new Date(abs.fecha_inicio), "d MMM", { locale: es })} - 
                          {format(new Date(abs.fecha_fin), "d MMM", { locale: es })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link to={createPageUrl("AbsenceManagement")}>
                <Button className="w-full mt-4" variant="outline">Gestionar Ausencias</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Expiring Contracts */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-red-600" />
                Contratos Próximos a Vencer (3 meses)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {expiringContracts.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No hay contratos próximos a vencer</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {expiringContracts.map(emp => {
                    const daysUntil = differenceInDays(new Date(emp.fecha_fin_contrato), new Date());
                    return (
                      <div key={emp.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="font-semibold text-sm text-red-900">{emp.nombre}</p>
                        <p className="text-xs text-red-700">
                          Vence: {format(new Date(emp.fecha_fin_contrato), "d MMM yyyy", { locale: es })}
                          {' '}({daysUntil} días)
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link to={createPageUrl("Employees")}>
                <Button className="w-full mt-4" variant="outline">Ver Empleados</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}