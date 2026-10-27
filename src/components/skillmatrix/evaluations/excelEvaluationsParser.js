import * as XLSX from "xlsx";

const toText = (value) => (value === null || value === undefined ? "" : String(value).trim());

const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = toText(value).replace(",", ".");
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};

const toIso = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

/**
 * Lee el libro de evaluaciones de producción: una fila de fechas, una fila de
 * cabeceras y, bajo cada fecha, un bloque de columnas (SALA, HAB, ACTD., 2ª).
 * Devuelve los datos tal cual, sin interpretar los valores literales.
 */
export function parseEvaluationsWorkbook(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

  const headerIndex = matrix.findIndex((row) => (row || []).some((cell) => /NOMBRE/i.test(toText(cell))));
  if (headerIndex === -1) {
    return { fechas: [], empleados: [] };
  }

  const header = matrix[headerIndex] || [];
  const dateRow = matrix[headerIndex - 1] || [];
  const nameCol = header.findIndex((cell) => /NOMBRE/i.test(toText(cell)));
  const findCol = (regex) => header.findIndex((cell) => regex.test(toText(cell)));

  const colIncorporacion = findCol(/INCORPORA/i);
  const colTurno = findCol(/TURNO/i);
  const colContrato = findCol(/CONTRATO/i);
  const colFinPeriodo = findCol(/PERIODO PRUEBA/i);

  const fechas = [];
  dateRow.forEach((cell, index) => {
    const iso = toIso(cell);
    if (!iso || index <= nameCol) return;
    fechas.push({
      index,
      iso,
      etiquetas: [0, 1, 2, 3].map((offset) => toText(header[index + offset])),
    });
  });

  const empleados = [];
  for (let rowIndex = headerIndex + 1; rowIndex < matrix.length; rowIndex++) {
    const row = matrix[rowIndex] || [];
    const nombre = toText(row[nameCol]);
    if (!nombre) continue;

    const evaluaciones = [];
    fechas.forEach(({ index, iso, etiquetas }) => {
      const sala = toText(row[index]);
      const hab = toNumber(row[index + 1]);
      const actd = toNumber(row[index + 2]);
      const segunda = toText(row[index + 3]);
      if (!sala && hab === null && actd === null && !segunda) return;
      evaluaciones.push({ fecha: iso, sala, hab, actd, segunda, etiquetas });
    });

    if (!evaluaciones.length) continue;

    empleados.push({
      fila: rowIndex + 1,
      nombre,
      incorporacion: colIncorporacion >= 0 ? toIso(row[colIncorporacion]) : "",
      turno: colTurno >= 0 ? toText(row[colTurno]) : "",
      contrato: colContrato >= 0 ? toText(row[colContrato]) : "",
      fin_periodo_prueba: colFinPeriodo >= 0 ? toIso(row[colFinPeriodo]) : "",
      evaluaciones,
    });
  }

  return { fechas, empleados };
}