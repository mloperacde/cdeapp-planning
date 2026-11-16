export function formatMinutes(value) {
  const n = Number(value) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (!h) return `${sign}${m} min`;
  if (!m) return `${sign}${h} h`;
  return `${sign}${h} h ${m} min`;
}

export const UNIDADES = ['Minutos', 'Horas'];

export function toLocalInputValue(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatHitoDate(value) {
  if (!value) return 'Sin fecha de hito';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Sin fecha de hito';
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShortDate(d) {
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export function formatClock(d) {
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function activityWindow(hitoFecha, activity) {
  if (!hitoFecha) return null;
  const base = new Date(hitoFecha);
  if (Number.isNaN(base.getTime())) return null;
  const offset = Number(activity?.offset_minutos) || 0;
  const duration = Number(activity?.duracion_minutos) || 0;
  return {
    start: new Date(base.getTime() + offset * 60000),
    end: new Date(base.getTime() + (offset + duration) * 60000),
  };
}

export function unitValue(activity) {
  const minutes = Number(activity?.duracion_minutos) || 0;
  return activity?.unidad === 'Horas' ? Math.round((minutes / 60) * 100) / 100 : minutes;
}

export function fromUnit(value, unidad) {
  const n = Number(value) || 0;
  return Math.round(unidad === 'Horas' ? n * 60 : n);
}

export function offsetLabel(minutes) {
  const n = Number(minutes) || 0;
  if (!n) return '0 min';
  return `${n > 0 ? '+' : ''}${formatMinutes(n)}`;
}

export function activityId() {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}