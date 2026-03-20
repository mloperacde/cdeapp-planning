import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TIPOS = [
  'Calificación de Instalación (IQ)',
  'Calificación Operacional (OQ)',
  'Calificación de Funcionamiento (PQ)',
  'Validación de Proceso',
  'Validación de Limpieza',
  'Validación de Método Analítico',
  'Otro',
];

const ESTADOS = ['Borrador', 'En Revisión', 'Pendiente', 'Validado', 'Rechazado'];

export default function ReportGeneralInfo({ data, onChange }) {
  const f = (key) => (e) => onChange({ [key]: e.target.value });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label>Título del Informe *</Label>
          <Input value={data.tituloInforme} onChange={f('tituloInforme')} placeholder="Ej: Calificación de Instalación Autoclave XYZ-500" className="mt-1" />
        </div>

        <div>
          <Label>Número de Informe</Label>
          <Input value={data.numeroInforme} onChange={f('numeroInforme')} placeholder="Ej: IQ-2024-001" className="mt-1" />
        </div>

        <div>
          <Label>Estado</Label>
          <Select value={data.estadoInforme} onValueChange={(v) => onChange({ estadoInforme: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label>Tipo de Informe</Label>
          <Select value={data.tipoInforme} onValueChange={(v) => onChange({ tipoInforme: v })}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
            <SelectContent>
              {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Artículo / Equipo</Label>
          <Input value={data.articulo} onChange={f('articulo')} placeholder="Nombre del artículo o equipo" className="mt-1" />
        </div>
        <div>
          <Label>Código / ID Producto</Label>
          <Input value={data.productId} onChange={f('productId')} placeholder="Código interno" className="mt-1" />
        </div>

        <div>
          <Label>Sala / Área</Label>
          <Input value={data.sala} onChange={f('sala')} placeholder="Sala de fabricación" className="mt-1" />
        </div>
        <div>
          <Label>Línea</Label>
          <Input value={data.linea} onChange={f('linea')} placeholder="Línea de producción" className="mt-1" />
        </div>
        <div>
          <Label>Lote</Label>
          <Input value={data.lote} onChange={f('lote')} placeholder="Número de lote" className="mt-1" />
        </div>
        <div>
          <Label>Fecha del Informe *</Label>
          <Input type="date" value={data.fecha} onChange={f('fecha')} className="mt-1" />
        </div>
        <div>
          <Label>Fecha de Inicio</Label>
          <Input type="date" value={data.fechaInicio} onChange={f('fechaInicio')} className="mt-1" />
        </div>
        <div>
          <Label>Fecha de Fin</Label>
          <Input type="date" value={data.fechaFin} onChange={f('fechaFin')} className="mt-1" />
        </div>
        <div>
          <Label>Autor / Responsable *</Label>
          <Input value={data.autor} onChange={f('autor')} placeholder="Nombre del autor" className="mt-1" />
        </div>
        <div>
          <Label>Departamento</Label>
          <Input value={data.departamento} onChange={f('departamento')} placeholder="Departamento responsable" className="mt-1" />
        </div>
        <div>
          <Label>Aprobador QA</Label>
          <Input value={data.aprobadorQA} onChange={f('aprobadorQA')} placeholder="Nombre del aprobador QA" className="mt-1" />
        </div>
      </div>

      {/* Firmas */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Estado de Firmas</h3>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.firmaAutor}
              onChange={(e) => onChange({ firmaAutor: e.target.checked })}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">Firmado por Autor</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.firmaQA}
              onChange={(e) => onChange({ firmaQA: e.target.checked })}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">Aprobado por QA</span>
          </label>
        </div>
      </div>
    </div>
  );
}