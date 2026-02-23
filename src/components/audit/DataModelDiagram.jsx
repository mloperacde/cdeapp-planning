import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, ArrowRight, Key, Link2, AlertTriangle, CheckCircle2, Info } from "lucide-react";

const FK = ({ from, to }) => (
  <div className="flex items-center gap-1.5 text-xs text-slate-600 py-0.5">
    <span className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">{from}</span>
    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
    <span className="font-mono bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-200">{to}</span>
  </div>
);

const EntityCard = ({ name, color = "slate", primaryKey, foreignKeys = [], notes = [], warning }) => (
  <Card className={`border-${color}-200 bg-${color}-50 dark:bg-${color}-950`}>
    <CardHeader className="pb-2 pt-3 px-3">
      <CardTitle className={`text-sm flex items-center gap-2 text-${color}-900 dark:text-${color}-100`}>
        <Database className={`w-4 h-4 text-${color}-600`} />
        {name}
      </CardTitle>
    </CardHeader>
    <CardContent className="px-3 pb-3 space-y-2">
      {primaryKey && (
        <div className="flex items-center gap-1.5 text-xs">
          <Key className="w-3 h-3 text-amber-500" />
          <span className="font-mono text-amber-700 font-semibold">{primaryKey}</span>
          <Badge className="text-[9px] bg-amber-100 text-amber-700 h-4">PK</Badge>
        </div>
      )}
      {foreignKeys.length > 0 && (
        <div className="space-y-0.5 border-t border-slate-200 pt-2 mt-2">
          <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Relaciones (FK)</p>
          {foreignKeys.map((fk, i) => <FK key={i} from={fk.from} to={fk.to} />)}
        </div>
      )}
      {notes.map((note, i) => (
        <div key={i} className="flex items-start gap-1.5 text-[10px] text-slate-500 leading-tight">
          <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
          <span>{note}</span>
        </div>
      ))}
      {warning && (
        <div className="flex items-start gap-1.5 text-[10px] text-amber-700 leading-tight bg-amber-50 rounded p-1.5 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}
    </CardContent>
  </Card>
);

export default function DataModelDiagram() {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-blue-900">Fase 1 Completada: Estandarización de Employee ID</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Todas las entidades usan <code className="bg-blue-100 px-1 rounded">EmployeeMasterDatabase.id</code> como referencia única del empleado.
          </p>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-slate-600">Clave primaria (auto-generada por Base44)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">campo.origen</span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="font-mono bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-200 text-[10px]">Entidad.campo</span>
          <span className="text-slate-500">= Llave foránea (FK)</span>
        </div>
      </div>

      {/* Diagrama Principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Entidad Central */}
        <EntityCard
          name="EmployeeMasterDatabase ⭐"
          color="blue"
          primaryKey="id (Base44 auto-ID) — REFERENCIA MAESTRA"
          foreignKeys={[
            { from: "team_id", to: "TeamConfig.id" },
          ]}
          notes={[
            "codigo_empleado: código del sistema de fichajes (ej: '476'). Se cruza con AttendanceRecord.employee_id.",
            "employee.id es la referencia que deben usar TODAS las demás entidades.",
            "ausencia_inicio / ausencia_fin / ausencia_motivo: campos de CACHÉ, sincronizados desde Absence.",
            "legacy_employee_id: campo legado de sistema anterior, NO usar en nuevas relaciones.",
          ]}
        />

        {/* AttendanceRecord */}
        <EntityCard
          name="AttendanceRecord"
          color="green"
          primaryKey="id"
          foreignKeys={[]}
          notes={[
            "employee_id: contiene el código del sistema de fichajes (= EmployeeMasterDatabase.codigo_empleado).",
            "Para cruzar con datos del empleado: AttendanceRecord.employee_id === EmployeeMasterDatabase.codigo_empleado.",
            "NO apunta al id de EmployeeMasterDatabase (es un código externo del sistema de control de acceso).",
          ]}
          warning="Este campo es especial: viene del sistema externo de fichajes y contiene el codigo_empleado, no el id de Base44."
        />

        {/* Absence */}
        <EntityCard
          name="Absence"
          color="red"
          primaryKey="id"
          foreignKeys={[
            { from: "employee_id", to: "EmployeeMasterDatabase.id" },
            { from: "absence_type_id", to: "AbsenceType.id" },
            { from: "solicitado_por", to: "User.id" },
            { from: "aprobado_por", to: "User.id" },
          ]}
          notes={[
            "employee_id apunta al id del registro de EmployeeMasterDatabase (no al codigo_empleado).",
            "Para cruzar con AttendanceRecord: pasar por EmployeeMasterDatabase como tabla puente.",
          ]}
        />

        {/* ShiftAssignment */}
        <EntityCard
          name="ShiftAssignment"
          color="purple"
          primaryKey="id"
          foreignKeys={[
            { from: "employee_id", to: "EmployeeMasterDatabase.id" },
            { from: "maquinas_asignadas[]", to: "MachineMasterDatabase.id" },
            { from: "creado_por", to: "User.id" },
            { from: "modificado_por", to: "User.id" },
          ]}
        />

        {/* PerformanceReview */}
        <EntityCard
          name="PerformanceReview"
          color="amber"
          primaryKey="id"
          foreignKeys={[
            { from: "employee_id", to: "EmployeeMasterDatabase.id" },
          ]}
        />

        {/* PerformanceImprovementPlan */}
        <EntityCard
          name="PerformanceImprovementPlan"
          color="orange"
          primaryKey="id"
          foreignKeys={[
            { from: "employee_id", to: "EmployeeMasterDatabase.id" },
          ]}
        />

        {/* TeamConfig */}
        <EntityCard
          name="TeamConfig"
          color="teal"
          primaryKey="id"
          notes={[
            "team_key: identificador corto (team_1, team_2).",
            "team_name: nombre visible del equipo.",
            "Referenciado desde EmployeeMasterDatabase.team_id.",
          ]}
        />

        {/* AttendanceConfig */}
        <EntityCard
          name="AttendanceConfig"
          color="slate"
          primaryKey="id"
          notes={[
            "Solo debe existir UN registro con activo=true.",
            "El wrapper AttendanceConfigWrapper garantiza que se actualice el existente en lugar de crear duplicados.",
          ]}
        />

        {/* AbsenceType */}
        <EntityCard
          name="AbsenceType"
          color="pink"
          primaryKey="id"
          notes={[
            "Referenciado desde Absence.absence_type_id.",
            "El campo 'tipo' en Absence es una copia desnormalizada del nombre para consultas rápidas.",
          ]}
        />
      </div>

      {/* Nota de cruce AttendanceRecord ↔ Absence */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-3">
          <p className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Patrón de cruce: AttendanceRecord ↔ Ausencias (a través de EmployeeMasterDatabase)
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">AttendanceRecord.employee_id</span>
            <span className="text-slate-500">===</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">EmployeeMasterDatabase.codigo_empleado</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">EmployeeMasterDatabase.id</span>
            <span className="text-slate-500">===</span>
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Absence.employee_id</span>
          </div>
          <p className="text-[10px] text-amber-700 mt-2">
            Este patrón (ya implementado en AttendanceMonitor) es la forma correcta de vincular fichajes con ausencias.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}