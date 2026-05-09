import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const MACHINE_TYPES = ['Sobres', 'Frascos', 'Etiquetado', 'Embalaje', 'Control Calidad', 'Otro'];
const MACHINE_STATUS = ['Operativa', 'Mantenimiento', 'Fuera de servicio', 'Retirada'];

export default function NewMachineDialog({ open, onOpenChange, onMachineCreated }) {
  const [formData, setFormData] = useState({
    codigo_maquina: '',
    nombre: '',
    marca: '',
    modelo: '',
    tipo: 'Otro',
    area_name: '',
    descripcion: '',
    estado_operativo: 'Operativa',
    numero_serie: ''
  });

  const handleSave = () => {
    if (!formData.codigo_maquina.trim() || !formData.nombre.trim()) {
      alert('Código y nombre son obligatorios');
      return;
    }
    onMachineCreated(formData);
    setFormData({
      codigo_maquina: '',
      nombre: '',
      marca: '',
      modelo: '',
      tipo: 'Otro',
      area_name: '',
      descripcion: '',
      estado_operativo: 'Operativa',
      numero_serie: ''
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Nueva Máquina</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Código</label>
              <Input
                value={formData.codigo_maquina}
                onChange={(e) => setFormData({ ...formData, codigo_maquina: e.target.value })}
                placeholder="Ej: M001"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Nombre</label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre máquina"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Marca</label>
              <Input
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                placeholder="Ej: Bosch"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Modelo</label>
              <Input
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                placeholder="Modelo"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Tipo</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
              >
                {MACHINE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Área</label>
              <Input
                value={formData.area_name}
                onChange={(e) => setFormData({ ...formData, area_name: e.target.value })}
                placeholder="Ej: Fabricación"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">N° Serie</label>
            <Input
              value={formData.numero_serie}
              onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
              placeholder="Número de serie"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Descripción</label>
            <Textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripción de la máquina"
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="gap-2">
              Registrar Máquina
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}