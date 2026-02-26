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
    benefits: "",
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
    queryKey: ['position_compensation_policies'],
    queryFn: async () => {
      // Safety check for entity existence
      if (!base44.entities.PositionCompensationPolicy) {
        console.warn("Entity PositionCompensationPolicy not found in SDK");
        return [];
      }
      return base44.entities.PositionCompensationPolicy.list();
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
        benefits: "",
        currency: "EUR",
        pay_frequency: "Mensual"
      });
    }
  }, [currentPolicy, selectedPosId]);

  // Mutations
  const savePolicyMutation = useMutation({
    mutationFn: async (data) => {
      if (!base44.entities.PositionCompensationPolicy) {
        throw new Error("La entidad PositionCompensationPolicy no está definida en el sistema");
      }
      if (!selectedPosId) throw new Error("No position selected");
      
      const payload = {
        ...data,
        position_id: selectedPosId,
        position_name: selectedPos?.name,
        department_id: selectedDeptId,
        updated_at: new Date().toISOString()
      };

      if (currentPolicy) {
        return base44.entities.PositionCompensationPolicy.update(currentPolicy.id, payload);
      }
      return base44.entities.PositionCompensationPolicy.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['position_compensation_policies'] });
      toast.success("Política retributiva guardada");
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
    <div className="flex h-[calc(100vh-200px)] gap-6">
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
                      <div className="grid gap-6 max-w-3xl">
                        {/* Salary Ranges */}
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <Euro className="w-4 h-4 text-emerald-600" />
                              Salario Base Anual Bruto
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-500">Mínimo (€)</Label>
                              <Input 
                                type="number" 
                                value={policyForm.min_salary}
                                onChange={e => setPolicyForm({...policyForm, min_salary: parseFloat(e.target.value) || 0})}
                                className="font-mono"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-500 font-bold text-emerald-700">Target / Objetivo (€)</Label>
                              <Input 
                                type="number" 
                                value={policyForm.target_salary}
                                onChange={e => setPolicyForm({...policyForm, target_salary: parseFloat(e.target.value) || 0})}
                                className="font-mono border-emerald-200 bg-emerald-50/30"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-500">Máximo (€)</Label>
                              <Input 
                                type="number" 
                                value={policyForm.max_salary}
                                onChange={e => setPolicyForm({...policyForm, max_salary: parseFloat(e.target.value) || 0})}
                                className="font-mono"
                              />
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
                          <CardContent className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-500">Bonus Objetivo Anual (€)</Label>
                              <Input 
                                type="number" 
                                value={policyForm.bonus_target}
                                onChange={e => setPolicyForm({...policyForm, bonus_target: parseFloat(e.target.value) || 0})}
                                className="font-mono"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-500">% Variable sobre Fijo</Label>
                              <div className="relative">
                                <Input 
                                  type="number" 
                                  value={policyForm.variable_percentage}
                                  onChange={e => setPolicyForm({...policyForm, variable_percentage: parseFloat(e.target.value) || 0})}
                                  className="font-mono pr-8"
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
                          <CardContent>
                            <Textarea 
                              value={policyForm.benefits}
                              onChange={e => setPolicyForm({...policyForm, benefits: e.target.value})}
                              placeholder="Seguro médico, coche de empresa, tickets restaurante, teletrabajo..."
                              className="min-h-[100px]"
                            />
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