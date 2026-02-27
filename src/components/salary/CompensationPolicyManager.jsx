import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, Target, Search, Building2, Briefcase, Save, Euro, ChevronRight, ChevronDown, Users } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useSalaryData } from "./SalaryProvider";

export default function CompensationPolicyManager() {
  const { 
    policies, 
    loadingPolicies, 
    savePolicy, 
    isSavingPolicy,
    getPolicyByPosition,
    getSalaryCategoriesForPosition,
    globalConfig
  } = useSalaryData();

  const payCount = globalConfig?.annual_pay_count || 14;

  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [selectedPosId, setSelectedPosId] = useState(null);
  const [expandedDepts, setExpandedDepts] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const positionCategories = useMemo(() => {
    return getSalaryCategoriesForPosition(selectedPosId);
  }, [selectedPosId, getSalaryCategoriesForPosition]);

  const [policyForm, setPolicyForm] = useState({
    // REPLACED: min/max/target with category_ranges
    category_ranges: {}, // { [categoryId]: { current: 0, prev: 0 } }
    
    bonus_target: 0,
    variable_percentage: 0,
    // Previous Year Fields (Variables)
    bonus_target_prev: 0,
    variable_percentage_prev: 0,
    // Benefits Slots
    benefits_slots: [
      { type: "", amount: 0 },
      { type: "", amount: 0 },
      { type: "", amount: 0 },
      { type: "", amount: 0 }
    ],
    benefits: "", 
    currency: "EUR",
    pay_frequency: "Mensual"
  });

  // State for chart logic
  const [localOrder, setLocalOrder] = useState(new Map());

  // Queries
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const all = await base44.entities.EmployeeMasterDatabase.list('nombre');
      // Solo mostrar empleados activos (permitir 'ALTA' o 'ACTIVO')
      const isActive = (s) => {
        const v = (s || "").toString().trim().toUpperCase();
        return v === "ALTA" || v === "ACTIVO";
      };
      return all.filter(emp => isActive(emp.estado_empleado));
    },
  });

  // Effect to set local order
  useEffect(() => {
    const m = new Map();
    departments.forEach(d => {
      const val = Number.isFinite(d.orden) ? d.orden : (d.orden ? Number(d.orden) : undefined);
      if (val !== undefined) m.set(d.id, val);
    });
    setLocalOrder(m);
  }, [departments]);

  // Effect to expand all departments by default
  useEffect(() => {
    if (departments.length > 0 && expandedDepts.size === 0) {
      const allIds = departments.map(d => d.id);
      setExpandedDepts(new Set(allIds));
    }
  }, [departments]);

  const { data: positions = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list(),
  });



  // Derived State: Employee Counts
  const employeeCountByDept = useMemo(() => {
    const map = new Map();
    departments.forEach(dept => {
      const normalizedDeptName = (dept.name || "").trim().toUpperCase();
      let deptEmps;

      if (normalizedDeptName === "PRODUCCIÓN T1" || normalizedDeptName === "PRODUCCIÓN T1.1") {
        deptEmps = employees.filter(e => {
          const empDept = (e.departamento || "").trim().toUpperCase();
          return empDept === "PRODUCCIÓN" && e.team_key === "team_1";
        });
      } else if (normalizedDeptName === "PRODUCCIÓN T2" || normalizedDeptName === "PRODUCCIÓN T2.2") {
        deptEmps = employees.filter(e => {
          const empDept = (e.departamento || "").trim().toUpperCase();
          return empDept === "PRODUCCIÓN" && e.team_key === "team_2";
        });
      } else {
        deptEmps = employees.filter(e => (e.departamento || "").trim().toUpperCase() === normalizedDeptName);
      }

      map.set(dept.id, deptEmps.length);
    });
    return map;
  }, [departments, employees]);

  // Derived State
  const selectedDept = useMemo(() => 
    departments.find(d => d.id === selectedDeptId), 
  [departments, selectedDeptId]);

  const deptPositions = useMemo(() => 
    positions.filter(p => p.department_id === selectedDeptId).sort((a, b) => (a.orden || 0) - (b.orden || 0)),
  [positions, selectedDeptId]);

  const selectedPos = useMemo(() => 
    positions.find(p => p.id === selectedPosId),
  [positions, selectedPosId]);

  const currentPolicy = useMemo(() => {
    if (!selectedPosId) return undefined;
    return getPolicyByPosition(selectedPosId);
  }, [selectedPosId, getPolicyByPosition]);

  // Effects
  React.useEffect(() => {
    if (currentPolicy) {
      // Unpack Salary Ranges
      let loadedRanges = {
        category_ranges: {}, 
        bonus_target: 0, variable_percentage: 0,
        bonus_target_prev: 0, variable_percentage_prev: 0
      };

      if (currentPolicy.salary_ranges) {
        // Already parsed by Provider, but check just in case
        const ranges = typeof currentPolicy.salary_ranges === 'string' 
          ? JSON.parse(currentPolicy.salary_ranges) 
          : currentPolicy.salary_ranges;

        loadedRanges.category_ranges = ranges.category_ranges || {};
        loadedRanges.bonus_target = ranges.bonus_target || 0;
        loadedRanges.variable_percentage = ranges.variable_percentage || 0;
        // Check legacy fields in range object
        loadedRanges.bonus_target_prev = ranges.bonus_target_prev || 0;
        loadedRanges.variable_percentage_prev = ranges.variable_percentage_prev || 0;
      }

      // Unpack Benefits
      let loadedBenefitsSlots = [
        { type: "", amount: 0 }, { type: "", amount: 0 },
        { type: "", amount: 0 }, { type: "", amount: 0 }
      ];
      let loadedBenefitsText = "";

      if (currentPolicy.notes) {
        const notes = typeof currentPolicy.notes === 'string'
          ? JSON.parse(currentPolicy.notes)
          : currentPolicy.notes;

        if (notes.benefits_slots && Array.isArray(notes.benefits_slots)) {
          loadedBenefitsSlots = [
            ...notes.benefits_slots,
            ...Array(Math.max(0, 4 - notes.benefits_slots.length)).fill(null).map(() => ({ type: "", amount: 0 }))
          ].slice(0, 4);
        }
        if (notes.benefits_text) loadedBenefitsText = notes.benefits_text;
      } else if (currentPolicy.benefits) {
         // Legacy fallback
         loadedBenefitsText = currentPolicy.benefits;
      }

      setPolicyForm({
        ...loadedRanges,
        benefits_slots: loadedBenefitsSlots,
        benefits: loadedBenefitsText,
        currency: currentPolicy.currency || "EUR",
        pay_frequency: currentPolicy.pay_frequency || "Mensual"
      });
    } else {
      // Reset form
      setPolicyForm({
        category_ranges: {},
        bonus_target: 0, variable_percentage: 0,
        bonus_target_prev: 0, variable_percentage_prev: 0,
        benefits_slots: [
          { type: "", amount: 0 }, { type: "", amount: 0 },
          { type: "", amount: 0 }, { type: "", amount: 0 }
        ],
        benefits: "",
        currency: "EUR",
        pay_frequency: "Mensual"
      });
    }
  }, [currentPolicy, selectedPosId]);

  const handleSave = () => {
    if (!selectedPosId) return;

    // We don't need to stringify here anymore, the mutation handles packing
    // Just pass the raw objects
    savePolicy({
      ...policyForm,
      _native_id: currentPolicy?._native_id, // Use native ID
      code: currentPolicy?.code || `POL-${selectedPosId.substring(0,6).toUpperCase()}`,
      position_id: selectedPosId,
      position_name: selectedPos?.name,
      department_id: selectedDeptId,
      // Pass raw data for packing in mutation
      category_ranges: policyForm.category_ranges,
      benefits_slots: policyForm.benefits_slots,
      benefits_text: policyForm.benefits
    });
  };

  // Tree Logic
  const toggleExpand = (deptId) => {
    const newSet = new Set(expandedDepts);
    if (newSet.has(deptId)) {
      newSet.delete(deptId);
    } else {
      newSet.add(deptId);
    }
    setExpandedDepts(newSet);
  };

  const DeptTreeItem = ({ dept, level = 0 }) => {
    const children = departments.filter(d => d.parent_id === dept.id);
    const hasChildren = children.length > 0;
    
    // Search logic
    const matchesSearch = (d) => (d.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const hasMatchingDescendant = (d) => {
      const directChildren = departments.filter(child => child.parent_id === d.id);
      return directChildren.some(child => matchesSearch(child) || hasMatchingDescendant(child));
    };

    const isMatch = matchesSearch(dept);
    const hasMatchingChildrenRes = hasMatchingDescendant(dept);
    
    if (searchTerm && !isMatch && !hasMatchingChildrenRes) {
      return null;
    }

    const isExpanded = expandedDepts.has(dept.id) || (searchTerm && hasMatchingChildrenRes);
    const isSelected = selectedDeptId === dept.id;
    const employeeCount = employeeCountByDept.get(dept.id) ?? 0;

    return (
      <div className="select-none">
        <div 
          className={`
            flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer transition-all group
            ${isSelected ? "bg-indigo-50 text-indigo-900 border-indigo-200" : "hover:bg-slate-50 text-slate-700 border-transparent"}
            border
          `}
          onClick={() => {
            setSelectedDeptId(dept.id);
            setSelectedPosId(null);
          }}
        >
          <div 
            className="p-1 rounded-sm hover:bg-slate-200 text-slate-400"
            onClick={(e) => { e.stopPropagation(); toggleExpand(dept.id); }}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : <div className="w-4 h-4" />}
          </div>
          
          <div className="w-2 h-2 rounded-full mr-1 shrink-0" style={{ backgroundColor: dept.color || '#ccc' }}></div>
          
          <div className="flex-1 truncate flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-sm truncate">{dept.name}</span>
              {dept.code && (
                <span className="ml-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  {dept.code}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 text-xs text-slate-500">
              <Users className="w-3 h-3 text-slate-400" />
              <span>{employeeCount}</span>
            </div>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="mt-1 ml-3 pl-3 border-l border-slate-200">
            {children
              .sort((a, b) => {
                 const ao = localOrder.get(a.id) ?? (a.orden || 0);
                 const bo = localOrder.get(b.id) ?? (b.orden || 0);
                 if (ao !== bo) return ao - bo;
                 return (a.name || "").localeCompare(b.name || "");
              })
              .map(child => (
              <DeptTreeItem key={child.id} dept={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[125vh] gap-6">
      {/* Left Sidebar: Organization Tree */}
      <Card className="w-[480px] flex flex-col border-0 shadow-lg bg-white/80 backdrop-blur-sm h-full shrink-0">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar departamento..." 
              className="pl-9 h-9 bg-slate-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-1">
            {departments
                  .filter(d => !d.parent_id)
                  .sort((a, b) => {
                    const ao = localOrder.get(a.id) ?? (a.orden || 0);
                    const bo = localOrder.get(b.id) ?? (b.orden || 0);
                    if (ao !== bo) return ao - bo;
                    return (a.name || "").localeCompare(b.name || "");
                  })
                  .map(dept => (
                    <DeptTreeItem key={dept.id} dept={dept} />
                  ))}
            
            {departments.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm">
                No hay estructura organizativa definida.
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Right Panel: Content */}
      <Card className="flex-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm h-full flex flex-col">
        {selectedDept ? (
          <>
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: selectedDept.color || '#3b82f6' }}>
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedDept.name}</h3>
                  <p className="text-xs text-slate-500">Gestión de Política Retributiva</p>
                </div>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Positions List */}
              <div className="w-1/3 border-r border-slate-100 flex flex-col bg-white">
                <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Puestos ({deptPositions.length})</h4>
                </div>
                <ScrollArea className="flex-1">
                  {deptPositions.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                      {deptPositions.map(pos => {
                        const hasPolicy = policies.some(p => p.position_id === pos.id);
                        return (
                          <div 
                            key={pos.id}
                            className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between ${selectedPosId === pos.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
                            onClick={() => setSelectedPosId(pos.id)}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-sm text-slate-700">{pos.name}</span>
                              <span className="text-[10px] text-slate-400">{pos.level || 'Nivel N/A'}</span>
                            </div>
                            {hasPolicy && <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">Definido</Badge>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      No hay puestos en este departamento
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Policy Editor */}
              <div className="flex-1 flex flex-col bg-slate-50/30">
                {selectedPos ? (
                  <div className="flex-1 flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-xl font-bold text-slate-800">{selectedPos.name}</h2>
                          <p className="text-sm text-slate-500 mt-1">Definición de rangos salariales y beneficios</p>
                        </div>
                        <Button 
                          onClick={handleSave} 
                          disabled={isSavingPolicy}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {isSavingPolicy ? "Guardando..." : "Guardar Política"}
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 pb-32">
                      <div className="grid gap-6 max-w-4xl">
                        {/* Salary Categories */}
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <Euro className="w-4 h-4 text-emerald-600" />
                              Bandas Salariales por Categoría
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {positionCategories.length > 0 ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                  <div className="col-span-4">Categoría Profesional</div>
                                  <div className="col-span-4 text-center">Año Anterior ({payCount} pagas)</div>
                                  <div className="col-span-4 text-center text-emerald-600">Año Actual ({payCount} pagas)</div>
                                </div>
                                <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">
                                  <div className="col-span-4"></div>
                                  <div className="col-span-2 text-center">Mensual</div>
                                  <div className="col-span-2 text-center">Anual</div>
                                  <div className="col-span-2 text-center text-emerald-600">Mensual</div>
                                  <div className="col-span-2 text-center text-emerald-600">Anual</div>
                                </div>

                                {positionCategories.map(cat => {
                                  const range = policyForm.category_ranges?.[cat.id] || { current: 0, prev: 0 };
                                  
                                  // Helpers for monthly values
                                  const monthlyPrev = range.prev ? (range.prev / payCount).toFixed(2) : "";
                                  const monthlyCurrent = range.current ? (range.current / payCount).toFixed(2) : "";

                                  return (
                                    <div key={cat.id} className="grid grid-cols-12 gap-4 items-center hover:bg-slate-50 p-2 rounded-lg transition-colors">
                                      <div className="col-span-4 text-sm font-medium text-slate-700 truncate" title={cat.name}>
                                        {cat.name}
                                        <div className="text-[10px] text-slate-400 font-normal">{cat.code}</div>
                                      </div>
                                      
                                      {/* Previous Year */}
                                      <div className="col-span-2">
                                        <Input 
                                          type="number" 
                                          placeholder="0.00"
                                          defaultValue={monthlyPrev}
                                          key={`prev-m-${cat.id}-${monthlyPrev}`} // Key forces re-render on external update
                                          onBlur={e => {
                                            const val = parseFloat(e.target.value) || 0;
                                            const annual = val * payCount;
                                            setPolicyForm(prev => ({
                                              ...prev,
                                              category_ranges: {
                                                ...(prev.category_ranges || {}),
                                                [cat.id]: { ...range, prev: annual }
                                              }
                                            }));
                                          }}
                                          className="font-mono text-center bg-slate-50 h-8 text-xs"
                                        />
                                      </div>
                                      <div className="col-span-2">
                                        <Input 
                                          type="number" 
                                          value={range.prev || ""}
                                          readOnly
                                          className="font-mono text-center bg-slate-100 h-8 text-xs text-slate-500"
                                          placeholder="0.00"
                                        />
                                      </div>

                                      {/* Current Year */}
                                      <div className="col-span-2">
                                        <Input 
                                          type="number" 
                                          placeholder="0.00"
                                          defaultValue={monthlyCurrent}
                                          key={`curr-m-${cat.id}-${monthlyCurrent}`}
                                          onBlur={e => {
                                            const val = parseFloat(e.target.value) || 0;
                                            const annual = val * payCount;
                                            setPolicyForm(prev => ({
                                              ...prev,
                                              category_ranges: {
                                                ...(prev.category_ranges || {}),
                                                [cat.id]: { ...range, current: annual }
                                              }
                                            }));
                                          }}
                                          className="font-mono text-center border-emerald-200 bg-emerald-50/30 font-bold h-8 text-xs"
                                        />
                                      </div>
                                      <div className="col-span-2 relative">
                                        <Input 
                                          type="number" 
                                          value={range.current || ""}
                                          readOnly
                                          className="font-mono text-center bg-emerald-50/50 h-8 text-xs font-semibold text-emerald-700"
                                          placeholder={cat.salary_range?.target ? cat.salary_range.target.toString() : "0.00"}
                                        />
                                         {cat.salary_range?.target > 0 && (
                                            <div className="absolute -bottom-4 left-0 w-full text-[9px] text-slate-400 text-center truncate">
                                              Target: {cat.salary_range.target}€
                                            </div>
                                         )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-slate-400 text-sm">
                                No hay categorías configuradas para este puesto. 
                                <br/>Ve a "Categorías Profesionales" para crearlas.
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Variable & Bonus */}
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-amber-600" />
                              Retribución Variable
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-3 gap-6">
                               {/* Header Row */}
                               <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Concepto</div>
                               <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">Año Anterior</div>
                               <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center text-amber-600">Año Actual</div>

                               {/* Bonus Target Row */}
                               <div className="flex items-center text-sm font-medium text-slate-600">Bonus Objetivo Anual (€)</div>
                               <div>
                                <Input 
                                  type="number" 
                                  value={policyForm.bonus_target_prev}
                                  onChange={e => setPolicyForm({...policyForm, bonus_target_prev: parseFloat(e.target.value) || 0})}
                                  className="font-mono text-center bg-slate-50"
                                />
                               </div>
                               <div>
                                <Input 
                                  type="number" 
                                  value={policyForm.bonus_target}
                                  onChange={e => setPolicyForm({...policyForm, bonus_target: parseFloat(e.target.value) || 0})}
                                  className="font-mono text-center border-amber-200"
                                />
                               </div>

                               {/* Variable Percentage Row */}
                               <div className="flex items-center text-sm font-medium text-slate-600">% Variable sobre Fijo</div>
                               <div className="relative">
                                <Input 
                                  type="number" 
                                  value={policyForm.variable_percentage_prev}
                                  onChange={e => setPolicyForm({...policyForm, variable_percentage_prev: parseFloat(e.target.value) || 0})}
                                  className="font-mono text-center bg-slate-50 pr-8"
                                />
                                <span className="absolute right-3 top-2.5 text-slate-400 text-xs">%</span>
                               </div>
                               <div className="relative">
                                <Input 
                                  type="number" 
                                  value={policyForm.variable_percentage}
                                  onChange={e => setPolicyForm({...policyForm, variable_percentage: parseFloat(e.target.value) || 0})}
                                  className="font-mono text-center border-amber-200 pr-8"
                                />
                                <span className="absolute right-3 top-2.5 text-slate-400 text-xs">%</span>
                               </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Benefits */}
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <Target className="w-4 h-4 text-purple-600" />
                              Beneficios Sociales y Observaciones
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Configuración de Beneficios (4 Slots)</Label>
                              <div className="grid gap-3">
                                {policyForm.benefits_slots.map((slot, index) => (
                                  <div key={index} className="grid grid-cols-12 gap-3 items-center">
                                    <div className="col-span-1 text-xs font-mono text-slate-400 pt-2 text-center">#{index + 1}</div>
                                    <div className="col-span-7">
                                      <Label className="text-[10px] text-slate-400 mb-1 block">Tipo de Beneficio</Label>
                                      <Input 
                                        placeholder="Ej. Seguro Médico, Ticket Restaurante..."
                                        value={slot.type}
                                        onChange={e => {
                                          const newSlots = [...policyForm.benefits_slots];
                                          newSlots[index] = { ...newSlots[index], type: e.target.value };
                                          setPolicyForm({ ...policyForm, benefits_slots: newSlots });
                                        }}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div className="col-span-4">
                                      <Label className="text-[10px] text-slate-400 mb-1 block">Importe Anual (€)</Label>
                                      <Input 
                                        type="number"
                                        placeholder="0.00"
                                        value={slot.amount}
                                        onChange={e => {
                                          const newSlots = [...policyForm.benefits_slots];
                                          newSlots[index] = { ...newSlots[index], amount: parseFloat(e.target.value) || 0 };
                                          setPolicyForm({ ...policyForm, benefits_slots: newSlots });
                                        }}
                                        className="h-8 text-sm font-mono text-right"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observaciones Adicionales</Label>
                              <Textarea 
                                value={policyForm.benefits}
                                onChange={e => setPolicyForm({...policyForm, benefits: e.target.value})}
                                placeholder="Notas adicionales sobre la política retributiva..."
                                className="min-h-[80px] text-sm"
                              />
                            </div>
                          </CardContent>
                        </Card>
                        </div>
                      </div>
                    </div>
                  ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Briefcase className="w-12 h-12 mb-4 opacity-20" />
                    <p>Selecciona un puesto para definir su política retributiva</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Building2 className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium text-slate-600">Selecciona un departamento</p>
            <p className="text-sm mt-2">Navega por el árbol de la izquierda para comenzar</p>
          </div>
        )}
      </Card>
    </div>
  );
}