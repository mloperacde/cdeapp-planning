import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, AlertTriangle, Users } from "lucide-react";

const normalizeString = (str) => {
  if (!str) return "";
  return str.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
};

export default function SkillGapAnalysis({ department = "all" }) {
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    initialData: [],
  });

  const { data: skills } = useQuery({
    queryKey: ['skills'],
    queryFn: () => base44.entities.Skill.list(),
    initialData: [],
  });

  const { data: employeeSkills } = useQuery({
    queryKey: ['employeeSkills'],
    queryFn: () => base44.entities.EmployeeSkill.list(),
    initialData: [],
  });

  const { data: processes } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list(),
    initialData: [],
  });

  const { data: processSkillRequirements } = useQuery({
    queryKey: ['processSkillRequirements'],
    queryFn: () => base44.entities.ProcessSkillRequirement.list(),
    initialData: [],
  });

  const getLevelValue = (level) => {
    switch (level) {
      case "Experto": return 4;
      case "Avanzado": return 3;
      case "Intermedio": return 2;
      case "Básico": return 1;
      default: return 0;
    }
  };

  // Análisis de brechas por proceso
  const processGaps = useMemo(() => {
    return processes.map(process => {
      const requirements = processSkillRequirements.filter(psr => psr.process_id === process.id);
      
      let employeesQualified = 0;
      let employeesPartiallyQualified = 0;
      let employeesNotQualified = 0;

      employees.forEach(emp => {
        const matchesDepartment =
          department === "all" ||
          (emp.departamento && normalizeString(emp.departamento) === normalizeString(department));
        if (matchesDepartment && emp.disponibilidad === "Disponible") {
          const empSkills = employeeSkills.filter(es => es.employee_id === emp.id);
          
          let meetsRequirements = 0;
          requirements.forEach(req => {
            const hasSkill = empSkills.find(es => 
              es.skill_id === req.skill_id && 
              getLevelValue(es.nivel_competencia) >= getLevelValue(req.nivel_minimo_requerido)
            );
            if (hasSkill) meetsRequirements++;
          });

          if (meetsRequirements === requirements.length && requirements.length > 0) {
            employeesQualified++;
          } else if (meetsRequirements > 0) {
            employeesPartiallyQualified++;
          } else if (requirements.length > 0) {
            employeesNotQualified++;
          }
        }
      });

      const totalEvaluated = employeesQualified + employeesPartiallyQualified + employeesNotQualified;
      const coverage = totalEvaluated > 0 ? Math.round((employeesQualified / totalEvaluated) * 100) : 0;

      return {
        process,
        requirements: requirements.length,
        employeesQualified,
        employeesPartiallyQualified,
        employeesNotQualified,
        coverage,
        risk: coverage < 30 ? "Alto" : coverage < 60 ? "Medio" : "Bajo"
      };
    }).filter(pg => pg.requirements > 0);
  }, [processes, processSkillRequirements, employees, employeeSkills]);

  // Brechas por habilidad
  const skillGaps = useMemo(() => {
    return skills.map(skill => {
      const requirements = processSkillRequirements.filter(psr => psr.skill_id === skill.id);
      const employeesWithSkill = employeeSkills.filter(es => es.skill_id === skill.id);
      
      const expertCount = employeesWithSkill.filter(es => es.nivel_competencia === "Experto").length;
      const advancedCount = employeesWithSkill.filter(es => es.nivel_competencia === "Avanzado").length;
      const intermediateCount = employeesWithSkill.filter(es => es.nivel_competencia === "Intermedio").length;
      const basicCount = employeesWithSkill.filter(es => es.nivel_competencia === "Básico").length;

      const totalWithSkill = employeesWithSkill.length;
      const processesRequiring = requirements.length;

      return {
        skill,
        totalWithSkill,
        expertCount,
        advancedCount,
        intermediateCount,
        basicCount,
        processesRequiring,
        coverage: processesRequiring > 0 ? Math.round((totalWithSkill / (processesRequiring * 2)) * 100) : 100
      };
    }).filter(sg => sg.processesRequiring > 0)
      .sort((a, b) => a.coverage - b.coverage);
  }, [skills, employeeSkills, processSkillRequirements]);

  const getSkillName = (skillId) => skills.find(s => s.id === skillId)?.nombre || "Desconocida";

  return (
    <div className="space-y-6">
      {/* Resumen de Riesgo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700 font-medium">Procesos en Riesgo Alto</p>
                <p className="text-2xl font-bold text-red-900">
                  {processGaps.filter(pg => pg.risk === "Alto").length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-700 font-medium">Procesos en Riesgo Medio</p>
                <p className="text-2xl font-bold text-orange-900">
                  {processGaps.filter(pg => pg.risk === "Medio").length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 font-medium">Procesos Cubiertos</p>
                <p className="text-2xl font-bold text-green-900">
                  {processGaps.filter(pg => pg.risk === "Bajo").length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Análisis por Proceso */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Análisis de Brechas por Proceso
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {processGaps.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              No hay procesos con requisitos de habilidades configurados
            </p>
          ) : (
            <div className="space-y-4">
              {processGaps.map((gap) => (
                <Card key={gap.process.id} className={`border-2 ${
                  gap.risk === "Alto" ? "border-red-300 bg-red-50" :
                  gap.risk === "Medio" ? "border-orange-300 bg-orange-50" :
                  "border-green-300 bg-green-50"
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">{gap.process.nombre}</span>
                          <Badge variant="outline">{gap.requirements} habilidades requeridas</Badge>
                        </div>
                        <div className="text-sm text-slate-600">
                          {gap.process.codigo}
                        </div>
                      </div>
                      <Badge className={
                        gap.risk === "Alto" ? "bg-red-600" :
                        gap.risk === "Medio" ? "bg-orange-600" :
                        "bg-green-600"
                      }>
                        Riesgo {gap.risk}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Cobertura de Personal</span>
                        <span className="font-semibold">{gap.coverage}%</span>
                      </div>
                      <Progress value={gap.coverage} className="h-2" />
                      
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="text-center p-2 bg-white rounded border">
                          <div className="text-lg font-bold text-green-900">{gap.employeesQualified}</div>
                          <div className="text-xs text-slate-600">Cualificados</div>
                        </div>
                        <div className="text-center p-2 bg-white rounded border">
                          <div className="text-lg font-bold text-orange-900">{gap.employeesPartiallyQualified}</div>
                          <div className="text-xs text-slate-600">Parcialmente</div>
                        </div>
                        <div className="text-center p-2 bg-white rounded border">
                          <div className="text-lg font-bold text-red-900">{gap.employeesNotQualified}</div>
                          <div className="text-xs text-slate-600">No cualificados</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Análisis por Habilidad */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Distribución de Habilidades
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {skillGaps.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              No hay datos suficientes para el análisis
            </p>
          ) : (
            <div className="space-y-3">
              {skillGaps.map((gap) => (
                <Card key={gap.skill.id} className="bg-slate-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold">{gap.skill.nombre}</div>
                        <div className="text-xs text-slate-600">
                          Requerida en {gap.processesRequiring} proceso{gap.processesRequiring !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <Badge className="bg-blue-600">{gap.totalWithSkill} empleados</Badge>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex-1 h-8 bg-white rounded overflow-hidden flex">
                        {gap.expertCount > 0 && (
                          <div 
                            className="bg-purple-600 flex items-center justify-center text-white text-xs font-semibold"
                            style={{ width: `${(gap.expertCount / gap.totalWithSkill) * 100}%` }}
                            title={`${gap.expertCount} Expertos`}
                          >
                            {gap.expertCount > 0 && gap.expertCount}
                          </div>
                        )}
                        {gap.advancedCount > 0 && (
                          <div 
                            className="bg-green-600 flex items-center justify-center text-white text-xs font-semibold"
                            style={{ width: `${(gap.advancedCount / gap.totalWithSkill) * 100}%` }}
                            title={`${gap.advancedCount} Avanzados`}
                          >
                            {gap.advancedCount > 0 && gap.advancedCount}
                          </div>
                        )}
                        {gap.intermediateCount > 0 && (
                          <div 
                            className="bg-blue-600 flex items-center justify-center text-white text-xs font-semibold"
                            style={{ width: `${(gap.intermediateCount / gap.totalWithSkill) * 100}%` }}
                            title={`${gap.intermediateCount} Intermedios`}
                          >
                            {gap.intermediateCount > 0 && gap.intermediateCount}
                          </div>
                        )}
                        {gap.basicCount > 0 && (
                          <div 
                            className="bg-slate-600 flex items-center justify-center text-white text-xs font-semibold"
                            style={{ width: `${(gap.basicCount / gap.totalWithSkill) * 100}%` }}
                            title={`${gap.basicCount} Básicos`}
                          >
                            {gap.basicCount > 0 && gap.basicCount}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-purple-600 rounded"></div>
                        <span>Experto</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-600 rounded"></div>
                        <span>Avanzado</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-600 rounded"></div>
                        <span>Intermedio</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-slate-600 rounded"></div>
                        <span>Básico</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
