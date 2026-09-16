/**
 * Determina si una ausencia es auto-detectada por el sistema (Cuco360/shiftAudit).
 *
 * Solo se considera "auto-detectada" si está Pendiente (sin clasificar por RRHH).
 * Una vez aprobada/rechazada/cancelada, se trata como ausencia formal para
 * estadísticas, informes y exportación de nómina.
 *
 * Esto permite que las ausencias justificadas desde la bandeja de detección
 * cuenten en todas las estadísticas igual que las registradas manualmente.
 */
export const isAutoAbsence = (abs) => {
  if (!abs) return false;
  if (abs.estado_aprobacion !== 'Pendiente') return false;
  return abs.motivo === 'Ausencia no comunicada - detección automática' ||
    abs.motivo === 'Ausencia detectada automáticamente por análisis de presencia' ||
    (abs.notas && (
      abs.notas.startsWith('[SISTEMA]') ||
      abs.notas.startsWith('[shiftAudit]') ||
      abs.notas.startsWith('Creado automáticamente')
    ));
};

/**
 * Versión "cruda" — identifica ausencias auto-detectadas sin importar el estado.
 * Útil para marcar visualmente el origen (icono bot) en listados históricos.
 */
export const wasAutoDetected = (abs) => {
  if (!abs) return false;
  return abs.motivo === 'Ausencia no comunicada - detección automática' ||
    abs.motivo === 'Ausencia detectada automáticamente por análisis de presencia' ||
    (abs.notas && (
      abs.notas.startsWith('[SISTEMA]') ||
      abs.notas.startsWith('[shiftAudit]') ||
      abs.notas.startsWith('Creado automáticamente')
    ));
};