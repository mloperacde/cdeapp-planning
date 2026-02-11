import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Plus, Trash2, Edit, Save, X, Users, Briefcase, 
  ChevronRight, ChevronDown, Building2, UserCircle,
  FolderTree, Layout, Search, ArrowRight, Settings2,
  MoreHorizontal, GripVertical, RefreshCw, CheckCircle2, AlertCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { toast } from "sonner";
import OrganizationalChart from "../hr/OrganizationalChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function DepartmentPositionManager() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState("editor"); // editor | chart
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [isPosDialogOpen, setIsPosDialogOpen] = useState(false);
  const [editingPos, setEditingPos] = useState(null);
  const [expandedDepts, setExpandedDepts] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [deptToMove, setDeptToMove] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [activeTab, setActiveTab] = useState("positions");
  const [isEmpDialogOpen, setIsEmpDialogOpen] = useState(false);
  const [empToEdit, setEmpToEdit] = useState(null);

  // Queries
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
  });

  // Derived State
  const selectedDept = useMemo(() => 
    departments.find(d => d.id === selectedDeptId), 
  [departments, selectedDeptId]);

  const deptPositions = useMemo(() => 
    positions.filter(p => p.department_id === selectedDeptId),
  [positions, selectedDeptId]);

  const deptEmployees = useMemo(() => {
    if (!selectedDept) return [];
    const normalizedDeptName = (selectedDept.name || "").trim().toUpperCase();
    return employees.filter(e => (e.departamento || "").trim().toUpperCase() === normalizedDeptName);
  }, [employees, selectedDept]);

  // Expand root departments by default
  useEffect(() => {
    if (departments.length > 0 && expandedDepts.size === 0) {
      const roots = departments.filter(d => !d.parent_id).map(d => d.id);
      setExpandedDepts(new Set(roots));
    }
  }, [departments]);

  // Mutations
  const deptMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data };
      if (payload.parent_id === "root") payload.parent_id = null;
      
      // Set parent_name based on parent_id
      if (payload.parent_id) {
        const parentDept = departments.find(d => d.id === payload.parent_id);
        payload.parent_name = parentDept?.name || null;
      } else {
        payload.parent_name = null;
      }
      
      const result = data.id 
        ? await base44.entities.Department.update(data.id, payload)
        : await base44.entities.Department.create(payload);
      
      // If department name changed, update all positions' department_name
      if (data.id && data.name) {
        const oldDept = departments.find(d => d.id === data.id);
        if (oldDept && oldDept.name !== data.name) {
          const deptPositions = positions.filter(p => p.department_id === data.id);
          await Promise.all(
            deptPositions.map(pos => 
              base44.entities.Position.update(pos.id, { department_name: data.name })
            )
          );
        }
      }
      
      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
      await queryClient.invalidateQueries({ queryKey: ['positions'] });
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      // Recalculate all total_employee_count
      await recalculateEmployeeCounts();
      toast.success("Departamento guardado correctamente");
      setIsDeptDialogOpen(false);
    }
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id) => base44.entities.Department.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success("Departamento eliminado");
      if (selectedDeptId) setSelectedDeptId(null);
    }
  });

  const posMutation = useMutation({
    mutationFn: async (data) => {
      // Add department_name for easier querying
      const department = departments.find(d => d.id === data.department_id);
      const payload = {
        ...data,
        department_name: department?.name || null
      };
      
      if (data.id) {
        return base44.entities.Position.update(data.id, payload);
      }
      return base44.entities.Position.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      setIsPosDialogOpen(false);
      toast.success("Puesto guardado");
    }
  });

  const deletePosMutation = useMutation({
    mutationFn: (id) => base44.entities.Position.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast.success("Puesto eliminado");
    }
  });

  const movePosMutation = useMutation({
    mutationFn: async ({ id, newDeptId }) => {
      const newDept = departments.find(d => d.id === newDeptId);
      return base44.entities.Position.update(id, { 
        department_id: newDeptId,
        department_name: newDept?.name || null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast.success("Puesto movido correctamente");
    }
  });

  const moveDeptMutation = useMutation({
    mutationFn: async ({ id, newParentId }) => {
      // Prevent moving to self or own descendant (simple check)
      // Ideally we check descendants here, but for now we rely on UI filtering
      const payload = { parent_id: newParentId === "root" ? null : newParentId };
      
      // Set parent_name based on newParentId
      if (newParentId && newParentId !== "root") {
        const parentDept = departments.find(d => d.id === newParentId);
        payload.parent_name = parentDept?.name || null;
      } else {
        payload.parent_name = null;
      }
      
      return base44.entities.Department.update(id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
      // Recalculate all total_employee_count after move
      await recalculateEmployeeCounts();
      toast.success("Departamento movido correctamente");
      setIsMoveDialogOpen(false);
      setDeptToMove(null);
    }
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, departamento, puesto }) => {
      return base44.entities.EmployeeMasterDatabase.update(id, { departamento, puesto });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      // Recalculate all total_employee_count after employee assignment change
      await recalculateEmployeeCounts();
      toast.success("Empleado asignado correctamente");
      setIsEmpDialogOpen(false);
    }
  });

  // Function to recursively calculate total employee count
  const recalculateEmployeeCounts = async () => {
    const currentDepts = await base44.entities.Department.list();
    const currentEmps = await base44.entities.EmployeeMasterDatabase.list();
    
    const calculateCount = (deptId, depts, emps) => {
      const dept = depts.find(d => d.id === deptId);
      if (!dept) return 0;
      
      // Direct employees in this department
      const normalizedDeptName = (dept.name || "").trim().toUpperCase();
      const directCount = emps.filter(e => 
        (e.departamento || "").trim().toUpperCase() === normalizedDeptName
      ).length;
      
      // Children's counts
      const children = depts.filter(d => d.parent_id === deptId);
      const childrenCount = children.reduce((sum, child) => 
        sum + calculateCount(child.id, depts, emps), 0
      );
      
      return directCount + childrenCount;
    };
    
    // Update all departments with their total counts
    const updates = currentDepts.map(dept => {
      const totalCount = calculateCount(dept.id, currentDepts, currentEmps);
      return base44.entities.Department.update(dept.id, { 
        total_employee_count: totalCount 
      });
    });
    
    await Promise.all(updates);
    await queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  // Handlers
  const toggleExpand = (deptId) => {
    const newSet = new Set(expandedDepts);
    if (newSet.has(deptId)) {
      newSet.delete(deptId);
    } else {
      newSet.add(deptId);
    }
    setExpandedDepts(newSet);
  };

  const handleCreateDept = (parentId = null) => {
    // We'll use the form state in the dialog
    setDeptForm({
      name: "",
      code: "",
      parent_id: parentId || "root",
      manager_id: "",
      color: "#3b82f6"
    });
    setIsDeptDialogOpen(true);
  };

  const handleEditDept = (dept) => {
    setDeptForm({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      parent_id: dept.parent_id || "root",
      manager_id: dept.manager_id || "",
      color: dept.color || "#3b82f6"
    });
    setIsDeptDialogOpen(true);
  };

  const handleCreatePos = () => {
    if (!selectedDeptId) return;
    setPosForm({
      name: "",
      department_id: selectedDeptId,
      max_headcount: 1,
      level: "Mid",
      description: ""
    });
    setEditingPos(null);
    setIsPosDialogOpen(true);
  };

  const handleEditPos = (pos) => {
    setPosForm({
      id: pos.id,
      name: pos.name,
      department_id: pos.department_id,
      max_headcount: pos.max_headcount || 1,
      level: pos.level || "Mid",
      description: pos.description || ""
    });
    setEditingPos(pos);
    setIsPosDialogOpen(true);
  };

  // Analysis Logic for Sync
  const analysisResult = useMemo(() => {
    if (!isSyncDialogOpen) return null;

    const deptMap = new Map();
    const normalize = (s) => (s || "").trim().toUpperCase();

    // 1. Scan Employees
    employees.forEach(emp => {
      // Skip if marked as deleted or inactive if needed, but usually we want to see all structure
      const dNameRaw = emp.departamento || "Sin Departamento";
      const pNameRaw = emp.puesto || "Sin Puesto";
      
      // Skip "Sin Departamento" for structure creation usually, but show it for info
      if (!emp.departamento) return; 

      const dKey = normalize(dNameRaw);
      const pKey = normalize(pNameRaw);

      if (!deptMap.has(dKey)) {
        const existingDept = departments.find(d => normalize(d.name) === dKey);
        deptMap.set(dKey, {
          name: dNameRaw, // Use first found casing
          key: dKey,
          count: 0,
          positions: new Map(),
          existingId: existingDept?.id,
          isNew: !existingDept
        });
      }
      const deptEntry = deptMap.get(dKey);
      deptEntry.count++;

      if (!deptEntry.positions.has(pKey)) {
        // We can only check for existing position if we have a department ID
        // If department is new, position is definitely new (or needs linking)
        const existingPos = deptEntry.existingId 
          ? positions.find(p => normalize(p.name) === pKey && p.department_id === deptEntry.existingId)
          : null;

        deptEntry.positions.set(pKey, {
          name: pNameRaw,
          key: pKey,
          count: 0,
          existingId: existingPos?.id,
          isNew: !existingPos
        });
      }
      deptEntry.positions.get(pKey).count++;
    });

    return Array.from(deptMap.values()).map(d => ({
        ...d,
        positions: Array.from(d.positions.values()).sort((a, b) => b.count - a.count)
    })).sort((a, b) => b.count - a.count);

  }, [employees, departments, positions, isSyncDialogOpen]);

  const [syncing, setSyncing] = useState(false);

  const performSync = async () => {
    if (!analysisResult) return;
    setSyncing(true);
    try {
      let createdDepts = 0;
      let createdPos = 0;

      for (const deptData of analysisResult) {
        let deptId = deptData.existingId;

        // Create Department if missing
        if (!deptId) {
          const newDept = await base44.entities.Department.create({
            name: deptData.name,
            code: deptData.name.substring(0, 3).toUpperCase(),
            color: "#64748b" // Default slate
          });
          deptId = newDept.id;
          createdDepts++;
        }

        // Create Positions
        for (const posData of deptData.positions) {
          if (!posData.existingId) {
            await base44.entities.Position.create({
              name: posData.name,
              department_id: deptId,
              department_name: deptData.name,
              max_headcount: posData.count, // Set initial headcount to current employee count
              level: "Mid"
            });
            createdPos++;
          }
        }
      }

      await queryClient.invalidateQueries();
      toast.success(`Sincronización completada: ${createdDepts} dept. y ${createdPos} puestos creados.`);
      setIsSyncDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Error durante la sincronización");
    } finally {
      setSyncing(false);
    }
  };

  // Forms State
  const [deptForm, setDeptForm] = useState({
    name: "", code: "", parent_id: "root", manager_id: "", color: "#3b82f6"
  });

  const [posForm, setPosForm] = useState({
    name: "", department_id: "", max_headcount: 1, level: "Mid", description: ""
  });

  // Helper to prevent cycles when moving
  const getDescendantIds = (deptId, allDepts) => {
    const descendants = new Set();
    const stack = [deptId];
    while (stack.length > 0) {
      const currentId = stack.pop();
      const children = allDepts.filter(d => d.parent_id === currentId);
      children.forEach(child => {
        descendants.add(child.id);
        stack.push(child.id);
      });
    }
    return descendants;
  };

  const invalidMoveTargets = useMemo(() => {
    if (!deptToMove) return new Set();
    return getDescendantIds(deptToMove.id, departments);
  }, [deptToMove, departments]);

  // Recursive Tree Item Component
  const DeptTreeItem = ({ dept, level = 0 }) => {
    const children = departments.filter(d => d.parent_id === dept.id);
    const hasChildren = children.length > 0;
    const [isDragOver, setIsDragOver] = useState(false);
    
    // Search logic
    const matchesSearch = (d) => (d.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const hasMatchingDescendant = (d) => {
      const directChildren = departments.filter(child => child.parent_id === d.id);
      return directChildren.some(child => matchesSearch(child) || hasMatchingDescendant(child));
    };

    const isMatch = matchesSearch(dept);
    const hasMatchingChildrenRes = hasMatchingDescendant(dept);
    
    // Auto-expand if searching and has matching children
    useEffect(() => {
      if (searchTerm && hasMatchingChildrenRes) {
        setExpandedDepts(prev => new Set([...prev, dept.id]));
      }
    }, [searchTerm, hasMatchingChildrenRes, dept.id]);

    if (searchTerm && !isMatch && !hasMatchingChildrenRes) {
      return null;
    }

    const isExpanded = expandedDepts.has(dept.id);
    const isSelected = selectedDeptId === dept.id;

    // Drag Handlers
    const handleDragStart = (e) => {
        e.stopPropagation();
        setDraggedItem({ type: 'dept', id: dept.id, data: dept });
        e.dataTransfer.setData('text/plain', dept.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!draggedItem) return;

        // Validation
        if (draggedItem.type === 'dept') {
            if (draggedItem.id === dept.id) return; // Can't drop on self
            // Check descendant
            const descendants = getDescendantIds(draggedItem.id, departments);
            if (descendants.has(dept.id)) return; // Can't drop on descendant
        }
        
        setIsDragOver(true);
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        if (!draggedItem) return;

        if (draggedItem.type === 'dept') {
            if (draggedItem.id === dept.id) return;
            const descendants = getDescendantIds(draggedItem.id, departments);
            if (descendants.has(dept.id)) {
                toast.error("No se puede mover un departamento dentro de su descendiente");
                return;
            }
            if (draggedItem.data.parent_id === dept.id) return; // No change

            moveDeptMutation.mutate({ id: draggedItem.id, newParentId: dept.id });
        } else if (draggedItem.type === 'pos') {
            if (draggedItem.data.department_id === dept.id) return; // No change
            movePosMutation.mutate({ id: draggedItem.id, newDeptId: dept.id });
        }
        
        setDraggedItem(null);
    };

    return (
      <div className="select-none">
        <ContextMenu>
          <ContextMenuTrigger>
            <div 
              draggable
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer transition-all group
                ${isSelected ? "bg-blue-100 text-blue-900" : "hover:bg-slate-100 text-slate-700"}
                ${isDragOver ? "bg-indigo-50 border-2 border-indigo-500 border-dashed" : "border-2 border-transparent"}
                ${draggedItem?.id === dept.id ? "opacity-50" : ""}
              `}
              onClick={() => setSelectedDeptId(dept.id)}
            >
              <div 
                className="p-1 rounded-sm hover:bg-slate-200 text-slate-400"
                onClick={(e) => { e.stopPropagation(); toggleExpand(dept.id); }}
              >
                {hasChildren ? (
                  isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                ) : <div className="w-4 h-4" />}
              </div>
              
              <div className="w-2 h-8 rounded-full mr-1 shrink-0" style={{ backgroundColor: dept.color }}></div>
              
              <div className="flex-1 truncate flex items-center justify-between">
                <span className="font-medium">{dept.name}</span>
                {dept.code && <span className="ml-2 text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{dept.code}</span>}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCreateDept(dept.id); }}>
                    <Plus className="w-4 h-4 mr-2" /> Añadir Sub-departamento
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditDept(dept); }}>
                    <Edit className="w-4 h-4 mr-2" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { 
                    e.stopPropagation(); 
                    setDeptToMove(dept); 
                    setIsMoveDialogOpen(true); 
                  }}>
                    <ArrowRight className="w-4 h-4 mr-2" /> Mover a...
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600 focus:text-red-600" 
                    onClick={(e) => { e.stopPropagation(); if(confirm('¿Eliminar departamento?')) deleteDeptMutation.mutate(dept.id); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => handleCreateDept(dept.id)}>
              <Plus className="w-4 h-4 mr-2" /> Añadir Sub-departamento
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleEditDept(dept)}>
              <Edit className="w-4 h-4 mr-2" /> Editar
            </ContextMenuItem>
            <ContextMenuItem onClick={() => {
               setDeptToMove(dept); 
               setIsMoveDialogOpen(true);
            }}>
              <ArrowRight className="w-4 h-4 mr-2" /> Mover a...
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem 
              className="text-red-600 focus:text-red-600"
              onClick={() => { if(confirm('¿Eliminar departamento?')) deleteDeptMutation.mutate(dept.id); }}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Eliminar
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        
        {isExpanded && hasChildren && (
          <div className="mt-1 ml-3 pl-3 border-l border-slate-200">
            {children.map(child => (
              <DeptTreeItem key={child.id} dept={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-2 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Settings2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Gestor de Estructura
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configura departamentos y puestos de forma jerárquica
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <Button 
              variant={viewMode === "editor" ? "white" : "ghost"} 
              size="sm" 
              className={`h-7 text-xs ${viewMode === "editor" ? "bg-white shadow-sm" : ""}`}
              onClick={() => setViewMode("editor")}
            >
              <Layout className="w-3.5 h-3.5 mr-2" /> Editor
            </Button>
            <Button 
              variant={viewMode === "chart" ? "white" : "ghost"} 
              size="sm"
              className={`h-7 text-xs ${viewMode === "chart" ? "bg-white shadow-sm" : ""}`}
              onClick={() => setViewMode("chart")}
            >
              <FolderTree className="w-3.5 h-3.5 mr-2" /> Organigrama
            </Button>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            onClick={() => setIsSyncDialogOpen(true)}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Sincronizar Estructura
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            onClick={async () => {
              toast.info("Recalculando conteos...");
              await recalculateEmployeeCounts();
              toast.success("Conteos actualizados");
            }}
          >
            <Users className="w-3.5 h-3.5 mr-2" />
            Recalcular Conteos
          </Button>
        </div>
      </div>

      {viewMode === "editor" ? (
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Left Sidebar: Tree View */}
          <Card className="w-1/3 min-w-[300px] flex flex-col border-0 shadow-lg bg-white/80 backdrop-blur-sm h-full">
            <div className="p-4 border-b border-slate-100 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Buscar departamento..." 
                  className="pl-9 h-9 bg-slate-50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button size="sm" variant="outline" className="shrink-0 gap-2" onClick={() => handleCreateDept(null)}>
                <Plus className="w-4 h-4 text-indigo-600" />
                <span className="hidden xl:inline">Nuevo</span>
              </Button>
            </div>
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-1">
                {departments
                  .filter(d => !d.parent_id) // Roots
                  .map(dept => (
                    <DeptTreeItem key={dept.id} dept={dept} />
                  ))}
                
                {departments.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    No hay departamentos.<br/>Crea el primero para empezar.
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Right Panel: Details & Positions */}
          <Card className="flex-1 flex flex-col border-0 shadow-lg bg-white/80 backdrop-blur-sm h-full overflow-hidden">
            {selectedDept ? (
              <div className="flex flex-col h-full">
                {/* Header Info */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: selectedDept.color }}>
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">{selectedDept.name}</h3>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <Badge variant="outline" className="bg-white">{selectedDept.code || "N/A"}</Badge>
                          {selectedDept.parent_name && (
                            <>
                              <ArrowRight className="w-3 h-3" />
                              <span>{selectedDept.parent_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleCreateDept(selectedDept.id)}>
                        <Plus className="w-4 h-4 mr-2" /> Nuevo Sub-dept.
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditDept(selectedDept)}>
                        <Edit className="w-4 h-4 mr-2" /> Editar Detalles
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-6 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <UserCircle className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">Responsable:</span>
                      {selectedDept.manager_id 
                        ? <span className="text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded">{employees.find(e => e.id === selectedDept.manager_id)?.nombre}</span>
                        : <span className="text-slate-400 italic">Sin asignar</span>
                      }
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">Puestos:</span>
                      <span>{deptPositions.length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">Empleados Totales:</span>
                      <span className="font-bold text-indigo-600">{selectedDept.total_employee_count || 0}</span>
                      <span className="text-xs text-slate-400">(incl. sub-depts)</span>
                    </div>
                  </div>
                </div>

                {/* Content Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-6 pt-4 border-b bg-white">
                    <TabsList>
                      <TabsTrigger value="positions">Puestos ({deptPositions.length})</TabsTrigger>
                      <TabsTrigger value="employees">Empleados ({deptEmployees.length})</TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Positions Tab */}
                  <TabsContent value="positions" className="flex-1 p-6 overflow-hidden flex flex-col mt-0 data-[state=inactive]:hidden">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-slate-500" />
                        Puestos Definidos
                      </h4>
                      <Button size="sm" onClick={handleCreatePos} className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-2" /> Añadir Puesto
                      </Button>
                    </div>

                    <div className="border rounded-lg bg-white overflow-hidden flex-1 flex flex-col shadow-sm">
                      <div className="grid grid-cols-12 gap-4 p-3 bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <div className="col-span-4">Nombre del Puesto</div>
                        <div className="col-span-2">Nivel</div>
                        <div className="col-span-2 text-center">Headcount</div>
                        <div className="col-span-3">Descripción</div>
                        <div className="col-span-1 text-right">Acciones</div>
                      </div>
                      
                      <ScrollArea className="flex-1">
                        {deptPositions.length > 0 ? (
                          <div className="divide-y divide-slate-100">
                            {deptPositions.map(pos => (
                              <div 
                                key={pos.id} 
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  setDraggedItem({ type: 'pos', id: pos.id, data: pos });
                                  e.dataTransfer.setData('text/plain', pos.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                }}
                                className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-slate-50 transition-colors group cursor-grab active:cursor-grabbing"
                              >
                                <div className="col-span-4 font-medium text-slate-900 flex items-center gap-2">
                                  <GripVertical className="w-4 h-4 text-slate-300 cursor-grab active:cursor-grabbing" />
                                  {pos.name}
                                </div>
                                <div className="col-span-2">
                                  <Badge variant="secondary" className="font-normal text-xs bg-slate-100 text-slate-600">
                                    {pos.level || "Mid"}
                                  </Badge>
                                </div>
                                <div className="col-span-2 text-center">
                                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{pos.max_headcount || 1}</span>
                                </div>
                                <div className="col-span-3 text-sm text-slate-500 truncate" title={pos.description}>
                                  {pos.description || "-"}
                                </div>
                                <div className="col-span-1 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditPos(pos)}>
                                    <Edit className="w-3.5 h-3.5 text-slate-500" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => deletePosMutation.mutate(pos.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm">
                            <Briefcase className="w-8 h-8 mb-2 opacity-20" />
                            <p>No hay puestos definidos en este departamento.</p>
                            <Button variant="link" onClick={handleCreatePos}>Crear el primero</Button>
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </TabsContent>

                  {/* Employees Tab */}
                  <TabsContent value="employees" className="flex-1 p-6 overflow-hidden flex flex-col mt-0 data-[state=inactive]:hidden">
                    <div className="flex justify-between items-center mb-4">
                       <h4 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                          <Users className="w-5 h-5 text-slate-500" />
                          Empleados Asignados
                       </h4>
                       <Button size="sm" onClick={() => { setEmpToEdit(null); setIsEmpDialogOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          <UserCircle className="w-4 h-4 mr-2" /> Asignar Empleado
                       </Button>
                    </div>

                    <div className="border rounded-lg bg-white overflow-hidden flex-1 flex flex-col shadow-sm">
                       <div className="grid grid-cols-12 gap-4 p-3 bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <div className="col-span-4">Nombre</div>
                          <div className="col-span-4">Puesto Actual</div>
                          <div className="col-span-2">Estado</div>
                          <div className="col-span-2 text-right">Acciones</div>
                       </div>
                       <ScrollArea className="flex-1">
                          {deptEmployees.length > 0 ? (
                             <div className="divide-y divide-slate-100">
                                {deptEmployees.map(emp => (
                                   <div key={emp.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-slate-50 transition-colors">
                                      <div className="col-span-4 font-medium text-slate-900">{emp.nombre}</div>
                                      <div className="col-span-4 text-sm text-slate-600">{emp.puesto || "-"}</div>
                                      <div className="col-span-2">
                                         <Badge variant={emp.estado_empleado === "Alta" ? "success" : "secondary"} className="text-xs">
                                            {emp.estado_empleado || "N/A"}
                                         </Badge>
                                      </div>
                                      <div className="col-span-2 flex justify-end">
                                         <Button variant="ghost" size="sm" className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" 
                                            onClick={() => { setEmpToEdit(emp); setIsEmpDialogOpen(true); }}>
                                            <Edit className="w-3.5 h-3.5 mr-1" /> Cambiar
                                         </Button>
                                      </div>
                                   </div>
                                ))}
                             </div>
                          ) : (
                             <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm">
                                <Users className="w-8 h-8 mb-2 opacity-20" />
                                <p>No hay empleados asignados a este departamento.</p>
                                <Button variant="link" onClick={() => setIsEmpDialogOpen(true)}>Asignar ahora</Button>
                             </div>
                          )}
                       </ScrollArea>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="bg-slate-50 p-6 rounded-full mb-4">
                  <Building2 className="w-12 h-12 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-600">Selecciona un departamento</h3>
                <p className="max-w-xs text-center mt-2 text-sm">
                  Haz clic en un departamento de la lista izquierda para ver sus detalles y gestionar sus puestos.
                </p>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <OrganizationalChart 
          data={{ departments, positions, employees }}
          onEdit={handleEditDept}
          onAddChild={handleCreateDept}
          onDelete={(id) => deleteDeptMutation.mutate(id)}
          onMove={(dept) => {
            setDeptToMove(dept);
            setIsMoveDialogOpen(true);
          }}
          onNodeDrop={(draggedId, targetId) => {
             const descendants = getDescendantIds(draggedId, departments);
             if (descendants.has(targetId)) {
                toast.error("No se puede mover un departamento dentro de su descendiente");
                return;
             }
             moveDeptMutation.mutate({ id: draggedId, newParentId: targetId });
          }}
        />
      )}

      {/* Dialogs reused and simplified */}
      <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deptForm.id ? "Editar Departamento" : "Nuevo Departamento"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={deptForm.code} onChange={e => setDeptForm({...deptForm, code: e.target.value})} placeholder="Ej: IT, HR" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Padre</Label>
                <Select value={deptForm.parent_id} onValueChange={val => setDeptForm({...deptForm, parent_id: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Raíz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">-- Raíz --</SelectItem>
                    {departments
                      .filter(d => d.id !== deptForm.id)
                      .map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsable</Label>
                <Select value={deptForm.manager_id} onValueChange={val => setDeptForm({...deptForm, manager_id: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[200px]">
                      {employees.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color Identificativo</Label>
              <div className="flex gap-2 flex-wrap">
                {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'].map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${deptForm.color === color ? 'border-slate-900 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setDeptForm({...deptForm, color})}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeptDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => deptMutation.mutate(deptForm)} disabled={!deptForm.name}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPosDialogOpen} onOpenChange={setIsPosDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{posForm.id ? "Editar Puesto" : "Nuevo Puesto"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nombre del Puesto</Label>
              <Input value={posForm.name} onChange={e => setPosForm({...posForm, name: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Headcount Máximo</Label>
                <Input 
                  type="number" 
                  min="1"
                  value={posForm.max_headcount} 
                  onChange={e => setPosForm({...posForm, max_headcount: parseInt(e.target.value) || 1})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Nivel</Label>
                <Select value={posForm.level} onValueChange={val => setPosForm({...posForm, level: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { val: "Junior", label: "Junior" },
                      { val: "Mid", label: "Intermedio" },
                      { val: "Senior", label: "Senior" },
                      { val: "Lead", label: "Líder de Equipo" },
                      { val: "Manager", label: "Gerente / Manager" },
                      { val: "Director", label: "Director" },
                      { val: "Executive", label: "Ejecutivo" }
                    ].map(opt => (
                      <SelectItem key={opt.val} value={opt.val}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={posForm.description} onChange={e => setPosForm({...posForm, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPosDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => posMutation.mutate(posForm)} disabled={!posForm.name}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Department Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover Departamento</DialogTitle>
            <DialogDescription>
              Mover <strong>{deptToMove?.name}</strong> a un nuevo departamento padre.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="p-3 bg-amber-50 text-amber-800 text-sm rounded-md border border-amber-200">
                <p>Al mover este departamento, todos sus sub-departamentos y puestos se moverán con él.</p>
             </div>
             <div className="space-y-2">
                <Label>Nuevo Departamento Padre</Label>
                <Select onValueChange={(val) => moveDeptMutation.mutate({ id: deptToMove.id, newParentId: val })}>
                  <SelectTrigger>
                     <SelectValue placeholder="Selecciona nuevo padre..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="root" className="font-semibold text-indigo-600">-- Convertir en Departamento Raíz --</SelectItem>
                      {departments
                          .filter(d => d.id !== deptToMove?.id && !invalidMoveTargets.has(d.id)) // Prevent self and descendants
                          .map(d => (
                             <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))
                      }
                  </SelectContent>
                </Select>
             </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Assignment Dialog */}
      <Dialog open={isEmpDialogOpen} onOpenChange={setIsEmpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{empToEdit ? "Cambiar Puesto/Dept" : "Asignar Empleado"}</DialogTitle>
            <DialogDescription>
              Asignar empleado al departamento <strong>{selectedDept?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             {!empToEdit && (
                <div className="space-y-2">
                  <Label>Seleccionar Empleado</Label>
                  <Select onValueChange={(val) => {
                     const emp = employees.find(e => e.id === val);
                     setEmpToEdit(emp);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Buscar empleado..." />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px]">
                        {employees
                          .sort((a,b) => a.nombre.localeCompare(b.nombre))
                          .map(e => (
                          <SelectItem key={e.id} value={e.id}>
                             {e.nombre} 
                             {e.departamento ? ` (${e.departamento})` : ''}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
             )}

             {empToEdit && (
                <div className="p-3 bg-slate-50 rounded border mb-2">
                   <p className="text-sm font-medium">{empToEdit.nombre}</p>
                   <p className="text-xs text-slate-500">
                      Actual: {empToEdit.departamento || "Sin Dept"} - {empToEdit.puesto || "Sin Puesto"}
                   </p>
                </div>
             )}

             <div className="space-y-2">
                <Label>Puesto en {selectedDept?.name}</Label>
                <Select 
                   value={empToEdit?.tempPuesto} 
                   onValueChange={(val) => setEmpToEdit({...empToEdit, tempPuesto: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar puesto..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none_assigned">-- Sin Puesto Específico --</SelectItem>
                    {deptPositions.map(p => (
                       <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsEmpDialogOpen(false)}>Cancelar</Button>
             <Button 
               onClick={() => {
                  if (!empToEdit) return;
                  updateEmployeeMutation.mutate({
                     id: empToEdit.id,
                     departamento: selectedDept.name,
                     puesto: empToEdit.tempPuesto === "none_assigned" ? "" : (empToEdit.tempPuesto || "")
                  });
               }} 
               disabled={!empToEdit}
             >
               Confirmar Asignación
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Dialog */}
      <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-indigo-600" />
              Sincronizar Estructura desde Empleados
            </DialogTitle>
            <DialogDescription>
              Analiza la base de datos de empleados para detectar departamentos y puestos no registrados en la estructura.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden border rounded-md bg-slate-50">
            {analysisResult ? (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-6">
                  {analysisResult.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                      No se encontraron datos de empleados para analizar.
                    </div>
                  ) : (
                    analysisResult.map(dept => (
                      <div key={dept.key} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                        <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {dept.isNew ? (
                              <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600">Nuevo Dept.</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Existente
                              </Badge>
                            )}
                            <span className="font-bold text-slate-800">{dept.name}</span>
                          </div>
                          <Badge variant="secondary">{dept.count} empleados</Badge>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {dept.positions.map(pos => (
                            <div key={pos.key} className="p-3 pl-8 flex justify-between items-center hover:bg-slate-50">
                              <div className="flex items-center gap-2">
                                {pos.isNew ? (
                                  <div className="w-2 h-2 rounded-full bg-amber-400" title="Nuevo Puesto" />
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-green-400" title="Existente" />
                                )}
                                <span className="text-sm text-slate-700">{pos.name}</span>
                              </div>
                              <span className="text-xs text-slate-400 font-mono">{pos.count} emp.</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2">
             <div className="flex-1 text-xs text-slate-500 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Se crearán las entidades marcadas como "Nuevo".
             </div>
             <Button variant="outline" onClick={() => setIsSyncDialogOpen(false)}>Cancelar</Button>
             <Button onClick={performSync} disabled={syncing} className="bg-indigo-600 hover:bg-indigo-700">
               {syncing ? (
                 <>
                   <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Procesando...
                 </>
               ) : (
                 <>
                   <Save className="w-4 h-4 mr-2" /> Generar Estructura
                 </>
               )}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}