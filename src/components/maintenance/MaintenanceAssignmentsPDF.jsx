import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const SHIFTS = [
  { key: "turno1", label: "Turno 1" },
  { key: "turno2", label: "Turno 2" },
];

const ROLES = [
  { key: "jefe_turno", label: "Jefe de Turno" },
  { key: "tecnico_principal", label: "Técnico Principal" },
  { key: "apoyo_1", label: "Técnico de Apoyo 1" },
  { key: "apoyo_2", label: "Técnico de Apoyo 2" },
];

export function exportMaintenanceAssignmentsPDF({ config, employees }) {
  const areas = config.areas || [];
  const assignments = config.assignments || {};

  const getEmpName = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.nombre : "—";
  };

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const roleColors = {
    jefe_turno: "#ea580c",
    tecnico_principal: "#2563eb",
    apoyo_1: "#16a34a",
    apoyo_2: "#7c3aed",
  };

  // Construir HTML del PDF
  let html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8"/>
      <title>Cuadrante de Asignaciones - Mantenimiento</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }
        .header { background: #1e293b; color: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { font-size: 18px; font-weight: bold; }
        .header .subtitle { font-size: 11px; opacity: 0.7; margin-top: 2px; }
        .header .date { font-size: 11px; opacity: 0.8; text-align: right; }
        .shift-section { margin: 16px 20px; }
        .shift-title { 
          background: #f97316; color: white; padding: 8px 14px; 
          border-radius: 6px; font-size: 13px; font-weight: bold;
          display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
        }
        .areas-grid { 
          display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
          gap: 10px;
        }
        .area-card {
          border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;
          break-inside: avoid;
        }
        .area-header {
          background: #fff7ed; border-bottom: 1px solid #fed7aa;
          padding: 7px 10px; font-weight: bold; font-size: 11px; color: #9a3412;
        }
        .area-rooms {
          font-size: 9px; color: #94a3b8; font-weight: normal; margin-top: 2px;
        }
        .area-body { padding: 8px 10px; }
        .role-row { margin-bottom: 6px; }
        .role-label { 
          font-size: 8px; text-transform: uppercase; font-weight: bold; 
          letter-spacing: 0.05em; margin-bottom: 2px;
        }
        .role-value {
          font-size: 10px; padding: 3px 7px; border-radius: 4px;
          background: #f8fafc; border: 1px solid #e2e8f0;
          min-height: 20px;
        }
        .unassigned { color: #94a3b8; font-style: italic; }
        .footer {
          margin: 20px 20px 10px; border-top: 1px solid #e2e8f0;
          padding-top: 10px; font-size: 9px; color: #94a3b8;
          display: flex; justify-content: space-between;
        }
        @media print {
          .shift-section { page-break-inside: avoid; }
          .area-card { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="h1" style="font-size:18px;font-weight:bold;">🔧 Cuadrante de Mantenimiento</div>
          <div class="subtitle">Asignación de personal por áreas y turnos</div>
        </div>
        <div class="date">
          <div style="font-size:13px;font-weight:bold;">${today}</div>
          <div style="margin-top:4px;opacity:0.7;">Generado automáticamente</div>
        </div>
      </div>
  `;

  for (const shift of SHIFTS) {
    html += `
      <div class="shift-section">
        <div class="shift-title">⚙️ ${shift.label}</div>
        <div class="areas-grid">
    `;

    for (const area of areas) {
      const roomsText = area.rooms?.map(r => r.name).join(", ") || "";
      html += `
        <div class="area-card">
          <div class="area-header">
            🔧 ${area.name}
            ${roomsText ? `<div class="area-rooms">${roomsText}</div>` : ""}
          </div>
          <div class="area-body">
      `;

      for (const role of ROLES) {
        const empId = assignments?.[shift.key]?.[area.id]?.[role.key] || "";
        const empName = empId ? getEmpName(empId) : null;
        html += `
          <div class="role-row">
            <div class="role-label" style="color:${roleColors[role.key]}">${role.label}</div>
            <div class="role-value ${empName ? "" : "unassigned"}">
              ${empName || "Sin asignar"}
            </div>
          </div>
        `;
      }

      html += `</div></div>`;
    }

    html += `</div></div>`;
  }

  html += `
      <div class="footer">
        <span>Cuadrante de Asignaciones de Mantenimiento</span>
        <span>CDE PlanApp — ${today}</span>
      </div>
    </body></html>
  `;

  // Abrir en nueva ventana e imprimir
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 500);
}

export function MaintenanceAssignmentsExportButton({ config, employees }) {
  return (
    <Button
      variant="outline"
      className="border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700"
      onClick={() => exportMaintenanceAssignmentsPDF({ config, employees })}
    >
      <FileDown className="w-4 h-4 mr-2" />
      Exportar PDF
    </Button>
  );
}