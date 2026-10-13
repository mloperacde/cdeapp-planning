export const PMST_STEPS = [
  { id: 'identificacion', label: 'Identificación', icon: 'Building2' },
  { id: 'alcance', label: 'Alcance', icon: 'Users' },
  { id: 'metodologia', label: 'Metodología', icon: 'ClipboardList' },
  { id: 'diagnostico', label: 'Diagnóstico', icon: 'BarChart3' },
  { id: 'medidas', label: 'Medidas', icon: 'Target' },
  { id: 'negociacion', label: 'Negociación', icon: 'FileText' },
  { id: 'seguimiento', label: 'Seguimiento', icon: 'CalendarCheck' },
  { id: 'checklist', label: 'Checklist y registro', icon: 'CheckSquare' },
  { id: 'documento', label: 'Documento', icon: 'FileDown' },
];

export const MEASURE_CATEGORIES = [
  'Transporte público',
  'Movilidad activa',
  'Compartida/Colaborativa',
  'Teletrabajo',
  'Flexibilidad horaria',
  'Vehículos cero emisiones',
  'Bajas emisiones',
  'Transporte colectivo',
  'Seguridad vial',
  'Formación',
  'Otras',
];

export const REQUIRED_MEASURE_CATEGORIES = [
  'Transporte público',
  'Movilidad activa',
  'Compartida/Colaborativa',
  'Teletrabajo',
  'Flexibilidad horaria',
];

export const NEGOTIATION_TYPES = ['Reunión', 'Acuerdo', 'Aportación', 'Consulta'];

export const SURVEY_INTRO =
  'Encuesta anónima de movilidad. No se recoge ningún dato que permita identificarte: no se piden nombre, correo, matrícula ni domicilio exacto. Las respuestas se guardan únicamente como recuentos agregados por opción. Tratamiento conforme al RGPD, con base en el interés legítimo y la obligación legal de elaborar el PMST.';

export const DEFAULT_SURVEY_QUESTIONS = [
  {
    id: 'modal',
    texto: '¿Cómo te desplazas habitualmente al centro de trabajo?',
    tipo: 'opcion_unica',
    opciones: ['Coche (conduciendo solo/a)', 'Coche compartido', 'Motocicleta', 'Transporte público', 'Bicicleta', 'A pie', 'Teletrabajo'],
  },
  {
    id: 'distancia',
    texto: '¿Cuál es la distancia aproximada desde tu domicilio al centro?',
    tipo: 'opcion_unica',
    opciones: ['Menos de 3 km', 'Entre 3 y 10 km', 'Entre 10 y 25 km', 'Más de 25 km'],
  },
  {
    id: 'medidas',
    texto: '¿Qué medidas facilitarían tu movilidad sostenible?',
    tipo: 'opcion_multiple',
    opciones: [
      'Más frecuencia de transporte público',
      'Lanzadera desde estaciones',
      'Ayuda al transporte público',
      'Aparcamiento seguro para bicicletas',
      'Puntos de recarga eléctrica',
      'Teletrabajo',
      'Horario flexible',
      'Plazas de aparcamiento compartido',
    ],
  },
  {
    id: 'accesibilidad',
    texto: '¿Encuentras dificultades de accesibilidad en el acceso al centro?',
    tipo: 'opcion_unica',
    opciones: ['Sí', 'No', 'No lo sé'],
  },
];

export const CAM_REQUIREMENTS = [
  {
    id: 'contenido_minimo',
    titulo: 'Contenido mínimo del plan',
    estado: 'confirmado',
    referencia: 'Ley 9/2025 (normativa estatal)',
    detalle:
      'El plan debe incluir diagnóstico de movilidad, medidas de fomento del transporte público, movilidad activa, vehículo compartido, teletrabajo u horarios flexibles, negociación con la representación legal e indicadores de seguimiento con informe periódico.',
  },
  {
    id: 'umbrales',
    titulo: 'Umbrales de obligación',
    estado: 'confirmado',
    referencia: 'Ley 9/2025',
    detalle: 'Centros con más de 200 personas trabajadoras o más de 100 por turno.',
  },
  {
    id: 'plazo',
    titulo: 'Plazo de implantación',
    estado: 'validar',
    referencia: 'Ley 9/2025 — verificar en fuente oficial',
    detalle:
      'Fecha límite de referencia indicada en el proyecto: 5 de diciembre de 2026. Confirmar el calendario vigente antes de su uso.',
  },
  {
    id: 'registro_cam',
    titulo: 'Registro o depósito autonómico',
    estado: 'validar',
    referencia: 'Comunidad de Madrid — órgano competente en movilidad',
    detalle:
      'La Comunidad de Madrid determina el modelo, la documentación y el procedimiento de registro o depósito del PMST. No existe un modelo estatal único cerrado. Confirmar el cauce concreto, el formato exigido y la autoridad competente antes de presentar.',
  },
  {
    id: 'negociacion',
    titulo: 'Negociación previa formal',
    estado: 'confirmado',
    referencia: 'Ley 9/2025',
    detalle:
      'Debe acreditarse la negociación previa con la representación legal de las personas trabajadoras, con actas, participantes y acuerdos.',
  },
  {
    id: 'seguimiento',
    titulo: 'Informes de seguimiento',
    estado: 'confirmado',
    referencia: 'Ley 9/2025',
    detalle: 'Informes periódicos del nivel de implantación del plan, habitualmente con periodicidad bienal.',
  },
  {
    id: 'dpd',
    titulo: 'Tratamiento de datos del diagnóstico',
    estado: 'validar',
    referencia: 'RGPD y LOPDGDD',
    detalle:
      'El diagnóstico y la encuesta deben tratarse de forma anónima o agregada. Validar textos informativos, base jurídica y plazos de conservación con el Delegado de Protección de Datos.',
  },
];

export const PMST_DISCLAIMER =
  'Este módulo ayuda a elaborar y documentar el PMST. No realiza el registro ni el depósito oficial, y no garantiza por sí solo el cumplimiento legal. El contenido normativo es orientativo: debe contrastarse con las fuentes oficiales vigentes (BOE y BOCM) y con el órgano competente de la Comunidad de Madrid.';

export const PMST_SOURCES = [
  'Ley 9/2025 (normativa estatal de movilidad sostenible)',
  'Boletín Oficial de la Comunidad de Madrid (BOCM)',
  'Órgano competente en materia de movilidad de la Comunidad de Madrid',
];

export function sectionCompletion(plan) {
  if (!plan) return {};
  const i = plan.identificacion || {};
  const a = plan.alcance || {};
  const m = plan.metodologia || {};
  const d = plan.diagnostico || {};
  const c = plan.checklist || {};
  const medidas = plan.medidas || [];
  return {
    identificacion: Boolean(i.centro_nombre && i.persona_responsable && i.fecha_elaboracion),
    alcance: Boolean(a.plantilla_total && a.num_turnos),
    metodologia: Boolean((m.fuentes || []).length > 0 && m.periodo_referencia),
    diagnostico: Boolean((d.reparto_modal || []).length > 0 && d.conclusiones),
    medidas: medidas.length > 0 && REQUIRED_MEASURE_CATEGORIES.every((cat) => medidas.some((x) => x.categoria === cat)),
    negociacion: (plan.negociacion || []).length > 0,
    seguimiento: Boolean(plan.proximo_seguimiento) && (plan.indicadores || []).length > 0,
    checklist: Boolean(c.dpd_validado),
  };
}

export function surveyResultsFor(survey, preguntaId) {
  const opciones = (survey?.preguntas || []).find((p) => p.id === preguntaId)?.opciones || [];
  const counts = (survey?.resultados || {})[preguntaId] || [];
  const total = counts.reduce((s, n) => s + (Number(n) || 0), 0);
  return opciones.map((label, idx) => ({
    label,
    count: Number(counts[idx]) || 0,
    pct: total ? Math.round(((Number(counts[idx]) || 0) / total) * 100) : 0,
  }));
}