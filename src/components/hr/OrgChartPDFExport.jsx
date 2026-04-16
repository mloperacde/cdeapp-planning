import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown, Users, Briefcase } from "lucide-react";

// Hierarchy level order for positions
const LEVEL_ORDER = {
  'Executive': 0,
  'Director': 1,
  'Manager': 2,
  'Lead': 3,
  'Senior': 4,
  'Mid': 5,
  'Junior': 6,
};

function getLevelOrder(pos) {
  if (pos.orden !== undefined && pos.orden !== null) return pos.orden;
  return (LEVEL_ORDER[pos.level] ?? 99) * 100;
}

function getSortedPositions(positions) {
  return [...positions].sort((a, b) => getLevelOrder(a) - getLevelOrder(b));
}

function getSortedDeptChildren(departments, parentId, siblingOrder) {
  const children = departments.filter(d => (d.parent_id || null) === (parentId || null));
  return [...children].sort((a, b) => {
    const ao = siblingOrder?.[a.id] ?? a.orden ?? 0;
    const bo = siblingOrder?.[b.id] ?? b.orden ?? 0;
    if (ao !== bo) return ao - bo;
    return (a.name || '').localeCompare(b.name || '');
  });
}

// Build flat ordered list of departments (DFS)
function buildDeptTree(departments, siblingOrder, parentId = null, depth = 0) {
  const children = getSortedDeptChildren(departments, parentId, siblingOrder);
  const result = [];
  children.forEach(dept => {
    result.push({ dept, depth });
    result.push(...buildDeptTree(departments, siblingOrder, dept.id, depth + 1));
  });
  return result;
}

// ─── HTML generation ──────────────────────────────────────────────────────────

function buildPdfHtml({ mode, departments, positions, employees, siblingOrder }) {
  const normalizeDeptName = (name) => (name || '').toString().trim().toUpperCase();

  const employeesByDept = (dept) => {
    const n = normalizeDeptName(dept.name);
    if (n === "PRODUCCIÓN T1" || n === "PRODUCCIÓN T1.1")
      return employees.filter(e => normalizeDeptName(e.departamento) === "PRODUCCIÓN" && e.team_key === "team_1");
    if (n === "PRODUCCIÓN T2" || n === "PRODUCCIÓN T2.2")
      return employees.filter(e => normalizeDeptName(e.departamento) === "PRODUCCIÓN" && e.team_key === "team_2");
    return employees.filter(e => normalizeDeptName(e.departamento) === n);
  };

  const flatTree = buildDeptTree(departments, siblingOrder);

  // We group top-level depts each as a column
  const rootDepts = getSortedDeptChildren(departments, null, siblingOrder);

  const renderDeptBlock = (dept, depth) => {
    const deptPositions = getSortedPositions(positions.filter(p => p.department_id === dept.id));
    const deptEmps = employeesByDept(dept);
    const borderColor = dept.color || '#3b82f6';

    const headerStyle = `background:${borderColor}22; border-left:4px solid ${borderColor}; padding:6px 10px; margin-bottom:4px; border-radius:3px;`;
    const nameStyle = `font-weight:700; font-size:${depth === 0 ? '13' : '11'}px; color:#1e293b; margin:0;`;
    const countStyle = `font-size:10px; color:#64748b; margin:0;`;

    let positionsHtml = '';
    if (deptPositions.length > 0) {
      if (mode === 'with-names') {
        positionsHtml = `<div style="margin-top:4px; padding:4px 8px; background:#f8fafc; border-radius:3px; border:1px solid #e2e8f0;">`;
        deptPositions.forEach(pos => {
          const assigned = deptEmps.filter(e => {
            const ep = (e.puesto || '').toString().trim().toUpperCase().replace(/LÍNEA|LINEA/g, 'LINEA');
            const pp = (pos.name || '').toString().trim().toUpperCase().replace(/LÍNEA|LINEA/g, 'LINEA');
            return ep === pp;
          });
          positionsHtml += `<div style="border-bottom:1px solid #f1f5f9; padding:3px 0;">`;
          positionsHtml += `<div style="font-size:9px; font-weight:600; color:#374151;">${pos.name}</div>`;
          if (assigned.length > 0) {
            assigned.forEach(emp => {
              positionsHtml += `<div style="font-size:8px; color:#6b7280; padding-left:8px;">• ${emp.nombre}</div>`;
            });
          } else {
            positionsHtml += `<div style="font-size:8px; color:#9ca3af; padding-left:8px; font-style:italic;">Sin asignar</div>`;
          }
          positionsHtml += `</div>`;
        });
        positionsHtml += `</div>`;
      } else {
        // positions-only mode
        positionsHtml = `<div style="margin-top:4px; padding:4px 8px; background:#f8fafc; border-radius:3px; border:1px solid #e2e8f0;">`;
        deptPositions.forEach(pos => {
          const assigned = deptEmps.filter(e => {
            const ep = (e.puesto || '').toString().trim().toUpperCase().replace(/LÍNEA|LINEA/g, 'LINEA');
            const pp = (pos.name || '').toString().trim().toUpperCase().replace(/LÍNEA|LINEA/g, 'LINEA');
            return ep === pp;
          }).length;
          positionsHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:2px 0; border-bottom:1px solid #f1f5f9;">
              <span style="font-size:9px; color:#374151;">${pos.name}</span>
              <span style="font-size:9px; font-weight:700; color:#4f46e5; background:#eef2ff; padding:1px 5px; border-radius:9px;">${assigned}/${pos.max_headcount || 1}</span>
            </div>`;
        });
        positionsHtml += `</div>`;
      }
    }

    const childDepts = getSortedDeptChildren(departments, dept.id, siblingOrder);
    let childrenHtml = '';
    if (childDepts.length > 0) {
      childrenHtml = `<div style="margin-left:${depth === 0 ? 0 : 12}px; margin-top:6px; display:flex; flex-direction:column; gap:6px;">`;
      childDepts.forEach(child => {
        childrenHtml += renderDeptBlock(child, depth + 1);
      });
      childrenHtml += `</div>`;
    }

    return `
      <div style="margin-bottom:6px;">
        <div style="${headerStyle}">
          <p style="${nameStyle}">${dept.name}</p>
          <p style="${countStyle}">${deptEmps.length} empleados${dept.code ? ` · ${dept.code}` : ''}</p>
        </div>
        ${positionsHtml}
        ${childrenHtml}
      </div>`;
  };

  const columnsHtml = rootDepts.map(dept => `
    <div style="flex:1; min-width:200px; max-width:320px; break-inside:avoid;">
      ${renderDeptBlock(dept, 0)}
    </div>`).join('');

  const title = mode === 'with-names'
    ? 'Organigrama con Nombres'
    : 'Organigrama por Puestos';

  const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: A3 landscape; margin: 15mm 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; }
    .header { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #3b82f6; padding-bottom:10px; margin-bottom:16px; }
    .header h1 { font-size:18px; font-weight:800; color:#1e3a8a; }
    .header .meta { font-size:10px; color:#64748b; text-align:right; }
    .columns { display:flex; gap:14px; flex-wrap:wrap; align-items:flex-start; }
    .legend { margin-top:12px; font-size:9px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:6px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 ${title}</h1>
    <div class="meta">
      <div>Central de Envasados</div>
      <div>Generado: ${today}</div>
      <div>${mode === 'with-names' ? 'Incluye nombres de empleados' : 'Solo puestos y conteos'}</div>
    </div>
  </div>
  <div class="columns">${columnsHtml}</div>
  <div class="legend">* Los puestos están ordenados por jerarquía. Los conteos muestran asignados/máximo permitido.</div>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrgChartPDFExport({ departments, positions, employees, siblingOrder }) {

  const openPdf = (mode) => {
    const html = buildPdfHtml({ mode, departments, positions, employees, siblingOrder });
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
          <FileDown className="w-3.5 h-3.5" />
          Exportar PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => openPdf('with-names')} className="gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          Con nombres de empleados
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => openPdf('positions-only')} className="gap-2">
          <Briefcase className="w-4 h-4 text-indigo-600" />
          Solo puestos y conteos
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}