import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, UserCircle, MoreHorizontal, Plus, Edit, Trash2,
  ZoomIn, ZoomOut, Maximize2, Minimize2, ChevronDown, ChevronUp,
  ArrowLeft, ArrowRight, RotateCcw
} from "lucide-react";
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
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 1000),
    enabled: !data?.employees
  });

  const departments = data?.departments || fetchedDepts;
  const positions = data?.positions || fetchedPos;
  const employees = data?.employees || fetchedEmps;

  // Reorder siblings state (node-level sorting in chart view)
  const [siblingOrder, setSiblingOrder] = React.useState({});

  // Initialize sibling order from dept.orden
  React.useEffect(() => {
    const order = {};
    departments.forEach(dept => {
      if (dept.parent_id) {
        if (!order[dept.parent_id]) order[dept.parent_id] = {};
        order[dept.parent_id][dept.id] = dept.orden ?? 0;
      } else {
        if (!order['root']) order['root'] = {};
        order['root'][dept.id] = dept.orden ?? 0;
      }
    });
    setSiblingOrder(order);
  }, [departments]);

  const moveSiblingInChart = (parentKey, deptId, delta) => {
    setSiblingOrder(prev => {
      const group = { ...(prev[parentKey] || {}) };
      const sorted = Object.entries(group).sort((a, b) => a[1] - b[1]);
      const idx = sorted.findIndex(([id]) => id === deptId);
      if (idx < 0) return prev;
      const newIdx = Math.max(0, Math.min(sorted.length - 1, idx + delta));
      if (newIdx === idx) return prev;
      const newSorted = [...sorted];
      const [item] = newSorted.splice(idx, 1);
      newSorted.splice(newIdx, 0, item);
      const newGroup = {};
      newSorted.forEach(([id], i) => { newGroup[id] = i; });
      return { ...prev, [parentKey]: newGroup };
    });
    // Persist via onNodeDrop callback if available (reuse for reorder)
    if (onNodeDrop) {
      const siblings = departments.filter(d => 
        (d.parent_id || 'root') === parentKey
      );
      // signal to parent for persistence
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

  // Employee count calculation
  const normalizeDeptName = (name) => (name || '').toString().trim().toUpperCase();

  const employeeCountByDept = React.useMemo(() => {
    const map = new Map();
    departments.forEach(dept => {
      const n = normalizeDeptName(dept.name);
      let count;
      if (n === "PRODUCCIÓN T1" || n === "PRODUCCIÓN T1.1") {
        count = employees.filter(e => normalizeDeptName(e.departamento) === "PRODUCCIÓN" && e.team_key === "team_1").length;
      } else if (n === "PRODUCCIÓN T2" || n === "PRODUCCIÓN T2.2") {
        count = employees.filter(e => normalizeDeptName(e.departamento) === "PRODUCCIÓN" && e.team_key === "team_2").length;
      } else {
        count = employees.filter(e => normalizeDeptName(e.departamento) === n).length;
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

  // Recursive node
  const OrgNode = ({ dept, parentKey }) => {
    const children = getSortedChildren(dept.id);
    const deptPositions = positions.filter(p => p.department_id === dept.id);
    const stats = deptStats[dept.id] || { employees: 0, headcount: 0 };
    const manager = employees.find(e => e.id === dept.manager_id);
    const isCollapsed = collapsedNodes.has(dept.id);
    const hasChildren = children.length > 0;
    const nodeKey = dept.parent_id || 'root';

    // Sibling order position
    const siblings = getSortedChildren(dept.parent_id || null);
    const sibIdx = siblings.findIndex(s => s.id === dept.id);
    const isFirst = sibIdx === 0;
    const isLast = sibIdx === siblings.length - 1;

    return (
      <li className="flex flex-col items-center">
        <div className="relative group">
          <Card 
            className={`
              ${isCompact ? 'w-44' : 'w-60'} 
              border-t-4 shadow-md z-10 relative bg-white dark:bg-card hover:shadow-lg transition-all
              ${isCollapsed && hasChildren ? 'ring-2 ring-slate-200' : ''}
            `} 
            style={{ borderTopColor: dept.color || '#3b82f6' }}
          >
            <CardContent className={`${isCompact ? 'p-2' : 'p-3'}`}>
              {/* Actions menu */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-0.5">
                {/* Sibling reorder buttons */}
                {siblings.length > 1 && (
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost" size="icon"
                      className="h-5 w-5 bg-white/80 shadow-sm hover:bg-slate-100"
                      disabled={isFirst}
                      title="Mover izquierda"
                      onClick={(e) => { e.stopPropagation(); moveSiblingInChart(nodeKey, dept.id, -1); }}
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-5 w-5 bg-white/80 shadow-sm hover:bg-slate-100"
                      disabled={isLast}
                      title="Mover derecha"
                      onClick={(e) => { e.stopPropagation(); moveSiblingInChart(nodeKey, dept.id, 1); }}
                    >
                      <ArrowRightIcon className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                {(onEdit || onAddChild) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 bg-white/80 shadow-sm hover:bg-white">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onAddChild && (
                        <DropdownMenuItem onClick={() => onAddChild(dept.id)}>
                          <Plus className="w-4 h-4 mr-2" /> Añadir Sub-depto.
                        </DropdownMenuItem>
                      )}
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(dept)}>
                          <Edit className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                      )}
                      {onMove && (
                        <DropdownMenuItem onClick={() => onMove(dept)}>
                          <ArrowRight className="w-4 h-4 mr-2" /> Mover a...
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600" 
                            onClick={() => { if(confirm('¿Eliminar departamento?')) onDelete(dept.id); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="text-center mb-1 mt-1 pr-6">
                <h4 className={`font-bold text-slate-800 dark:text-slate-200 leading-tight ${isCompact ? 'text-[10px]' : 'text-xs'}`}>{dept.name}</h4>
                {!isCompact && dept.code && <Badge variant="outline" className="text-[9px] mt-0.5 h-4">{dept.code}</Badge>}
              </div>
              
              {manager && !isCompact && (
                <div className="flex items-center justify-center gap-1 mb-1.5 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded">
                  <UserCircle className="w-3 h-3 text-blue-600 shrink-0" />
                  <span className="text-[9px] font-medium text-blue-800 dark:text-blue-300 truncate max-w-[120px]" title={manager.nombre}>
                    {manager.nombre}
                  </span>
                </div>
              )}

              {!isCompact && deptPositions.length > 0 && (
                <div className="space-y-0.5 bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded text-[9px] border border-slate-100 dark:border-slate-700 mb-1.5">
                  {deptPositions.slice(0, 2).map(pos => (
                    <div key={pos.id} className="flex justify-between items-center">
                      <span className="truncate max-w-[100px] text-slate-600 dark:text-slate-400" title={pos.name}>{pos.name}</span>
                      <Badge variant="secondary" className="text-[8px] h-3.5 px-1">{pos.max_headcount || 1}</Badge>
                    </div>
                  ))}
                  {deptPositions.length > 2 && (
                    <div className="text-[8px] text-center text-slate-400">+{deptPositions.length - 2} más</div>
                  )}
                </div>
              )}

              <div className={`pt-1.5 border-t border-slate-100 dark:border-slate-700 text-[9px] text-slate-500 grid grid-cols-2 gap-1`}>
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400">Emp.</span>
                  <span className="font-bold text-indigo-600 text-xs">{stats.employees}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400">HC</span>
                  <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">{stats.headcount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Collapse/Expand toggle */}
          {hasChildren && (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30">
              <Button 
                size="icon" 
                variant="outline"
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
                <div key={child.id} className="relative px-1">
                  <div className="absolute -top-4 left-1/2 w-px h-4 bg-slate-300 -translate-x-1/2"></div>
                  <OrgNode dept={child} parentKey={dept.id} />
                </div>
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