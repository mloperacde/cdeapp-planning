import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, Edit, Trash2, Award, TrendingUp, ArrowUp, ArrowDown, 
  ChevronRight, ChevronDown, Building2, User, Search, Save, AlertTriangle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- PERSISTENCE HELPERS (Virtual Table Strategy) ---
const fetchStoreCategories = async () => {
  try {
    const store = await base44.entities.AppConfig.filter({ config_key: "salary_categories_store" });
    const record = store[0];
    if (!record) return [];
    let raw = record.value || record.description || record.app_subtitle || "[]";
    if (typeof raw === "string") {
      try { return JSON.parse(raw) || []; } catch { return []; }
    }
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

const writeStoreCategories = async (arr) => {
  try {
    const serialized = JSON.stringify(arr);
    const store = await base44.entities.AppConfig.filter({ config_key: "salary_categories_store" });
    const record = store[0];
    const payloadCfg = {
      config_key: "salary_categories_store",
      value: serialized,
      description: serialized,
      app_subtitle: serialized
    };
    if (record?.id) {
      await base44.entities.AppConfig.update(record.id, payloadCfg);
    } else {
      await base44.entities.AppConfig.create(payloadCfg);
    }
  } catch (e) {
    console.error("Backup persistence failed", e);
  }
};

export default function SalaryCategoryManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  // Selection State
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [expandedDepts, setExpandedDepts] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    level: 1,
    description: "",
    salary_range: { min: 0, max: 0, target: 0 },
    required_experience_years: 0,
    is_active: true,
    order: 0,
    position_id: null
  });

  // --- DATA FETCHING ---
  
  // 1. Departments & Positions for the Tree
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list(),
  });

  // 2. Categories (Hybrid: DB + Store)
  const { data: categories = [], isLoading: loadingCategories, refetch: refetchCategories } = useQuery({
    queryKey: ['salaryCategoriesAll'],
    queryFn: async () => {
      let db = [];
      let store = [];
      
      // Attempt DB Fetch
      try {
        db = await base44.entities.SalaryCategory.list('level');
      } catch (e) {
        console.warn("DB Fetch failed, using store only", e);
      }

      // Always fetch Store Backup
      store = await fetchStoreCategories();

      // Merge Strategy: Store wins if newer or DB missing
      const categoryMap = new Map();
      
      // Populate with DB first
      db.forEach(c => categoryMap.set(c.id, { ...c, source: 'db' }));

      // Overlay Store data (Virtual Table)
      store.forEach(c => {
        // If it exists in DB, merge properties, but prefer Store for dynamic fields that might be stripped
        if (categoryMap.has(c.id)) {
          const existing = categoryMap.get(c.id);
          categoryMap.set(c.id, { ...existing, ...c, source: 'merged' });
        } else {
          categoryMap.set(c.id, { ...c, source: 'store' });
        }
      });

      return Array.from(categoryMap.values());
    },
  });

  // --- TREE VIEW LOGIC ---
  const treeData = useMemo(() => {
    const deptMap = new Map();
    
    // Initialize Departments
    departments.forEach(d => {
      deptMap.set(d.id, { ...d, positions: [] });
    });

    // Assign Positions to Departments
    positions.forEach(p => {
      if (p.department_id && deptMap.has(p.department_id)) {
        deptMap.get(p.department_id).positions.push(p);
      } else {
        // Handle orphan positions or unknown depts if needed
      }
    });

    // Convert to array and filter by search
    return Array.from(deptMap.values())
      .filter(d => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const deptMatch = d.name.toLowerCase().includes(term);
        const posMatch = d.positions.some(p => p.name.toLowerCase().includes(term));
        return deptMatch || posMatch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [departments, positions, searchTerm]);

  // Toggle Department Expansion
  const toggleDept = (deptId) => {
    setExpandedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  // Auto-expand if searching
  useEffect(() => {
    if (searchTerm) {
      const allIds = {};
      treeData.forEach(d => allIds[d.id] = true);
      setExpandedDepts(allIds);
    }
  }, [searchTerm, treeData]);

  // --- FILTERED CATEGORIES FOR SELECTED POSITION ---
  const positionCategories = useMemo(() => {
    if (!selectedPosition) return [];
    return categories
      .filter(c => {
         // Check if position ID is in applicable_positions array OR matches legacy position_id
         const inArray = Array.isArray(c.applicable_positions) && c.applicable_positions.includes(selectedPosition.id);
         const isLegacyMatch = c.position_id === selectedPosition.id;
         return inArray || isLegacyMatch;
      })
      .sort((a, b) => (a.level || 0) - (b.level || 0) || (a.order || 0) - (b.order || 0));
  }, [categories, selectedPosition]);


  // --- MUTATIONS ---
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (!selectedPosition) throw new Error("No position selected");
      
      const payload = {
        ...data,
        // Use applicable_positions array instead of single ID
        applicable_positions: [selectedPosition.id],
        // Also save denormalized names for easier debugging/display if relational fetch fails
        position_name: selectedPosition.name, 
        updated_at: new Date().toISOString()
      };

      let savedRecord = null;
      
      // 1. Try DB Save
      try {
        if (editingCategory?.id) {
          await base44.entities.SalaryCategory.update(editingCategory.id, payload);
          savedRecord = { ...payload, id: editingCategory.id };
        } else {
          const res = await base44.entities.SalaryCategory.create(payload);
          savedRecord = { ...payload, id: res.id };
        }
      } catch (e) {
        console.error("DB Save failed, falling back to virtual ID", e);
        // Fallback: Generate a virtual ID if DB fails
        savedRecord = { ...payload, id: editingCategory?.id || `virt_${Date.now()}` };
      }

      // 2. Update Backup Store (Virtual Table)
      const currentStore = await fetchStoreCategories();
      const otherCategories = currentStore.filter(c => c.id !== savedRecord.id);
      await writeStoreCategories([...otherCategories, savedRecord]);

      return savedRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['salaryCategoriesAll']);
      toast.success(editingCategory ? "Categoría actualizada" : "Categoría creada");
      setIsDialogOpen(false);
      setEditingCategory(null);
    },
    onError: () => {
      toast.error("Error al guardar. Se intentará usar persistencia local.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // 1. Try DB Delete
      try {
        await base44.entities.SalaryCategory.delete(id);
      } catch (e) {
        console.warn("DB Delete failed", e);
      }

      // 2. Update Backup Store
      const currentStore = await fetchStoreCategories();
      const newStore = currentStore.filter(c => c.id !== id);
      await writeStoreCategories(newStore);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['salaryCategoriesAll']);
      toast.success("Categoría eliminada");
    }
  });

  // --- HANDLERS ---
  const handleOpenDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        ...category,
        salary_range: category.salary_range || { min: 0, max: 0, target: 0 }
      });
    } else {
      setEditingCategory(null);
      // Auto-increment level based on existing
      const nextLevel = positionCategories.length > 0 
        ? Math.max(...positionCategories.map(c => c.level || 0)) + 1 
        : 1;

      setFormData({
        name: "",
        code: `${selectedPosition.name.substring(0, 3).toUpperCase()}-L${nextLevel}`,
        level: nextLevel,
        description: "",
        salary_range: { min: 0, max: 0, target: 0 },
        required_experience_years: 0,
        is_active: true,
        order: positionCategories.length,
        position_id: selectedPosition.id
      });
    }
    setIsDialogOpen(true);
  };

  const getLevelColor = (level) => {
    const colors = [
      "bg-slate-100 text-slate-700",
      "bg-blue-100 text-blue-700",
      "bg-indigo-100 text-indigo-700",
      "bg-purple-100 text-purple-700",
      "bg-pink-100 text-pink-700"
    ];
    return colors[(level - 1) % colors.length] || colors[0];
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-4 p-2">
      
      {/* LEFT PANEL: Department/Position Tree */}
      <Card className="w-full md:w-1/3 flex flex-col h-full">
        <CardHeader className="py-3 px-4 border-b bg-slate-50">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            Estructura Organizativa
          </CardTitle>
          <div className="pt-2">
            <div className="relative">
              <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-slate-400" />
              <Input 
                placeholder="Buscar puesto..." 
                className="h-8 pl-8 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {treeData.map(dept => (
                <div key={dept.id} className="select-none">
                  {/* Department Node */}
                  <div 
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-slate-100 transition-colors",
                      expandedDepts[dept.id] && "bg-slate-50"
                    )}
                    onClick={() => toggleDept(dept.id)}
                  >
                    {expandedDepts[dept.id] ? (
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    )}
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-sm font-medium text-slate-700 truncate">{dept.name}</span>
                    <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5">
                      {dept.positions.length}
                    </Badge>
                  </div>

                  {/* Positions List */}
                  {expandedDepts[dept.id] && (
                    <div className="ml-6 border-l border-slate-200 pl-2 mt-1 space-y-0.5">
                      {dept.positions.map(pos => (
                        <div
                          key={pos.id}
                          onClick={() => setSelectedPosition(pos)}
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-all text-sm",
                            selectedPosition?.id === pos.id 
                              ? "bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100" 
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <User className="w-3 h-3 opacity-70" />
                          <span className="truncate">{pos.name}</span>
                          {/* Count categories for this position */}
                          {(() => {
                            const count = categories.filter(c => c.position_id === pos.id).length;
                            return count > 0 && (
                              <span className="ml-auto text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded-full">
                                {count}
                              </span>
                            );
                          })()}
                        </div>
                      ))}
                      {dept.positions.length === 0 && (
                        <div className="text-xs text-slate-400 p-2 italic">Sin puestos definidos</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {treeData.length === 0 && (
                <div className="p-4 text-center text-sm text-slate-500">
                  No se encontraron departamentos
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* RIGHT PANEL: Categories List */}
      <Card className="w-full md:w-2/3 flex flex-col h-full border-l-4 border-l-blue-500/20">
        <CardHeader className="py-4 px-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                {selectedPosition ? (
                  <>
                    <User className="w-5 h-5 text-blue-600" />
                    {selectedPosition.name}
                  </>
                ) : (
                  <>
                    <Award className="w-5 h-5 text-slate-400" />
                    Categorías Profesionales
                  </>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {selectedPosition 
                  ? `Gestiona los niveles salariales para ${selectedPosition.name}`
                  : "Selecciona un puesto de la lista para ver sus categorías"
                }
              </CardDescription>
            </div>
            
            {selectedPosition && (
              <Button onClick={() => handleOpenDialog()} className="gap-2 shadow-sm">
                <Plus className="w-4 h-4" />
                Nueva Categoría
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 bg-slate-50/50">
          {!selectedPosition ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
              <Building2 className="w-16 h-16 mb-4 opacity-10" />
              <p className="text-lg font-medium">Selecciona un puesto</p>
              <p className="text-sm max-w-xs text-center mt-2">
                Navega por la estructura organizativa a la izquierda y selecciona un puesto para configurar sus bandas salariales.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full p-4">
              <div className="space-y-4 max-w-4xl mx-auto">
                {positionCategories.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <h3 className="text-lg font-medium text-slate-900">Sin categorías definidas</h3>
                    <p className="text-slate-500 mb-6">No hay niveles salariales configurados para este puesto.</p>
                    <Button variant="outline" onClick={() => handleOpenDialog()}>
                      Crear primera categoría
                    </Button>
                  </div>
                ) : (
                  positionCategories.map((category) => (
                    <Card key={category.id} className="group hover:shadow-md transition-all duration-200 border-slate-200">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Header Row */}
                            <div className="flex items-center gap-3 mb-3">
                              <Badge className={cn("px-2.5 py-0.5", getLevelColor(category.level))}>
                                Nivel {category.level}
                              </Badge>
                              <h3 className="font-semibold text-lg text-slate-900">{category.name}</h3>
                              <Badge variant="outline" className="font-mono text-xs text-slate-500 bg-slate-50">
                                {category.code}
                              </Badge>
                              {!category.is_active && (
                                <Badge variant="destructive" className="text-[10px]">Inactivo</Badge>
                              )}
                            </div>

                            {/* Description */}
                            {category.description && (
                              <p className="text-sm text-slate-600 mb-4 leading-relaxed max-w-2xl">
                                {category.description}
                              </p>
                            )}

                            {/* Salary Grid */}
                            <div className="grid grid-cols-3 gap-px bg-slate-200 rounded-lg overflow-hidden border border-slate-200">
                              <div className="bg-white p-3">
                                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">Rango Min</span>
                                <div className="text-sm font-medium text-slate-700">
                                  {Number(category.salary_range?.min || 0).toLocaleString('es-ES')} €
                                </div>
                              </div>
                              <div className="bg-blue-50/50 p-3">
                                <span className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold block mb-1">Objetivo</span>
                                <div className="text-lg font-bold text-blue-700">
                                  {Number(category.salary_range?.target || 0).toLocaleString('es-ES')} €
                                </div>
                              </div>
                              <div className="bg-white p-3">
                                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">Rango Max</span>
                                <div className="text-sm font-medium text-slate-700">
                                  {Number(category.salary_range?.max || 0).toLocaleString('es-ES')} €
                                </div>
                              </div>
                            </div>
                            
                            {/* Footer Info */}
                            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                              <div className="flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5" />
                                <span>Exp. requerida: <strong>{category.required_experience_years} años</strong></span>
                              </div>
                              {category.source === 'store' && (
                                <div className="flex items-center gap-1.5 text-amber-600" title="Datos guardados localmente">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Copia local</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => handleOpenDialog(category)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => {
                                if (confirm("¿Eliminar esta categoría?")) {
                                  deleteMutation.mutate(category.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
              {selectedPosition && <span className="text-slate-500 font-normal text-sm ml-2">para {selectedPosition.name}</span>}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre de Categoría *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej. Senior, Junior, Lead..."
                />
              </div>
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="Ej. DEV-SR"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nivel (Jerarquía)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.level}
                  onChange={(e) => setFormData({...formData, level: parseInt(e.target.value) || 1})}
                />
              </div>
              <div className="space-y-2">
                <Label>Exp. Mínima (Años)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.required_experience_years}
                  onChange={(e) => setFormData({...formData, required_experience_years: parseInt(e.target.value) || 0})}
                />
              </div>
               <div className="flex items-end pb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <label htmlFor="is_active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Activo
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Responsabilidades principales..."
                rows={2}
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border space-y-3">
              <Label className="text-blue-700 font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Banda Salarial (Bruto Anual)
              </Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Mínimo</Label>
                  <Input
                    type="number"
                    step="100"
                    className="bg-white"
                    value={formData.salary_range.min}
                    onChange={(e) => setFormData({
                      ...formData,
                      salary_range: { ...formData.salary_range, min: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-blue-600 font-bold">Objetivo (Target)</Label>
                  <Input
                    type="number"
                    step="100"
                    className="bg-white border-blue-200 ring-offset-blue-50"
                    value={formData.salary_range.target}
                    onChange={(e) => setFormData({
                      ...formData,
                      salary_range: { ...formData.salary_range, target: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Máximo</Label>
                  <Input
                    type="number"
                    step="100"
                    className="bg-white"
                    value={formData.salary_range.max}
                    onChange={(e) => setFormData({
                      ...formData,
                      salary_range: { ...formData.salary_range, max: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar Categoría"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
