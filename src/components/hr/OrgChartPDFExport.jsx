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

// Puestos mostrados en Producción para versión "con nombres"
const PRODUCCION_PUESTOS_PERMITIDOS = [
  'JEFE DE TURNO',
  'JEFE TURNO',
  'AYUDANTE DE JEFE DE TURNO',
  'AYUDANTE JEFE DE TURNO',
  'TÉCNICO DE PROCESO',
  'TECNICO DE PROCESO',
  'TÉCNICO PROCESO',
  'TECNICO PROCESO',
];

const LEVEL_ORDER = {
  'Executive': 0, 'Director': 1, 'Manager': 2, 'Lead': 3, 'Senior': 4, 'Mid': 5, 'Junior': 6,
};

function getLevelOrder(pos) {
  if (pos.orden !== undefined && pos.orden !== null) return pos.orden;
  return (LEVEL_ORDER[pos.level] ?? 99) * 100;
}

function getSortedPositions(positions) {
  return [...positions].sort((a, b) => getLevelOrder(a) - getLevelOrder(b));
}

function getSortedChildren(departments, parentId, siblingOrder) {
  const children = departments.filter(d => (d.parent_id || null) === (parentId || null));
  return [...children].sort((a, b) => {
    const ao = siblingOrder?.[a.id] ?? a.orden ?? 0;
    const bo = siblingOrder?.[b.id] ?? b.orden ?? 0;
    if (ao !== bo) return ao - bo;
    return (a.name || '').localeCompare(b.name || '');
  });
}

function normalize(s) {
  return (s || '').toString().trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isProduccionDept(deptName) {
  const n = normalize(deptName);
  return n.startsWith('PRODUCCION') || n === 'PRODUCCION T1' || n === 'PRODUCCION T2' ||
    n === 'PRODUCCION T1.1' || n === 'PRODUCCION T2.2';
}

function empMatchesPuesto(empPuesto, posName) {
  const ep = normalize(empPuesto).replace(/LINEA|LÍNEA/g, 'LINEA');
  const pp = normalize(posName).replace(/LINEA|LÍNEA/g, 'LINEA');
  return ep === pp;
}

function getEmployeesForDept(dept, employees) {
  const n = normalize(dept.name);
  if (n === 'PRODUCCION T1' || n === 'PRODUCCION T1.1')
    return employees.filter(e => normalize(e.departamento) === 'PRODUCCION' && e.team_key === 'team_1');
  if (n === 'PRODUCCION T2' || n === 'PRODUCCION T2.2')
    return employees.filter(e => normalize(e.departamento) === 'PRODUCCION' && e.team_key === 'team_2');
  return employees.filter(e => normalize(e.departamento) === n);
}

function getManagerNames(dept, employees) {
  const ids = [dept.manager_id, dept.manager_id_2, dept.manager_id_3, dept.manager_id_4].filter(Boolean);
  return ids.map(id => employees.find(e => e.id === id)?.nombre).filter(Boolean);
}

// ─── Node card HTML ────────────────────────────────────────────────────────────

function renderNodeCard(dept, departments, positions, employees, siblingOrder, mode, depth) {
  const color = dept.color || '#3b82f6';
  const deptPositions = getSortedPositions(positions.filter(p => p.department_id === dept.id));
  const deptEmps = getEmployeesForDept(dept, employees);
  const managerNames = getManagerNames(dept, employees);
  const isProd = isProduccionDept(dept.name);

  // Build positions HTML
  let positionsHtml = '';
  if (deptPositions.length > 0) {
    if (mode === 'with-names') {
      deptPositions.forEach(pos => {
        const assigned = deptEmps.filter(e => empMatchesPuesto(e.puesto, pos.name));
        // En producción, solo mostrar puestos permitidos
        if (isProd) {
          const posNorm = normalize(pos.name);
          const allowed = PRODUCCION_PUESTOS_PERMITIDOS.some(p => posNorm.includes(normalize(p)));
          if (!allowed) return;
        }
        positionsHtml += `<div style="border-top:1px solid #f1f5f9; padding:3px 0 2px;">`;
        positionsHtml += `<div style="font-size:8px;font-weight:700;color:#374151;letter-spacing:0.3px;">${pos.name}</div>`;
        if (assigned.length > 0) {
          assigned.forEach(emp => {
            positionsHtml += `<div style="font-size:7.5px;color:#6b7280;padding-left:6px;line-height:1.4;">• ${emp.nombre}</div>`;
          });
        } else {
          positionsHtml += `<div style="font-size:7.5px;color:#9ca3af;padding-left:6px;font-style:italic;">Sin asignar</div>`;
        }
        positionsHtml += `</div>`;
      });
    } else {
      // positions-only
      deptPositions.forEach(pos => {
        const count = deptEmps.filter(e => empMatchesPuesto(e.puesto, pos.name)).length;
        const max = pos.max_headcount || 1;
        const full = count >= max;
        positionsHtml += `
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #f1f5f9;padding:2px 0;">
            <span style="font-size:8px;color:#374151;flex:1;margin-right:4px;">${pos.name}</span>
            <span style="font-size:8px;font-weight:700;color:${full ? '#059669' : '#4f46e5'};background:${full ? '#d1fae5' : '#eef2ff'};padding:1px 5px;border-radius:8px;white-space:nowrap;">${count}/${max}</span>
          </div>`;
      });
    }
  }

  const managersHtml = managerNames.length > 0
    ? `<div style="font-size:7.5px;color:#4f46e5;background:#eef2ff;padding:2px 6px;border-radius:4px;margin-bottom:4px;text-align:center;">${managerNames.join(' · ')}</div>`
    : '';

  const children = getSortedChildren(departments, dept.id, siblingOrder);
  const hasChildren = children.length > 0;

  const childrenHtml = hasChildren
    ? `<div style="display:flex;justify-content:center;margin-top:0;">
        <div style="position:relative;display:flex;gap:8px;padding-top:20px;padding-left:0;list-style:none;">
          <div style="position:absolute;top:0;left:50%;width:1px;height:20px;background:#cbd5e1;transform:translateX(-50%);"></div>
          ${children.length > 1 ? `<div style="position:absolute;top:20px;left:calc(${100 / children.length / 2}%);right:calc(${100 / children.length / 2}%);height:1px;background:#cbd5e1;"></div>` : ''}
          ${children.map((child, i) => {
            const isFirst = i === 0;
            const isLast = i === children.length - 1;
            const isOnly = children.length === 1;
            return `<div style="display:flex;flex-direction:column;align-items:center;position:relative;">
              ${!isOnly ? `<div style="position:absolute;top:0;left:50%;width:1px;height:20px;background:#cbd5e1;transform:translateX(-50%);"></div>` : ''}
              ${renderNodeCard(child, departments, positions, employees, siblingOrder, mode, depth + 1)}
            </div>`;
          }).join('')}
        </div>
       </div>`
    : '';

  const fs = depth === 0 ? '11' : depth === 1 ? '10' : '9';
  const w = depth === 0 ? '180' : depth === 1 ? '160' : '145';

  return `
    <div style="display:inline-flex;flex-direction:column;align-items:center;">
      <div style="width:${w}px;border:1.5px solid ${color};border-radius:6px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.1);overflow:hidden;">
        <div style="background:${color};padding:5px 8px;text-align:center;">
          <div style="font-size:${fs}px;font-weight:800;color:#fff;letter-spacing:0.5px;line-height:1.3;">${dept.name}</div>
          ${dept.code ? `<div style="font-size:7px;color:rgba(255,255,255,0.8);">${dept.code}</div>` : ''}
        </div>
        <div style="padding:4px 6px;">
          ${managersHtml}
          <div style="font-size:7.5px;color:#64748b;text-align:center;margin-bottom:${positionsHtml ? '3' : '0'}px;">${deptEmps.length} empleado${deptEmps.length !== 1 ? 's' : ''}</div>
          ${positionsHtml}
        </div>
      </div>
      ${hasChildren ? `
        <div style="width:1px;height:16px;background:#cbd5e1;"></div>
        ${childrenHtml}
      ` : ''}
    </div>`;
}

// ─── Full HTML document ────────────────────────────────────────────────────────

function buildPdfHtml({ mode, departments, positions, employees, siblingOrder }) {
  const rootDepts = getSortedChildren(departments, null, siblingOrder);
  const title = mode === 'with-names' ? 'Organigrama con Nombres' : 'Organigrama por Puestos';
  const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

  const treeHtml = rootDepts.map(dept =>
    `<div style="flex-shrink:0;">${renderNodeCard(dept, departments, positions, employees, siblingOrder, mode, 0)}</div>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: A2 landscape; margin: 10mm 8mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #1e293b; }
    .page { background: #fff; min-height: 100%; padding: 12px 14px; }
    .header { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #3b82f6; padding-bottom:8px; margin-bottom:16px; }
    .header h1 { font-size:17px; font-weight:800; color:#1e3a8a; }
    .header .meta { font-size:9px; color:#64748b; text-align:right; line-height:1.6; }
    .tree { display:flex; gap:16px; flex-wrap:nowrap; align-items:flex-start; justify-content:center; overflow-x:auto; padding-bottom:8px; }
    .legend { margin-top:12px; font-size:8px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:5px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>📊 ${title}</h1>
      <div class="meta">
        <div><strong>Central de Envasados</strong></div>
        <div>Generado: ${today}</div>
        <div>${mode === 'with-names' ? 'Incluye nombres de empleados' : 'Solo puestos y conteos'}</div>
        ${mode === 'with-names' ? '<div style="color:#f59e0b;">⚠ Producción: solo Jefes Turno, Ayudantes y Técnicos de Proceso</div>' : ''}
      </div>
    </div>
    <div class="tree">${treeHtml}</div>
    <div class="legend">* Puestos ordenados por jerarquía · Los conteos muestran asignados/máximo permitido · Los responsables aparecen en azul bajo cada departamento</div>
  </div>
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
    setTimeout(() => win.print(), 800);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
          <FileDown className="w-3.5 h-3.5" />
          Exportar PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
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