import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown, Users, Briefcase, Image, Globe } from "lucide-react";

// Puestos mostrados en Producción para versión "con nombres"
const PRODUCCION_PUESTOS_PERMITIDOS = [
  'JEFE DE TURNO', 'JEFE TURNO',
  'JEFE DE TURNO PRODUCCION', 'JEFE TURNO PRODUCCION',
  'AYUDANTE DE JEFE DE TURNO', 'AYUDANTE JEFE DE TURNO',
  'AYUDANTE JEFE DE TURNO PRODUCCION', 'AYUDANTE DE JEFE DE TURNO PRODUCCION',
  'TECNICO DE PROCESO', 'TECNICO PROCESO',
  'TECNICO DE PROCESOS', 'TECNICO PROCESOS',
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
  // Normalize + remove trailing S from PROCESO/PROCESOS for flexible matching
  const norm = (s) => normalize(s).replace(/LINEA|L[IÍ]NEA/g, 'LINEA').replace(/PROCESOS\b/, 'PROCESO');
  return norm(empPuesto) === norm(posName);
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

  let positionsHtml = '';
  if (deptPositions.length > 0) {
    if (mode === 'with-names') {
      deptPositions.forEach(pos => {
        const assigned = deptEmps.filter(e => empMatchesPuesto(e.puesto, pos.name));
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
      deptPositions.forEach(pos => {
        const count = deptEmps.filter(e => empMatchesPuesto(e.puesto, pos.name)).length;
        positionsHtml += `
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #f1f5f9;padding:2px 0;">
            <span style="font-size:8px;color:#374151;flex:1;margin-right:4px;">${pos.name}</span>
            <span style="font-size:8px;font-weight:700;color:#4f46e5;background:#eef2ff;padding:1px 5px;border-radius:8px;white-space:nowrap;">${count}</span>
          </div>`;
      });
    }
  }

  const managersHtml = (mode === 'with-names' && managerNames.length > 0)
    ? `<div style="font-size:7.5px;color:#4f46e5;background:#eef2ff;padding:2px 6px;border-radius:4px;margin-bottom:4px;text-align:center;">${managerNames.join(' · ')}</div>`
    : '';

  const children = getSortedChildren(departments, dept.id, siblingOrder);
  const hasChildren = children.length > 0;

  const childrenHtml = hasChildren
    ? `<div style="display:flex;justify-content:center;margin-top:0;">
        <div style="position:relative;display:flex;gap:8px;padding-top:20px;list-style:none;">
          <div style="position:absolute;top:0;left:50%;width:1px;height:20px;background:#cbd5e1;transform:translateX(-50%);"></div>
          ${children.length > 1 ? `<div style="position:absolute;top:20px;left:calc(${100 / children.length / 2}%);right:calc(${100 / children.length / 2}%);height:1px;background:#cbd5e1;"></div>` : ''}
          ${children.map((child, i) => {
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
          ${mode === 'with-names'
            ? `<div style="font-size:7.5px;color:#64748b;text-align:center;margin-bottom:${positionsHtml ? '3' : '0'}px;">${deptEmps.length} empleado${deptEmps.length !== 1 ? 's' : ''}</div>`
            : `<div style="font-size:7.5px;color:#64748b;text-align:center;margin-bottom:${positionsHtml ? '3' : '0'}px;">Total: ${deptEmps.length}</div>`}
          ${positionsHtml}
        </div>
      </div>
      ${hasChildren ? `
        <div style="width:1px;height:16px;background:#cbd5e1;"></div>
        ${childrenHtml}
      ` : ''}
    </div>`;
}

// ─── Build the inner tree HTML (shared between PDF and HTML export) ────────────

function buildTreeHtml({ mode, departments, positions, employees, siblingOrder }) {
  const rootDepts = getSortedChildren(departments, null, siblingOrder);
  return rootDepts.map(dept =>
    `<div style="flex-shrink:0;">${renderNodeCard(dept, departments, positions, employees, siblingOrder, mode, 0)}</div>`
  ).join('');
}

function getTitle(mode) {
  return mode === 'with-names' ? 'Organigrama con Nombres' : 'Organigrama por Puestos';
}

function getToday() {
  return new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── PDF (print) ───────────────────────────────────────────────────────────────

function buildPdfHtml({ mode, departments, positions, employees, siblingOrder }) {
  const title = getTitle(mode);
  const today = getToday();
  const treeHtml = buildTreeHtml({ mode, departments, positions, employees, siblingOrder });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: A3 landscape; margin: 6mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; }
    .page { background: #fff; padding: 8px 10px; }
    .header { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #3b82f6; padding-bottom:6px; margin-bottom:10px; }
    .header h1 { font-size:14px; font-weight:800; color:#1e3a8a; }
    .header .meta { font-size:8px; color:#64748b; text-align:right; line-height:1.5; }
    .tree-wrapper { width:100%; overflow:hidden; }
    .tree { display:flex; gap:10px; flex-wrap:nowrap; align-items:flex-start; justify-content:center; transform-origin:top left; }
    .legend { margin-top:8px; font-size:7px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:4px; }
  </style>
  <script>
    window.onload = function() {
      var tree = document.querySelector('.tree');
      var wrapper = document.querySelector('.tree-wrapper');
      if (!tree || !wrapper) return;
      var treeW = tree.scrollWidth;
      var wrapperW = wrapper.clientWidth;
      if (treeW > wrapperW) {
        var scale = wrapperW / treeW;
        tree.style.transform = 'scale(' + scale + ')';
        tree.style.transformOrigin = 'top left';
        wrapper.style.height = (tree.scrollHeight * scale) + 'px';
      }
    };
  </script>
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
    <div class="tree-wrapper"><div class="tree">${treeHtml}</div></div>
    <div class="legend">* Puestos ordenados por jerarquía · Los conteos muestran asignados/máximo permitido</div>
  </div>
</body>
</html>`;
}

// ─── HTML interactivo (descargable, con zoom y scroll) ─────────────────────────

function buildInteractiveHtml({ mode, departments, positions, employees, siblingOrder }) {
  const title = getTitle(mode);
  const today = getToday();
  const treeHtml = buildTreeHtml({ mode, departments, positions, employees, siblingOrder });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Central de Envasados</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; color: #1e293b; }
    .topbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: #1e3a8a; color: #fff;
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .topbar h1 { font-size: 15px; font-weight: 800; }
    .topbar .meta { font-size: 11px; opacity: 0.8; }
    .controls {
      display: flex; align-items: center; gap: 8px;
    }
    .controls button {
      background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4);
      color: #fff; padding: 4px 12px; border-radius: 6px; cursor: pointer;
      font-size: 13px; font-weight: 700; transition: background 0.15s;
    }
    .controls button:hover { background: rgba(255,255,255,0.35); }
    .zoom-label { font-size: 12px; min-width: 40px; text-align: center; }
    #canvas-area {
      margin-top: 56px;
      overflow: auto;
      width: 100vw;
      height: calc(100vh - 56px);
      cursor: grab;
    }
    #canvas-area:active { cursor: grabbing; }
    #tree-root {
      display: inline-flex;
      gap: 16px;
      flex-wrap: nowrap;
      align-items: flex-start;
      padding: 30px;
      transform-origin: top left;
      transition: transform 0.1s;
      background: #f1f5f9;
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div>
      <h1>📊 ${title}</h1>
      <div class="meta">Central de Envasados · ${today}${mode === 'with-names' ? ' · ⚠ Producción: solo roles clave' : ''}</div>
    </div>
    <div class="controls">
      <button onclick="zoom(-0.1)">−</button>
      <span class="zoom-label" id="zlabel">100%</span>
      <button onclick="zoom(0.1)">+</button>
      <button onclick="resetZoom()" style="font-size:11px;padding:4px 8px;">↺ Reset</button>
    </div>
  </div>
  <div id="canvas-area">
    <div id="tree-root">${treeHtml}</div>
  </div>
  <script>
    var scale = 1;
    var isDragging = false;
    var startX, startY, scrollLeft, scrollTop;
    var area = document.getElementById('canvas-area');
    var root = document.getElementById('tree-root');

    function applyScale() {
      root.style.transform = 'scale(' + scale + ')';
      root.style.width = (root.scrollWidth / scale) + 'px';
      root.style.height = (root.scrollHeight / scale) + 'px';
      document.getElementById('zlabel').textContent = Math.round(scale * 100) + '%';
    }

    function zoom(delta) {
      scale = Math.min(3, Math.max(0.2, scale + delta));
      applyScale();
    }

    function resetZoom() {
      scale = 1;
      applyScale();
      area.scrollTo(0, 0);
    }

    // Mouse wheel zoom
    area.addEventListener('wheel', function(e) {
      e.preventDefault();
      zoom(e.deltaY < 0 ? 0.1 : -0.1);
    }, { passive: false });

    // Drag to pan
    area.addEventListener('mousedown', function(e) {
      isDragging = true;
      startX = e.pageX - area.offsetLeft;
      startY = e.pageY - area.offsetTop;
      scrollLeft = area.scrollLeft;
      scrollTop = area.scrollTop;
    });
    area.addEventListener('mouseleave', function() { isDragging = false; });
    area.addEventListener('mouseup', function() { isDragging = false; });
    area.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      e.preventDefault();
      var x = e.pageX - area.offsetLeft;
      var y = e.pageY - area.offsetTop;
      area.scrollLeft = scrollLeft - (x - startX);
      area.scrollTop = scrollTop - (y - startY);
    });

    // Auto-fit on load
    window.onload = function() {
      var treeW = root.scrollWidth;
      var areaW = area.clientWidth;
      if (treeW > areaW) {
        scale = Math.max(0.2, areaW / treeW * 0.95);
        applyScale();
      }
    };
  </script>
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

  const openInteractive = (mode) => {
    const html = buildInteractiveHtml({ mode, departments, positions, employees, siblingOrder });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const downloadHtml = (mode) => {
    const html = buildInteractiveHtml({ mode, departments, positions, employees, siblingOrder });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `organigrama-${mode}-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
          <FileDown className="w-3.5 h-3.5" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">

        <DropdownMenuLabel className="text-xs text-slate-500 font-semibold">🖨 PDF (imprimir)</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => openPdf('with-names')} className="gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <span>Con nombres de empleados</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openPdf('positions-only')} className="gap-2">
          <Briefcase className="w-4 h-4 text-indigo-600" />
          <span>Solo puestos y conteos</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-slate-500 font-semibold">🌐 HTML interactivo (zoom + scroll)</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => openInteractive('with-names')} className="gap-2">
          <Globe className="w-4 h-4 text-blue-600" />
          <span>Con nombres — abrir en navegador</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openInteractive('positions-only')} className="gap-2">
          <Globe className="w-4 h-4 text-indigo-600" />
          <span>Solo puestos — abrir en navegador</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-slate-500 font-semibold">💾 Descargar archivo HTML</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => downloadHtml('with-names')} className="gap-2">
          <Image className="w-4 h-4 text-green-600" />
          <span>Con nombres — descargar .html</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadHtml('positions-only')} className="gap-2">
          <Image className="w-4 h-4 text-emerald-600" />
          <span>Solo puestos — descargar .html</span>
        </DropdownMenuItem>

      </DropdownMenuContent>
    </DropdownMenu>
  );
}