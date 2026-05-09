import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

export default function AuditFilters({ filters, onChange, onClear }) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por usuario, empleado..."
          value={filters.search}
          onChange={e => onChange('search', e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={filters.category} onValueChange={v => onChange('category', v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="employee">Empleados</SelectItem>
          <SelectItem value="absence">Ausencias</SelectItem>
          <SelectItem value="salary">Salarial</SelectItem>
          <SelectItem value="config">Configuración</SelectItem>
          <SelectItem value="presence">Presencia</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.action} onValueChange={v => onChange('action', v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Acción" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="create">Creación</SelectItem>
          <SelectItem value="update">Modificación</SelectItem>
          <SelectItem value="delete">Eliminación</SelectItem>
          <SelectItem value="approve">Aprobación</SelectItem>
          <SelectItem value="reject">Rechazo</SelectItem>
          <SelectItem value="export">Exportación</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Input
          type="date"
          value={filters.dateFrom}
          onChange={e => onChange('dateFrom', e.target.value)}
          className="w-36"
        />
        <Input
          type="date"
          value={filters.dateTo}
          onChange={e => onChange('dateTo', e.target.value)}
          className="w-36"
        />
      </div>

      {(filters.search || filters.category !== 'all' || filters.action !== 'all' || filters.dateFrom || filters.dateTo) && (
        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1 text-slate-500">
          <X className="w-4 h-4" /> Limpiar
        </Button>
      )}
    </div>
  );
}