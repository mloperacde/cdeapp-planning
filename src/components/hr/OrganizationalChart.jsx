import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, UserCircle, MoreHorizontal, Plus, Edit, Trash2, ArrowRight,
  ZoomIn, ZoomOut, Maximize2, Minimize2, ChevronDown, ChevronUp
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
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    enabled: !data?.employees
  });

  const departments = data?.departments || fetchedDepts;
  const positions = data?.positions || fetchedPos;
  const employees = data?.employees || fetchedEmps;

  // Toggle collapse state for a node
  const toggleCollapse = (deptId) => {
    const newSet = new Set(collapsedNodes);
    if (newSet.has(deptId)) {
      newSet.delete(deptId);
    } else {
      newSet.add(deptId);
    }
    setCollapsedNodes(newSet);
  };

  const expandAll = () => setCollapsedNodes(new Set());
  const collapseAll = () => {
    const allIds = departments.filter(d => departments.some(child => child.parent_id === d.id)).map(d => d.id);
    setCollapsedNodes(new Set(allIds));
  };

  // Calculate recursive stats for all departments
  const deptStats = React.useMemo(() => {
    const stats = {};
    
    const calculateStats = (deptId) => {
      if (stats[deptId]) return stats[deptId];

      const dept = departments.find(d => d.id === deptId);
      if (!dept) return { employees: 0, headcount: 0 };

      // Direct counts
      const directPos = positions.filter(p => p.department_id === deptId);
      const directHC = directPos.reduce((acc, p) => acc + (p.max_headcount || 0), 0);
      // Match by name as per current system convention
      const directEmp = employees.filter(e => e.departamento === dept.name).length;

      // Children counts
      const children = departments.filter(d => d.parent_id === deptId);
      
      let totalEmp = directEmp;
      let totalHC = directHC;

      children.forEach(child => {
        const childStats = calculateStats(child.id);
        totalEmp += childStats.employees;
        totalHC += childStats.headcount;
      });

      stats[deptId] = { employees: totalEmp, headcount: totalHC };
      return stats[deptId];
    };

    departments.forEach(d => calculateStats(d.id));
    return stats;
  }, [departments, positions, employees]);

  // Recursive component for tree branch
  const OrgNode = ({ dept }) => {
    const children = departments.filter(d => d.parent_id === dept.id);
    const deptPositions = positions.filter(p => p.department_id === dept.id);
    // Use pre-calculated recursive stats
    const stats = deptStats[dept.id] || { employees: 0, headcount: 0 };
    
    const manager = employees.find(e => e.id === dept.manager_id);
    const [isDragOver, setIsDragOver] = React.useState(false);
    const isCollapsed = collapsedNodes.has(dept.id);
    const hasChildren = children.length > 0;

    const handleDragStart = (e) => {
        if (!onNodeDrop) return;
        e.stopPropagation();
        e.dataTransfer.setData('application/x-dept-id', dept.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        if (!onNodeDrop) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        if (!onNodeDrop) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const draggedId = e.dataTransfer.getData('application/x-dept-id');
        if (draggedId && draggedId !== dept.id) {
            onNodeDrop(draggedId, dept.id);
        }
    };

    return (
      <li className="flex flex-col items-center">
        <div className="relative group">
          <Card 
            draggable={!!onNodeDrop}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              ${isCompact ? 'w-48' : 'w-64'} 
              border-t-4 shadow-md z-10 relative bg-white hover:shadow-lg transition-all cursor-default 
              ${isDragOver ? 'ring-2 ring-indigo-500 ring-offset-2 scale-105' : ''}
              ${isCollapsed && hasChildren ? 'ring-2 ring-slate-200' : ''}
            `} 
            style={{ borderTopColor: dept.color || '#3b82f6' }}
          >
            <CardContent className={`${isCompact ? 'p-2' : 'p-3'}`}>
              <div className="flex justify-between items-start absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                {(onEdit || onAddChild) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 bg-white/50 hover:bg-white shadow-sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onAddChild && (
                        <DropdownMenuItem onClick={() => onAddChild(dept.id)}>
                          <Plus className="w-4 h-4 mr-2" /> Añadir Sub-departamento
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

              <div className="text-center mb-2 mt-1">
                <h4 className={`font-bold text-slate-800 ${isCompact ? 'text-xs' : 'text-sm'}`}>{dept.name}</h4>
                {!isCompact && <Badge variant="outline" className="text-[10px] mt-1">{dept.code}</Badge>}
              </div>
              
              {manager && !isCompact && (
                <div className="flex items-center justify-center gap-1.5 mb-2 bg-blue-50 p-1 rounded">
                  <UserCircle className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-medium text-blue-800 truncate max-w-[150px]">
                    {manager.nombre}
                  </span>
                </div>
              )}

              {!isCompact && (
                <div className="space-y-1 bg-slate-50 p-2 rounded text-xs border border-slate-100">
                  {deptPositions.length > 0 ? (
                    deptPositions.slice(0, 3).map(pos => (
                      <div key={pos.id} className="flex justify-between items-center">
                        <span className="truncate max-w-[100px]" title={pos.name}>{pos.name}</span>
                        <Badge variant="secondary" className="text-[9px] h-4 px-1">{pos.max_headcount || 1}</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic text-center">Sin puestos</div>
                  )}
                  {deptPositions.length > 3 && (
                    <div className="text-[10px] text-center text-slate-400">+{deptPositions.length - 3} más</div>
                  )}
                </div>
              )}

              <div className={`mt-2 pt-2 border-t text-[10px] text-slate-500 grid grid-cols-2 gap-2 ${isCompact ? 'border-t-0 pt-0' : ''}`}>
                <div className="flex flex-col border-r border-slate-100 pr-2">
                  <span className="text-[9px] uppercase tracking-wider" title="Total Empleados (Incl. sub-depts)">Emp.</span>
                  <span className="font-bold text-indigo-600 text-sm">{stats.employees}</span>
                </div>
                <div className="flex flex-col text-right pl-2">
                  <span className="text-[9px] uppercase tracking-wider" title="Headcount Total (Incl. sub-depts)">HC</span>
                  <span className="font-bold text-slate-600 text-sm">{stats.headcount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Collapse/Expand Toggle */}
          {hasChildren && (
             <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30">
               <Button 
                 size="icon" 
                 variant="outline"
                 className="h-6 w-6 rounded-full bg-white shadow-sm border border-slate-200 hover:bg-slate-50 p-0"
                 onClick={(e) => {
                   e.stopPropagation();
                   toggleCollapse(dept.id);
                 }}
               >
                 {isCollapsed ? (
                   <ChevronDown className="w-3 h-3 text-slate-600" />
                 ) : (
                   <ChevronUp className="w-3 h-3 text-slate-600" />
                 )}
               </Button>
             </div>
          )}

          {/* Add Child Button visual shortcut - only show if not collapsed */}
          {onAddChild && !isCollapsed && (
             <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
               <Button 
                 size="icon" 
                 className="h-6 w-6 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-md border-2 border-white"
                 onClick={() => onAddChild(dept.id)}
                 title="Añadir hijo"
               >
                 <Plus className="w-3 h-3 text-white" />
               </Button>
             </div>
          )}
        </div>

        {hasChildren && !isCollapsed && (
          <>
            <div className="w-px h-6 bg-slate-300"></div>
            <ul className="flex justify-center gap-4 pt-4 border-t border-slate-300 relative">
              {children.map(child => (
                <div key={child.id} className="relative px-2">
                  <div className="absolute -top-4 left-1/2 w-px h-4 bg-slate-300 -translate-x-1/2"></div>
                  <OrgNode dept={child} />
                </div>
              ))}
            </ul>
          </>
        )}
      </li>
    );
  };

  // Find root departments (parent_id is null or not found in list)
  const rootDepartments = departments.filter(d => !d.parent_id || !departments.find(p => p.id === d.parent_id));

  return (
    <div className="relative overflow-hidden h-full flex flex-col bg-slate-50 rounded-lg border border-slate-200">
      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-40 flex gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-slate-200">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
                <ZoomOut className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Alejar</TooltipContent>
          </Tooltip>
          
          <div className="flex items-center px-2 text-xs font-mono w-12 justify-center">
            {Math.round(zoom * 100)}%
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Acercar</TooltipContent>
          </Tooltip>

          <div className="w-px h-8 bg-slate-200 mx-1"></div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={isCompact ? "secondary" : "outline"} 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => setIsCompact(!isCompact)}
              >
                {isCompact ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isCompact ? "Vista detallada" : "Vista compacta"}</TooltipContent>
          </Tooltip>

          <div className="w-px h-8 bg-slate-200 mx-1"></div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={expandAll}>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Expandir todo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={collapseAll}>
                <ChevronUp className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Colapsar todo</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="overflow-auto flex-1 p-8 cursor-grab active:cursor-grabbing">
        <div 
          className="min-w-max flex justify-center origin-top transition-transform duration-200 ease-out"
          style={{ transform: `scale(${zoom})` }}
        >
          <ul className="flex gap-8">
            {rootDepartments.map(dept => (
              <OrgNode key={dept.id} dept={dept} />
            ))}
          </ul>
        </div>
        
        {rootDepartments.length === 0 && (
          <div className="text-center text-slate-400 mt-20">
            No hay estructura organizativa definida. Configúrala en el panel de Gestión.
          </div>
        )}
      </div>

      {/* Basic CSS for tree structure connectors */}
      <style>{`
        ul {
          position: relative;
          padding-top: 20px; 
          transition: all 0.5s;
          -webkit-transition: all 0.5s;
          -moz-transition: all 0.5s;
        }
        
        li {
          float: left; text-align: center;
          list-style-type: none;
          position: relative;
          padding: 20px 5px 0 5px;
          
          transition: all 0.5s;
          -webkit-transition: all 0.5s;
          -moz-transition: all 0.5s;
        }

        /*Connectors*/
        li::before, li::after{
          content: '';
          position: absolute; top: 0; right: 50%;
          border-top: 1px solid #ccc;
          width: 50%; height: 20px;
        }
        li::after{
          right: auto; left: 50%;
          border-left: 1px solid #ccc;
        }

        /*Remove left-right connectors from elements without 
        any siblings*/
        li:only-child::after, li:only-child::before {
          display: none;
        }

        /*Remove space from the top of single children*/
        li:only-child{ padding-top: 0;}

        /*Remove left connector from first child and 
        right connector from last child*/
        li:first-child::before, li:last-child::after{
          border: 0 none;
        }
        /*Adding back the vertical connector to the last nodes*/
        li:last-child::before{
          border-right: 1px solid #ccc;
          border-radius: 0 5px 0 0;
          -webkit-border-radius: 0 5px 0 0;
          -moz-border-radius: 0 5px 0 0;
        }
        li:first-child::after{
          border-radius: 5px 0 0 0;
          -webkit-border-radius: 5px 0 0 0;
          -moz-border-radius: 5px 0 0 0;
        }

        /*Time to add downward connectors from parents*/
        ul ul::before{
          content: '';
          position: absolute; top: 0; left: 50%;
          border-left: 1px solid #ccc;
          width: 0; height: 20px;
        }
      `}</style>
    </div>
  );
}
