import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, Plus, Edit, Trash2,
  ZoomIn, ZoomOut, Maximize2, Minimize2, ChevronDown, ChevronUp,
  ArrowLeft, ArrowRight, RotateCcw
} from "lucide-react";
import OrgChartPDFExport from "./OrgChartPDFExport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function OrganizationalChart({ 
  data, 
  onEdit, 
  onAddChild, 
  onDelete, 
  onMove,
  onNodeDrop
}) {
  const [zoom, setZoom] = React.useState(1);
  const [isCompact, setIsCompact] = React.useState(false);
  const [collapsedNodes, setCollapsedNodes] = React.useState(new Set());
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = React.useState(false);
  const panStart = React.useRef(null);
  const containerRef = React.useRef(null);
  const contentRef = React.useRef(null);

  // Use props data if available, otherwise fetch
  const { data: fetchedDepts = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
    enabled: !data?.departments
  });

  const { data: fetchedPos = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list(),
    enabled: !data?.positions
  });

  const { data: fetchedEmps = [] } = useQuery({
    queryKey: ['employees_org_chart'],
    queryFn: async () => {
      const all = [];
      let skip = 0;
      const batchSize = 100;
      while (true) {
        const batch = await base44.entities.EmployeeMasterDatabase.list('nombre', batchSize, skip);
        all.push(...batch);
        if (batch.length < batchSize) break;
        skip += batchSize;
      }
      return all;
    },
    enabled: !data?.employees
  });

  const departments = data?.departments || fetchedDepts;
  const positions = data?.positions || fetchedPos;
  const employees = data?.employees || fetchedEmps;

  // Reorder siblings state (node-level sorting in chart view)
  const [siblingOrder, setSiblingOrder] = React.useState({});
  const [isSaving, setIsSaving] = React.useState(false);
  const queryClient = useQueryClient();

  // Initialize sibling order from dept.orden
  React.useEffect(() => {
    const order = {};
    departments.forEach(dept => {
      const key = dept.parent_id || 'root';
      if (!order[key]) order[key] = {};
      order[key][dept.id] = dept.orden ?? 0;
    });
    setSiblingOrder(order);
  }, [departments]);

  const moveSiblingInChart = async (parentKey, deptId, delta) => {
    // Compute new order
    const group = { ...(siblingOrder[parentKey] || {}) };
    const sorted = Object.entries(group).sort((a, b) => a[1] - b[1]);
    const idx = sorted.findIndex(([id]) => id === deptId);
    if (idx < 0) return;
    const newIdx = Math.max(0, Math.min(sorted.length - 1, idx + delta));
    if (newIdx === idx) return;
    const newSorted = [...sorted];
    const [item] = newSorted.splice(idx, 1);
    newSorted.splice(newIdx, 0, item);
    const newGroup = {};
    newSorted.forEach(([id], i) => { newGroup[id] = i; });

    // Update local state immediately for responsive UI
    setSiblingOrder(prev => ({ ...prev, [parentKey]: newGroup }));

    // Persist to database
    setIsSaving(true);
    try {
      await Promise.all(
        newSorted.map(([id], i) => base44.entities.Department.update(id, { orden: i }))
      );
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success("Orden guardado");
    } catch (e) {
      toast.error("Error al guardar el orden");
    } finally {
      setIsSaving(false);
    }
  };

  const getSortedChildren = (parentId) => {
    const parentKey = parentId || 'root';
    const children = departments.filter(d => (d.parent_id || null) === (parentId || null));
    const orderMap = siblingOrder[parentKey] || {};
    return [...children].sort((a, b) => {
      const ao = orderMap[a.id] ?? a.orden ?? 0;
      const bo = orderMap[b.id] ?? b.orden ?? 0;
      if (ao !== bo) return ao - bo;
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  const toggleCollapse = (deptId) => {
    const newSet = new Set(collapsedNodes);
    if (newSet.has(deptId)) newSet.delete(deptId);
    else newSet.add(deptId);
    setCollapsedNodes(newSet);
  };

  const expandAll = () => setCollapsedNodes(new Set());
  const collapseAll = () => {
    const allIds = departments
      .filter(d => departments.some(child => child.parent_id === d.id))
      .map(d => d.id);
    setCollapsedNodes(new Set(allIds));
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    fitZoomToContent();
  };

  const fitZoomToContent = () => {
    if (!containerRef.current || !contentRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    // Reset transform to measure real size
    contentRef.current.style.transform = 'scale(1) translate(0,0)';
    const sw = contentRef.current.scrollWidth;
    const sh = contentRef.current.scrollHeight;
    if (!cw || !sw) return;
    const padding = 80;
    const fitX = (cw - padding) / sw;
    const fitY = (ch - padding) / sh;
    const fit = Math.max(0.2, Math.min(1, Math.min(fitX, fitY)));
    setZoom(fit);
    setPan({ x: 0, y: 0 });
  };

  // Auto-fit on load / data change
  React.useLayoutEffect(() => {
    const timer = setTimeout(fitZoomToContent, 100);
    return () => clearTimeout(timer);
  }, [departments.length, isCompact]);

  // Pan handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button') || e.target.closest('[role="menuitem"]')) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isPanning || !panStart.current) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    panStart.current = null;
  };

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom(z => Math.max(0.2, Math.min(2, z + delta)));
  };

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Employee count calculation - normalize removes accents and uppercases
  const normalizeStr = (name) => (name || '').toString().trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizeDeptName = normalizeStr;

  const employeeCountByDept = React.useMemo(() => {
    const map = new Map();
    departments.forEach(dept => {
      const n = normalizeStr(dept.name);
      let count;
      if (n === "PRODUCCION T1" || n === "PRODUCCION T1.1") {
        count = employees.filter(e => normalizeStr(e.departamento) === "PRODUCCION" && e.team_key === "team_1").length;
      } else if (n === "PRODUCCION T2" || n === "PRODUCCION T2.2") {
        count = employees.filter(e => normalizeStr(e.departamento) === "PRODUCCION" && e.team_key === "team_2").length;
      } else {
        count = employees.filter(e => normalizeStr(e.departamento) === n).length;
      }
      map.set(dept.id, count);
    });
    return map;
  }, [departments, employees]);

  const deptStats = React.useMemo(() => {
    const stats = {};
    const calc = (deptId) => {
      if (stats[deptId]) return stats[deptId];
      const directEmp = employeeCountByDept.get(deptId) ?? 0;
      const directPos = positions.filter(p => p.department_id === deptId);
      const directHC = directPos.reduce((acc, p) => acc + (p.max_headcount || 0), 0);
      const children = departments.filter(d => d.parent_id === deptId);
      let childEmp = 0, childHC = 0;
      children.forEach(c => {
        const cs = calc(c.id);
        childEmp += cs.employees;
        childHC += cs.headcount;
      });
      stats[deptId] = { employees: directEmp + childEmp, headcount: directHC + childHC };
      return stats[deptId];
    };
    departments.forEach(d => calc(d.id));
    return stats;
  }, [departments, positions, employeeCountByDept]);

  // Helper: get employees for a dept (same logic as export)
  const getEmpsForDept = React.useCallback((dept) => {
    const n = normalizeStr(dept.name);
    if (n === "PRODUCCION T1" || n === "PRODUCCION T1.1")
      return employees.filter(e => normalizeStr(e.departamento) === "PRODUCCION" && e.team_key === "team_1");
    if (n === "PRODUCCION T2" || n === "PRODUCCION T2.2")
      return employees.filter(e => normalizeStr(e.departamento) === "PRODUCCION" && e.team_key === "team_2");
    return employees.filter(e => normalizeStr(e.departamento) === n);
  }, [employees]);

  // Helper: normalize puesto for matching
  // - Singulariza PROCESOS→PROCESO
  // - Elimina la preposición "DE " para equiparar "OPERARIA LIMPIEZA" con "OPERARIA DE LIMPIEZA"
  const normPuesto = (s) => normalizeStr(s)
    .replace(/PROCESOS\b/, 'PROCESO')
    .replace(/\bDE\s+/g, '');

  // Puestos de alto volumen: solo mostrar conteo, sin nombres
  const PUESTOS_SOLO_CONTEO = [
    'RESPONSABLE DE LINEA',
    'ADJUNTA RESPONSABLE DE LINEA',
    'OPERARIA DE ENVASADO',
  ].map(p => normPuesto(p));

  // Recursive node
  const OrgNode = ({ dept, parentKey }) => {
    const children = getSortedChildren(dept.id);
    const deptPositions = [...positions.filter(p => p.department_id === dept.id)].sort((a, b) => {
      const ao = a.orden ?? 99; const bo = b.orden ?? 99;
      if (ao !== bo) return ao - bo;
      const lvl = { Executive:0, Director:1, Manager:2, Lead:3, Senior:4, Mid:5, Junior:6 };
      return (lvl[a.level] ?? 99) - (lvl[b.level] ?? 99);
    });
    const stats = deptStats[dept.id] || { employees: 0, headcount: 0 };
    const managerIds = [dept.manager_id, dept.manager_id_2, dept.manager_id_3, dept.manager_id_4].filter(Boolean);
    const managers = managerIds.map(id => employees.find(e => e.id === id)).filter(Boolean);
    const isCollapsed = collapsedNodes.has(dept.id);
    const hasChildren = children.length > 0;
    const nodeKey = dept.parent_id || 'root';
    const color = dept.color || '#3b82f6';

    // Sibling order position
    const siblings = getSortedChildren(dept.parent_id || null);
    const sibIdx = siblings.findIndex(s => s.id === dept.id);
    const isFirst = sibIdx === 0;
    const isLast = sibIdx === siblings.length - 1;

    // Employees for this dept
    const deptEmps = getEmpsForDept(dept);

    return (
      <li className="flex flex-col items-center">
        <div className="relative group">
          {/* Card styled like export */}
          <div
            className={`${isCompact ? 'w-40' : 'w-52'} rounded-lg border-2 shadow-md bg-white dark:bg-card overflow-hidden hover:shadow-lg transition-all z-10 relative`}
            style={{ borderColor: color }}
          >
            {/* Header with dept color */}
            <div className="px-2 py-2 text-center relative" style={{ background: color }}>
              <h4 className="font-bold text-white leading-tight text-[11px] tracking-wide">{dept.name}</h4>
              {dept.code && <div className="text-[9px] text-white/80 mt-0.5">{dept.code}</div>}
              {/* Employee count badge - always visible in header */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 bg-white dark:bg-slate-700 border-2 rounded-full px-2 py-0.5 flex items-center gap-0.5 shadow-sm whitespace-nowrap" style={{ borderColor: color }}>
                <span className="text-[9px] font-bold" style={{ color }}>{stats.employees}</span>
                <span className="text-[8px] text-slate-500 dark:text-slate-400">empl.</span>
              </div>
            </div>

            <div className="px-2 pt-5 pb-1.5">
              {/* Actions menu - top right overlay */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-0.5">
                {siblings.length > 1 && (
                  <>
                    <Button variant="ghost" size="icon" className="h-5 w-5 bg-white/80 shadow-sm hover:bg-slate-100" disabled={isFirst}
                      onClick={(e) => { e.stopPropagation(); moveSiblingInChart(nodeKey, dept.id, -1); }}>
                      <ArrowLeft className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5 bg-white/80 shadow-sm hover:bg-slate-100" disabled={isLast}
                      onClick={(e) => { e.stopPropagation(); moveSiblingInChart(nodeKey, dept.id, 1); }}>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </>
                )}
                {(onEdit || onAddChild || onMove || onDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 bg-white/80 shadow-sm hover:bg-white">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onAddChild && <DropdownMenuItem onClick={() => onAddChild(dept.id)}><Plus className="w-4 h-4 mr-2" /> Añadir Sub-depto.</DropdownMenuItem>}
                      {onEdit && <DropdownMenuItem onClick={() => onEdit(dept)}><Edit className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>}
                      {onMove && <DropdownMenuItem onClick={() => onMove(dept)}><ArrowLeft className="w-4 h-4 mr-2 rotate-180" /> Mover a...</DropdownMenuItem>}
                      {onDelete && (<><DropdownMenuSeparator /><DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => { if(confirm('¿Eliminar departamento?')) onDelete(dept.id); }}><Trash2 className="w-4 h-4 mr-2" /> Eliminar</DropdownMenuItem></>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Managers */}
              {managers.length > 0 && !isCompact && (
                <div className="text-[9px] text-indigo-700 dark:text-indigo-300 font-medium text-center bg-indigo-50 dark:bg-indigo-950/30 rounded px-1 py-0.5 mb-1">
                  {managers.map(m => m.nombre).join(' · ')}
                </div>
              )}

              {/* Positions with employee names (or count-only for high-volume positions) */}
              {!isCompact && deptPositions.map(pos => {
                const assigned = deptEmps.filter(e => normPuesto(e.puesto) === normPuesto(pos.name));
                const soloConteo = PUESTOS_SOLO_CONTEO.includes(normPuesto(pos.name));
                return (
                  <div key={pos.id} className="border-t border-slate-100 dark:border-slate-700 pt-1 pb-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-[9px] font-bold text-slate-700 dark:text-slate-300 leading-tight">{pos.name}</div>
                      {soloConteo && (
                        <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded shrink-0">{assigned.length}</span>
                      )}
                    </div>
                    {!soloConteo && (
                      assigned.length > 0
                        ? assigned.map(emp => (
                            <div key={emp.id} className="text-[8.5px] text-slate-500 dark:text-slate-400 pl-2 leading-snug">• {emp.nombre}</div>
                          ))
                        : <div className="text-[8.5px] text-slate-400 italic pl-2">Sin asignar</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Collapse/Expand toggle */}
          {hasChildren && (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30">
              <Button size="icon" variant="outline"
                className="h-6 w-6 rounded-full bg-white shadow-sm border border-slate-200 hover:bg-slate-50 p-0"
                onClick={(e) => { e.stopPropagation(); toggleCollapse(dept.id); }}
              >
                {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </Button>
            </div>
          )}
        </div>

        {hasChildren && !isCollapsed && (
          <>
            <div className="w-px h-6 bg-slate-300"></div>
            <ul className="flex justify-center gap-2 pt-4 border-t border-slate-300 relative">
              {children.map(child => (
                <OrgNode key={child.id} dept={child} parentKey={dept.id} />
              ))}
            </ul>
          </>
        )}
      </li>
    );
  };

  const rootDepartments = getSortedChildren(null);

  return (
    <div 
      className="relative overflow-hidden flex-1 flex flex-col bg-slate-50 dark:bg-background rounded-lg border border-slate-200 dark:border-border select-none"
      style={{ minHeight: 0, height: '100%' }}
    >
      {/* Saving indicator */}
      {isSaving && (
        <div className="absolute top-3 left-3 z-40 bg-white/95 dark:bg-card/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md border border-slate-200 dark:border-border text-xs text-slate-600 flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          Guardando orden...
        </div>
      )}

      {/* Export PDF button */}
      <div className="absolute top-3 left-3 z-39" style={{ zIndex: 39 }}>
        <OrgChartPDFExport
          departments={departments}
          positions={positions}
          employees={employees}
          siblingOrder={Object.values(siblingOrder).reduce((acc, group) => ({ ...acc, ...group }), {})}
        />
      </div>

      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-40 flex gap-1.5 bg-white/95 dark:bg-card/95 backdrop-blur-sm p-1.5 rounded-lg shadow-md border border-slate-200 dark:border-border">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}>
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Alejar</TooltipContent>
          </Tooltip>
          
          <div className="flex items-center px-1.5 text-xs font-mono w-10 justify-center bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            {Math.round(zoom * 100)}%
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Acercar</TooltipContent>
          </Tooltip>

          <div className="w-px h-7 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={isCompact ? "secondary" : "outline"} 
                size="icon" className="h-7 w-7" 
                onClick={() => setIsCompact(!isCompact)}
              >
                {isCompact ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isCompact ? "Vista detallada" : "Vista compacta"}</TooltipContent>
          </Tooltip>

          <div className="w-px h-7 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={expandAll}>
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Expandir todo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={collapseAll}>
                <ChevronUp className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Colapsar todo</TooltipContent>
          </Tooltip>

          <div className="w-px h-7 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={resetView}>
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ajustar a ventana</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-40 bg-white/90 dark:bg-card/90 backdrop-blur-sm px-2 py-1 rounded-md border border-slate-200 dark:border-border text-[9px] text-slate-500 flex gap-3">
        <span>🖱️ Arrastrar para mover</span>
        <span>🖲️ Rueda para zoom</span>
        <span>↔ Flechas en nodo para reordenar</span>
      </div>

      {/* Canvas */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          ref={contentRef}
          className="inline-flex justify-center origin-top-left transition-none p-10"
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top center',
          }}
        >
          <ul className="flex gap-6">
            {rootDepartments.map(dept => (
              <OrgNode key={dept.id} dept={dept} parentKey="root" />
            ))}
          </ul>
        </div>
        
        {rootDepartments.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            No hay estructura organizativa definida.
          </div>
        )}
      </div>

      {/* CSS connectors */}
      <style>{`
        ul { position: relative; padding-top: 20px; transition: all 0.3s; list-style: none; margin: 0; padding-left: 0; }
        li { float: left; text-align: center; list-style-type: none; position: relative; padding: 20px 5px 0 5px; transition: all 0.3s; }
        li::before, li::after { content: ''; position: absolute; top: 0; right: 50%; border-top: 1px solid #cbd5e1; width: 50%; height: 20px; }
        li::after { right: auto; left: 50%; border-left: 1px solid #cbd5e1; }
        li:only-child::after, li:only-child::before { display: none; }
        li:only-child { padding-top: 0; }
        li:first-child::before, li:last-child::after { border: 0 none; }
        li:last-child::before { border-right: 1px solid #cbd5e1; border-radius: 0 5px 0 0; }
        li:first-child::after { border-radius: 5px 0 0 0; }
        ul ul::before { content: ''; position: absolute; top: 0; left: 50%; border-left: 1px solid #cbd5e1; width: 0; height: 20px; }
      `}</style>
    </div>
  );
}