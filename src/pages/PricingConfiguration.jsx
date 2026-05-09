import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/ui/loading-state';
import { Plus, Save, Edit2 } from 'lucide-react';

export default function PricingConfiguration() {
  const queryClient = useQueryClient();
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    config_name: '',
    product_type: 'general',
    labor_cost_per_unit: 0,
    hourly_rate: 0,
    margin_percentage: 35,
    tax_percentage: 21,
  });

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['pricing-configs'],
    queryFn: () => base44.entities.PricingConfiguration.list('-updated_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PricingConfiguration.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-configs'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.PricingConfiguration.update(editingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-configs'] });
      resetForm();
    },
  });

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const resetForm = () => {
    setFormData({
      config_name: '',
      product_type: 'general',
      labor_cost_per_unit: 0,
      hourly_rate: 0,
      margin_percentage: 35,
      tax_percentage: 21,
    });
    setShowNewForm(false);
    setEditingId(null);
  };

  const handleEdit = (config) => {
    setFormData(config);
    setEditingId(config.id);
    setShowNewForm(true);
  };

  if (isLoading) return <LoadingState message="Cargando configuraciones..." />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Configuración de Precios</h1>
            <p className="text-slate-600 mt-1">Gestiona tarifas y márgenes por producto</p>
          </div>
          {!showNewForm && (
            <Button onClick={() => setShowNewForm(true)} className="gap-2 bg-green-600 hover:bg-green-700">
              <Plus className="w-5 h-5" />
              Nueva Configuración
            </Button>
          )}
        </div>

        {/* Form */}
        {showNewForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingId ? 'Editar Configuración' : 'Nueva Configuración de Precios'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={formData.config_name}
                    onChange={(e) => setFormData({ ...formData, config_name: e.target.value })}
                    placeholder="Ej: Cosméticos Estándar"
                  />
                </div>

                <div>
                  <Label>Tipo de Producto</Label>
                  <Select
                    value={formData.product_type}
                    onValueChange={(value) => setFormData({ ...formData, product_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="cosmetico">Cosmético</SelectItem>
                      <SelectItem value="perfumeria">Perfumería</SelectItem>
                      <SelectItem value="sanitario">Sanitario</SelectItem>
                      <SelectItem value="alimenticio">Alimenticio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Costo de Mano de Obra (€/unidad)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.labor_cost_per_unit}
                    onChange={(e) => setFormData({ ...formData, labor_cost_per_unit: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>Tarifa Horaria (€/hora)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>Margen de Ganancia (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.margin_percentage}
                    onChange={(e) => setFormData({ ...formData, margin_percentage: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>IVA (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.tax_percentage}
                    onChange={(e) => setFormData({ ...formData, tax_percentage: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? 'Guardar Cambios' : 'Crear'}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* List */}
        <div className="space-y-4">
          {configs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-slate-600 mb-4">No hay configuraciones de precios</p>
                <Button onClick={() => setShowNewForm(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Crear Primera Configuración
                </Button>
              </CardContent>
            </Card>
          ) : (
            configs.map((config) => (
              <Card key={config.id}>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Nombre</p>
                      <p className="font-semibold">{config.config_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Tipo</p>
                      <p className="capitalize">{config.product_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Costo/Unidad</p>
                      <p className="font-semibold">€{config.labor_cost_per_unit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Tarifa Horaria</p>
                      <p className="font-semibold">€{config.hourly_rate}/h</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Margen</p>
                      <p className="font-semibold">{config.margin_percentage}%</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(config)}
                      className="gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}