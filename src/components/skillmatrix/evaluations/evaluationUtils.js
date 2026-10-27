export const SCALE_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const normalizeName = (value) =>
  String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");

export const isProductionEmployee = (employee) =>
  /PRODUC|FABRICAC/.test(normalizeName(employee?.departamento));

export const isTemporalContract = (employee) =>
  Boolean(employee?.fecha_fin_contrato) ||
  /TEMPORAL|OBRA|EVENTUAL|INTERIN|ETT/.test(normalizeName(employee?.tipo_contrato));

export const contractInfo = (employee) => {
  const tipo = (employee?.tipo_contrato || "").trim();
  if (!tipo) return { label: "Sin datos", className: "bg-slate-100 text-slate-600", temporal: false };
  if (isTemporalContract(employee)) {
    return { label: tipo, className: "bg-amber-100 text-amber-800", temporal: true };
  }
  return { label: tipo, className: "bg-slate-100 text-slate-600", temporal: false };
};

// Puntuación técnica: global o media de las destrezas valoradas
export const technicalScore = (evaluation) => {
  if (!evaluation) return null;
  if (evaluation.modalidad_tecnica === "Por destrezas") {
    const scores = (evaluation.destrezas || [])
      .map((d) => d.puntuacion)
      .filter((v) => typeof v === "number");
    if (!scores.length) return null;
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  }
  return typeof evaluation.tecnica_puntuacion === "number" ? evaluation.tecnica_puntuacion : null;
};

export const evaluationAverage = (evaluation) => {
  const scores = [
    evaluation?.actitud_puntuacion,
    evaluation?.desempeno_puntuacion,
    technicalScore(evaluation),
  ].filter((v) => typeof v === "number");
  if (!scores.length) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
};

export const bestEvaluation = (evaluations = []) => {
  const sorted = [...evaluations].sort((a, b) =>
    String(b.fecha_evaluacion || "").localeCompare(String(a.fecha_evaluacion || ""))
  );
  return sorted[0] || null;
};

export const fmtScore = (value) => {
  if (typeof value !== "number") return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

export const scoreTone = (value) => {
  if (typeof value !== "number") return "text-slate-400";
  if (value >= 8) return "text-emerald-600";
  if (value >= 6) return "text-amber-600";
  return "text-red-600";
};

export const formatDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : "—";
};

export const emptyEvaluationForm = () => ({
  fecha_evaluacion: new Date().toISOString().slice(0, 10),
  modalidad_tecnica: "Genérica",
  actitud_puntuacion: null,
  actitud_observaciones: "",
  desempeno_puntuacion: null,
  desempeno_observaciones: "",
  tecnica_puntuacion: null,
  tecnica_observaciones: "",
  destrezas: [],
  observaciones: "",
  estado: "Registrada",
});