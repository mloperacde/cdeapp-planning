import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Palette, Save, Image as ImageIcon, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/components/common/ThemeProvider";

export default function BrandingConfig() {
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const { theme, setTheme } = useTheme();

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: brandingConfig, isLoading } = useQuery({
    queryKey: ['appConfig', 'branding'],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ config_key: 'branding' });
      return configs[0] || null;
    },
    staleTime: 0,
    gcTime: 0
  });

  const [formData, setFormData] = useState({
    app_name: "CdeApp Planning",
    app_subtitle: "Gestión de Empleados y Planificador",
    primary_color: "#3B82F6",
    logo_url: ""
  });

  React.useEffect(() => {
    if (brandingConfig?.value) {
      try {
        const parsed = JSON.parse(brandingConfig.value);
        setFormData({
          app_name: parsed.app_name || "CdeApp Planning",
          app_subtitle: parsed.app_subtitle || "Gestión de Empleados y Planificador",
          primary_color: parsed.primary_color || "#3B82F6",
          logo_url: parsed.logo_url || ""
        });
      } catch (e) {
        console.error("Error parsing branding config", e);
      }
    } else if (brandingConfig) {
      // Fallback para estructura antigua (si existiera)
      setFormData({
        app_name: brandingConfig.app_name || "CdeApp Planning",
        app_subtitle: brandingConfig.app_subtitle || "Gestión de Empleados y Planificador",
        primary_color: brandingConfig.primary_color || "#3B82F6",
        logo_url: brandingConfig.logo_url || ""
      });
    }
  }, [brandingConfig]);

  const saveBrandingMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        config_key: 'branding',
        value: JSON.stringify(data),
        description: 'Configuración de Marca y Apariencia',
        updated_by: currentUser?.email,
        updated_by_name: currentUser?.full_name
      };

      if (brandingConfig?.id) {
        return await base44.entities.AppConfig.update(brandingConfig.id, payload);
      } else {
        return await base44.entities.AppConfig.create(payload);
      }
    },
    onSuccess: () => {
      toast.success("Configuración de marca guardada correctamente");
      queryClient.invalidateQueries({ queryKey: ['appConfig'] });
      queryClient.invalidateQueries({ queryKey: ['brandingConfig'] }); // Invalidar DataProvider también
    },
    onError: (error) => {
      toast.error(`Error al guardar: ${error.message}`);
    }
  });

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Solo se permiten archivos de imagen");
      return;
    }

    if (file.size > 500000) {
      toast.error("El archivo debe ser menor a 500KB");
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;

    setIsUploading(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file: logoFile });
      console.log("UploadFile response:", response);
      
      const file_url = response.file_url || response.data?.file_url || response.url || (typeof response === 'string' ? response : null);
      
      if (!file_url) {
        throw new Error("No se pudo obtener la URL del archivo subido");
      }
      
      await saveBrandingMutation.mutateAsync({
        ...formData,
        logo_url: file_url,
        updated_by: currentUser?.email,
        updated_by_name: currentUser?.full_name
      });

      // Actualizar estado local también
      setFormData(prev => ({ ...prev, logo_url: file_url }));

      toast.success("Logo actualizado correctamente");
      setLogoFile(null);
      setLogoPreview(null);
    } catch (error) {
      toast.error("Error al subir logo: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveConfig = () => {
    saveBrandingMutation.mutate({
      ...formData,
      updated_by: currentUser?.email,
      updated_by_name: currentUser?.full_name
    });
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500">
        Cargando configuración...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-600" />
            Logotipo de la Aplicación
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label>Logo Actual</Label>
              <div className="p-4 border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-800 h-32 flex items-center justify-center">
                {formData.logo_url ? (
                  <img 
                    src={formData.logo_url} 
                    alt="Logo actual" 
                    className="max-h-24 max-w-full object-contain"
                  />
                ) : (
                  <p className="text-sm text-slate-500">Sin logo personalizado</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <Label>Nuevo Logo</Label>
              <div className="p-4 border-2 border-dashed rounded-lg bg-blue-50 dark:bg-blue-900/20 h-32 flex items-center justify-center">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Vista previa" 
                    className="max-h-24 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">PNG, JPG (máx 500KB)</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleUploadLogo}
                  disabled={!logoFile || isUploading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isUploading ? "Subiendo..." : "Subir"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-600" />
            Personalización de Marca
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre de la Aplicación</Label>
              <Input
                value={formData.app_name}
                onChange={(e) => setFormData({...formData, app_name: e.target.value})}
                placeholder="CdeApp Planning"
              />
            </div>

            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Input
                value={formData.app_subtitle}
                onChange={(e) => setFormData({...formData, app_subtitle: e.target.value})}
                placeholder="Gestión de Empleados y Planificador"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color Primario</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                className="w-20 h-10"
              />
              <Input
                value={formData.primary_color}
                onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="button" onClick={handleSaveConfig} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Guardar Configuración
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}