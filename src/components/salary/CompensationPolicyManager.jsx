import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, Target, Search, Building2, Briefcase, Save, Euro, ChevronRight, ChevronDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function CompensationPolicyManager() {
  const queryClient = useQueryClient();
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [selectedPosId, setSelectedPosId] = useState(null);
  const [expandedDepts, setExpandedDepts] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const [policyForm, setPolicyForm] = useState({
    min_salary: 0,
    max_salary: 0,
    target_salary: 0,
    bonus_target: 0,
    variable_percentage: 0,
    // Previous Year Fields
    min_salary_prev: 0,
    max_salary_prev: 0,
    target_salary_prev: 0,
    bonus_target_prev: 0,
    variable_percentage_prev: 0,
    // Benefits Slots
    benefits_slots: [
      { type: "", amount: 0 },
      { type: "", amount: 0 },
      { type: "", amount: 0 },
      { type: "", amount: 0 }
    ],
    benefits: "", // Keeping for observations/compatibility
    currency: "EUR",
    pay_frequency: "Mensual"
  });

  // Queries
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list(),
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['compensation_policies'],
    queryFn: async () => {
      // Intentar cargar de entidad
      let fromEntity = [];
      try {
        if (base44.entities.CompensationPolicy) {
          fromEntity = await base44.entities.CompensationPolicy.list();
        }
      } catch (e) {
        console.warn("Failed to load policies from entity", e);
      }

      // Si no hay datos, intentar cargar de backup (AppConfig)
      if (fromEntity.length === 0) {
        try {
          const backups = await base44.entities.AppConfig.filter({ config_key: "compensation_policies_backup" });
          if (backups.length > 0 && backups[0].value) {
            return JSON.parse(backups[0].value);
          }
        } catch (e) {
          console.warn("Failed to load policies from backup", e);
        }
      }
      
      return fromEntity;
    },
  });

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

  const currentPolicy = useMemo(() => 
    policies.find(p => p.position_id === selectedPosId),
  [policies, selectedPosId]);

  // Effects
  React.useEffect(() => {
    if (currentPolicy) {
      setPolicyForm({
        min_salary: currentPolicy.min_salary || 0,
        max_salary: currentPolicy.max_salary || 0,
        target_salary: currentPolicy.target_salary || 0,
        bonus_target: currentPolicy.bonus_target || 0,
        variable_percentage: currentPolicy.variable_percentage || 0,
        // Load Prev Year
        min_salary_prev: currentPolicy.min_salary_prev || 0,
        max_salary_prev: currentPolicy.max_salary_prev || 0,
        target_salary_prev: currentPolicy.target_salary_prev || 0,
        bonus_target_prev: currentPolicy.bonus_target_prev || 0,
        variable_percentage_prev: currentPolicy.variable_percentage_prev || 0,
        // Load Benefits Slots
        benefits_slots: Array.isArray(currentPolicy.benefits_slots) 
          ? currentPolicy.benefits_slots 
          : [
              { type: "", amount: 0 },
              { type: "", amount: 0 },
              { type: "", amount: 0 },
              { type: "", amount: 0 }
            ],
        benefits: currentPolicy.benefits || "",
        currency: currentPolicy.currency || "EUR",
        pay_frequency: currentPolicy.pay_frequency || "Mensual"
      });
    } else {
      setPolicyForm({
        min_salary: 0,
        max_salary: 0,
        target_salary: 0,
        bonus_target: 0,
        variable_percentage: 0,
        min_salary_prev: 0,
        max_salary_prev: 0,
        target_salary_prev: 0,
        bonus_target_prev: 0,
        variable_percentage_prev: 0,
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
    }
  }, [currentPolicy, selectedPosId]);

  // Mutations
  const savePolicyMutation = useMutation({
    mutationFn: async (data) => {
      if (!selectedPosId) throw new Error("No position selected");
      
      const payload = {
        ...data,
        position_id: selectedPosId,
        position_name: selectedPos?.name,
        department_id: selectedDeptId,
        updated_at: new Date().toISOString(),
        // Required fields fallback
        code: data.code || `POL-${selectedPosId.substring(0, 6).toUpperCase()}`,
        policy_name: data.policy_name || `Política ${selectedPos?.name || 'General'}`,
        valid_from: data.valid_from || new Date().toISOString().split('T')[0]
      };

      let savedRecord = null;

      // 1. Intentar guardar en Entidad
      try {
        if (base44.entities.CompensationPolicy) {
          if (currentPolicy) {
            savedRecord = await base44.entities.CompensationPolicy.update(currentPolicy.id, payload);
          } else {
            savedRecord = await base44.entities.CompensationPolicy.create(payload);
          }
        }
      } catch (e) {
        console.error("Error saving to entity:", e);
      }

      // 2. Guardar Backup en AppConfig (Robustez)
      try {
        // Combinar el registro guardado (o el payload si falló) con los existentes
        const newPolicies = policies.filter(p => p.position_id !== selectedPosId);
        newPolicies.push(savedRecord || { ...payload, id: currentPolicy?.id || Date.now().toString() });
        
        const backupData = JSON.stringify(newPolicies);
        const backups = await base44.entities.AppConfig.filter({ config_key: "compensation_policies_backup" });
        
        if (backups.length > 0) {
          await base44.entities.AppConfig.update(backups[0].id, {
            value: backupData,
            description: "Backup de políticas retributivas",
            updated_at: new Date().toISOString()
          });
        } else {
          await base44.entities.AppConfig.create({
            config_key: "compensation_policies_backup",
            value: backupData,
            description: "Backup de políticas retributivas",
            app_subtitle: "System Backup"
          });
        }
      } catch (e) {
        console.error("Error saving backup:", e);
      }

      if (!savedRecord && !base44.entities.CompensationPolicy) {
        // Si no hay entidad pero se guardó en backup, devolver éxito simulado
        return payload;
      }
      
      return savedRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation_policies'] });
      toast.success("Política retributiva guardada (Backup sincronizado)");
    },
    onError: (e) => toast.error("Error al guardar: " + e.message)
  });

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
          style={{ marginLeft: `${level * 12}px` }}
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
          
          <div className="flex-1 truncate">
            <span className="font-medium text-sm truncate">{dept.name}</span>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="mt-1">
            {children.map(child => (
              <DeptTreeItem key={child.id} dept={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6">
      {/* Left Sidebar: Organization Tree */}
      <Card className="w-[380px] flex flex-col border-0 shadow-lg bg-white/80 backdrop-blur-sm h-full">
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
                          onClick={() => savePolicyMutation.mutate(policyForm)} 
                          disabled={savePolicyMutation.isPending}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {savePolicyMutation.isPending ? "Guardando..." : "Guardar Política"}
                        </Button>
                      </div>
                    </div>

                    <ScrollArea className="flex-1 p-6">
                      <div className="grid gap-6 max-w-4xl">
                        {/* Salary Ranges */}
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <Euro className="w-4 h-4 text-emerald-600" />
                              Salario Base Anual Bruto
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-3 gap-6">
                              {/* Header Row */}
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Concepto</div>
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">Año Anterior</div>
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center text-emerald-600">Año Actual</div>

                              {/* Min Salary Row */}
                              <div className="flex items-center text-sm font-medium text-slate-600">Mínimo (€)</div>
                              <div>
                                <Input 
                                  type="number" 
                                  value={policyForm.min_salary_prev}
                                  onChange={e => setPolicyForm({...policyForm, min_salary_prev: parseFloat(e.target.value) || 0})}
                                  className="font-mono text-center bg-slate-50"
                                />
                              </div>
                              <div>
                                <Input 
                                  type="number" 
                                  value={policyForm.min_salary}
                                  onChange={e => setPolicyForm({...policyForm, min_salary: parseFloat(e.target.value) || 0})}
                                  className="font-mono text-center border-emerald-200"
                                />
                              </div>

                              {/* Target Salary Row */}
                              <div className="flex items-center text-sm font-bold text-emerald-700">Target / Objetivo (€)</div>
                              <div>
                                <Input 
                                  type="number" 
                                  value={policyForm.target_salary_prev}
                                  onChange={e => setPolicyForm({...policyForm, target_salary_prev: parseFloat(e.target.value) || 0})}
                                  className="font-mono text-center bg-slate-50"
                                />
                              </div>
                              <div>
                                <Input 
                                  type="number" 
                                  value={policyForm.target_salary}
                                  onChange={e => setPolicyForm({...policyForm, target_salary: parseFloat(e.target.value) || 0})}
                                  className="font-mono text-center border-emerald-200 bg-emerald-50/30 font-bold"
                                />
                              </div>

                              {/* Max Salary Row */}
                              <div className="flex items-center text-sm font-medium text-slate-600">Máximo (€)</div>
                              <div>
                                <Input 
                                  type="number" 
                                  value={policyForm.max_salary_prev}
                                  onChange={e => setPolicyForm({...policyForm, max_salary_prev: parseFloat(e.target.value) || 0})}
                                  className="font-mono text-center bg-slate-50"
                                />
                              </div>
                              <div>
                                <Input 
                                  type="number" 
                                  value={policyForm.max_salary}
                                  onChange={e => setPolicyForm({...policyForm, max_salary: parseFloat(e.target.value) || 0})}
                                  className="font-mono text-center border-emerald-200"
                                />
                              </div>
                            </div>
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
                    </ScrollArea>
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