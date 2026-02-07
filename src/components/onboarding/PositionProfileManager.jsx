import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  FileText, Plus, Trash2, Save, Printer, Download, 
  Briefcase, CheckCircle2, AlertTriangle, BookOpen, PenTool 
} from "lucide-react";
import { toast } from "sonner";

// Initial Seed Data based on User Request
const INITIAL_PROFILES = {
  "tecnico-proceso": {
    id: "tecnico-proceso",
    title: "Técnico de Proceso",
    mission: "El Técnico de Proceso es el máximo responsable operativo de una línea de fabricación. Su función es garantizar la excelencia en el envasado mediante el manejo técnico avanzado (cambio de formato, limpieza, montaje y arranque), la resolución proactiva de averías y la gestión directa del equipo humano asignado. Es el garante del cumplimiento de los estándares de calidad, seguridad y orden (GMP) en su área de influencia.",
    onboarding: [
      { phase: "Semana 1", focus: "Seguridad y Entorno", milestones: "Seguridad de máquinas, protocolos LOTO, normas de higiene y vestimenta." },
      { phase: "Semana 2", focus: "Gestión y Control", milestones: "Manejo de la App interna, control de procesos (IPC), gestión de personal de línea." },
      { phase: "Semana 3", focus: "Técnica Operativa", milestones: "Cambios de formato, ajustes finos, limpieza y desinfección de piezas clave." },
      { phase: "Semana 4", focus: "Autonomía", milestones: "Arranque de línea independiente, resolución de averías y cierre de órdenes." }
    ],
    responsibilities: [
      {
        category: "A. Documentación y Control de Calidad",
        items: [
          "Validación de Componentes: Revisar códigos de materiales antes de colocarlos en línea.",
          "Control de Proceso (IPC): Verificación de peso, estanqueidad, lote y atributos cada 30 min.",
          "Gestión de Datos: Cumplimentar parte de control basado en OF.",
          "Muestreo: Toma y etiquetado correcto de muestras.",
          "Cierre de Orden: Conteo de sobrantes y despeje de línea."
        ]
      },
      {
        category: "B. Operativa y Manejo de Maquinaria",
        items: [
          "Seguridad Primero: Verificación diaria de protecciones.",
          "Ciclo de Producción: Cambio de formato, limpieza, montaje y arranque.",
          "Gestión de Bulk: Conexión segura de depósitos.",
          "Mantenimiento Nivel 1: Resolución de incidencias menores."
        ]
      },
      {
        category: "C. Gestión de Equipo y Planta",
        items: [
          "Liderazgo: Supervisar conducta y desempeño de operarios.",
          "Reporte de Personal: Informar anomalías.",
          "Gestión de Recursos: Avisar necesidad de componentes.",
          "Estado de la Instalación: Reportar desperfectos."
        ]
      }
    ],
    protocols: [
      { title: "Limpieza de Máquina", description: "Seguir checklist de piezas en contacto (boquillas, pistones, mangueras)." },
      { title: "Ajustes Mecánicos", description: "Configuración de guías, estrellas y alturas según formato." },
      { title: "Puesta en Marcha", description: "Validación de 'primera unidad buena' antes de producción." }
    ],
    handover: [
      "Estado de la Sala: Impecable (limpia y ordenada).",
      "Suficiencia: Componentes para al menos 30 min del siguiente turno.",
      "Traspaso de Información: Informar incidencias técnicas."
    ],
    troubleshooting: [
      { problem: "Fallo de Loteado", check: "Cabezal sucio o falta de tinta", action: "Limpiar con solvente y revisar App." },
      { problem: "Fuga en Envase", check: "Torque de cierre o junta de boquilla", action: "Ajustar cabezal o cambiar junta." },
      { problem: "Parada de Cinta", check: "Sensor obstruido o emergencia pulsada", action: "Limpiar fotocélulas y rearmar." }
    ]
  }
};

export default function PositionProfileManager() {
  const queryClient = useQueryClient();
  const [selectedProfileId, setSelectedProfileId] = useState("tecnico-proceso");
  const [localProfile, setLocalProfile] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const iframeRef = useRef(null);

  // Fetch Profiles from AppConfig
  const { data: profiles, isLoading } = useQuery({
    queryKey: ['positionProfiles'],
    queryFn: async () => {
      try {
        // Try to find by config_key first (standard), then key (legacy)
        let configs = await base44.entities.AppConfig.filter({ config_key: 'position_profiles_v1' });
        if (!configs || configs.length === 0) {
           configs = await base44.entities.AppConfig.filter({ key: 'position_profiles_v1' });
        }
        
        const profileConfig = configs && configs.length > 0 ? configs[0] : null;
        
        if (profileConfig) {
          return JSON.parse(profileConfig.value);
        }
        return INITIAL_PROFILES;
      } catch (e) {
        console.error("Error fetching profiles", e);
        return INITIAL_PROFILES;
      }
    },
    initialData: INITIAL_PROFILES
  });

  // Sync local state when selection changes or data loads
  useEffect(() => {
    if (profiles && selectedProfileId && profiles[selectedProfileId]) {
       setLocalProfile(JSON.parse(JSON.stringify(profiles[selectedProfileId])));
       setHasChanges(false);
    }
  }, [profiles, selectedProfileId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!localProfile) return;
      
      // Robust lookup using filter instead of list
      let configs = await base44.entities.AppConfig.filter({ config_key: 'position_profiles_v1' });
      if (!configs || configs.length === 0) {
         configs = await base44.entities.AppConfig.filter({ key: 'position_profiles_v1' });
      }
      const existingConfig = configs && configs.length > 0 ? configs[0] : null;
      
      const newProfiles = {
        ...profiles,
        [selectedProfileId]: localProfile
      };

      const value = JSON.stringify(newProfiles);
      
      if (existingConfig) {
        return base44.entities.AppConfig.update(existingConfig.id, { value });
      } else {
        return base44.entities.AppConfig.create({ 
          config_key: 'position_profiles_v1', 
          value,
          description: 'Configuration for Job Descriptions and Onboarding Templates'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positionProfiles'] });
      setHasChanges(false);
      toast.success("Perfiles guardados correctamente");
    },
    onError: () => {
      toast.error("Error al guardar perfiles");
    }
  });

  const handleUpdateProfile = (field, value) => {
    if (!localProfile) return;
    
    setLocalProfile(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleAddProfile = () => {
    const name = prompt("Nombre del nuevo puesto:");
    if (!name) return;
    
    const id = name.toLowerCase().replace(/\s+/g, '-');
    if (profiles[id]) {
      toast.error("Este puesto ya existe");
      return;
    }

    const newProfile = {
        id,
        title: name,
        mission: "",
        onboarding: [],
        responsibilities: [],
        protocols: [],
        handover: [],
        troubleshooting: []
    };

    const newProfiles = {
      ...profiles,
      [id]: newProfile
    };

    // For adding, we do want to save immediately to create the entry
    // But then we need to select it
    // We can just update local state logic? 
    // Let's force a save here to simplify
    // We need to call a different mutation or just reuse save logic but we need to update 'profiles' directly
    // Ideally we should update the server.
    
    // Quick fix: Update server directly for Add
     (async () => {
         let configs = await base44.entities.AppConfig.filter({ config_key: 'position_profiles_v1' });
         if (!configs || configs.length === 0) {
            configs = await base44.entities.AppConfig.filter({ key: 'position_profiles_v1' });
         }
         const existingConfig = configs && configs.length > 0 ? configs[0] : null;

         const value = JSON.stringify(newProfiles);
         const promise = existingConfig 
             ? base44.entities.AppConfig.update(existingConfig.id, { value })
             : base44.entities.AppConfig.create({ config_key: 'position_profiles_v1', value, description: 'Configuration for Job Descriptions and Onboarding Templates' });
             
         await promise;
         queryClient.invalidateQueries({ queryKey: ['positionProfiles'] });
         setSelectedProfileId(id);
         toast.success("Puesto creado");
    })();
  };

  const selectedProfile = localProfile;

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Plan de Onboarding - ${selectedProfile.title}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
            h2 { color: #1e3a8a; margin-top: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-size: 18px; }
            h3 { color: #475569; font-size: 16px; margin-top: 15px; }
            .section { margin-bottom: 20px; }
            .mission { background: #f8fafc; padding: 15px; border-left: 4px solid #3b82f6; font-style: italic; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background-color: #f1f5f9; }
            .signature-box { margin-top: 50px; border-top: 1px solid #cbd5e1; padding-top: 20px; display: flex; justify-content: space-between; }
            .signature-line { width: 45%; text-align: center; border-top: 1px solid #333; margin-top: 50px; padding-top: 10px; }
            .page-break { page-break-before: always; }
            @media print {
              body { font-size: 12pt; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${selectedProfile.title}</h1>
          <div class="section">
            <h2>1. Descripción y Misión</h2>
            <div class="mission">${selectedProfile.mission || 'Sin definir'}</div>
          </div>

          <div class="section">
            <h2>2. Cronograma de Adaptación (Onboarding)</h2>
            <table>
              <thead>
                <tr>
                  <th>Fase</th>
                  <th>Enfoque</th>
                  <th>Hitos de Aprendizaje</th>
                  <th style="width: 100px;">Firma Empleado</th>
                  <th style="width: 100px;">Firma Formador</th>
                </tr>
              </thead>
              <tbody>
                ${(selectedProfile.onboarding || []).map(o => `
                  <tr>
                    <td>${o.phase}</td>
                    <td>${o.focus}</td>
                    <td>${o.milestones}</td>
                    <td></td>
                    <td></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>3. Responsabilidades Detalladas</h2>
            ${(selectedProfile.responsibilities || []).map(cat => `
              <h3>${cat.category}</h3>
              <ul>
                ${cat.items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            `).join('')}
          </div>

          <div class="section">
            <h2>4. Protocolos y Estándares</h2>
            <ul>
              ${(selectedProfile.protocols || []).map(p => `
                <li><strong>${p.title}:</strong> ${p.description}</li>
              `).join('')}
            </ul>
          </div>

          <div class="section">
            <h2>5. Relevos y Orden</h2>
            <ul>
              ${(selectedProfile.handover || []).map(h => `<li>${h}</li>`).join('')}
            </ul>
          </div>

           <div class="page-break"></div>

          <div class="section">
            <h2>6. Guía de Resolución de Averías</h2>
            <table>
              <thead>
                <tr>
                  <th>Problema</th>
                  <th>Verificación</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                ${(selectedProfile.troubleshooting || []).map(t => `
                  <tr>
                    <td>${t.problem}</td>
                    <td>${t.check}</td>
                    <td>${t.action}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section signature-box">
             <div style="width: 100%;">
                <p>He leído y comprendido las responsabilidades y procedimientos descritos en este documento.</p>
                <div style="display: flex; justify-content: space-between; margin-top: 60px;">
                    <div class="signature-line">
                        <strong>Firma del Empleado</strong><br>
                        Fecha: _________________
                    </div>
                    <div class="signature-line">
                        <strong>Firma del Responsable/Formador</strong><br>
                        Fecha: _________________
                    </div>
                </div>
             </div>
          </div>
        </body>
      </html>
    `);
    doc.close();
    
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    }, 100);
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-6">
      {/* Sidebar List */}
      <Card className="w-64 shrink-0 flex flex-col">
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-sm font-medium flex justify-between items-center">
            Puestos Definidos
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleAddProfile}>
              <Plus className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {profiles && Object.values(profiles).map(profile => (
              <Button
                key={profile.id}
                variant={selectedProfileId === profile.id ? "secondary" : "ghost"}
                className="w-full justify-start text-sm truncate"
                onClick={() => setSelectedProfileId(profile.id)}
              >
                <Briefcase className="w-4 h-4 mr-2 opacity-70" />
                {profile.title}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Main Content */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {selectedProfile ? (
          <>
            <CardHeader className="border-b bg-slate-50 flex flex-row justify-between items-center py-3">
              <div>
                <CardTitle>{selectedProfile.title}</CardTitle>
                <CardDescription>Configuración del perfil y plan de onboarding</CardDescription>
              </div>
              <div className="flex gap-2">
                {hasChanges && (
                  <Button onClick={() => saveMutation.mutate()} className="bg-green-600 hover:bg-green-700 animate-pulse">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </Button>
                )}
                <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir / PDF
                </Button>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-8 max-w-4xl mx-auto">
                
                {/* 1. Misión */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">1. Descripción</Badge>
                    <h3 className="font-semibold text-lg">Misión del Puesto</h3>
                  </div>
                  <Textarea 
                    value={selectedProfile.mission} 
                    onChange={(e) => handleUpdateProfile('mission', e.target.value)}
                    className="min-h-[100px]"
                    placeholder="Describe la misión principal del puesto..."
                  />
                </div>

                <Separator />

                {/* 2. Onboarding */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700">2. Onboarding</Badge>
                      <h3 className="font-semibold text-lg">Cronograma de Adaptación</h3>
                    </div>
                  </div>
                  
                  <div className="grid gap-4">
                    {(selectedProfile.onboarding || []).map((phase, idx) => (
                      <Card key={idx} className="p-4 border-l-4 border-l-green-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-xs">Fase / Semana</Label>
                            <Input 
                              value={phase.phase} 
                              onChange={(e) => {
                                const newOnboarding = [...selectedProfile.onboarding];
                                newOnboarding[idx].phase = e.target.value;
                                handleUpdateProfile('onboarding', newOnboarding);
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Enfoque Principal</Label>
                            <Input 
                              value={phase.focus} 
                              onChange={(e) => {
                                const newOnboarding = [...selectedProfile.onboarding];
                                newOnboarding[idx].focus = e.target.value;
                                handleUpdateProfile('onboarding', newOnboarding);
                              }}
                            />
                          </div>
                          <div className="md:col-span-3">
                            <Label className="text-xs">Hitos de Aprendizaje</Label>
                            <Textarea 
                              value={phase.milestones} 
                              onChange={(e) => {
                                const newOnboarding = [...selectedProfile.onboarding];
                                newOnboarding[idx].milestones = e.target.value;
                                handleUpdateProfile('onboarding', newOnboarding);
                              }}
                              className="h-20"
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                    <Button 
                      variant="outline" 
                      onClick={() => handleUpdateProfile('onboarding', [...(selectedProfile.onboarding || []), { phase: "", focus: "", milestones: "" }])}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Añadir Fase
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* 3. Responsabilidades */}
                <div className="space-y-4">
                   <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-orange-50 text-orange-700">3. Funciones</Badge>
                    <h3 className="font-semibold text-lg">Responsabilidades Detalladas</h3>
                  </div>
                  
                  {(selectedProfile.responsibilities || []).map((cat, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-lg space-y-3">
                      <div className="flex gap-2">
                        <Input 
                          value={cat.category} 
                          className="font-bold bg-transparent border-0 border-b rounded-none focus-visible:ring-0 px-0"
                          onChange={(e) => {
                            const newResp = [...selectedProfile.responsibilities];
                            newResp[idx].category = e.target.value;
                            handleUpdateProfile('responsibilities', newResp);
                          }}
                        />
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => {
                           const newResp = selectedProfile.responsibilities.filter((_, i) => i !== idx);
                           handleUpdateProfile('responsibilities', newResp);
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Textarea 
                        value={cat.items.join('\n')}
                        onChange={(e) => {
                          const newResp = [...selectedProfile.responsibilities];
                          newResp[idx].items = e.target.value.split('\n');
                          handleUpdateProfile('responsibilities', newResp);
                        }}
                        className="min-h-[100px]"
                        placeholder="Un ítem por línea"
                      />
                      <p className="text-[10px] text-slate-400">Escribe cada responsabilidad en una línea nueva</p>
                    </div>
                  ))}
                   <Button 
                      variant="outline" 
                      onClick={() => handleUpdateProfile('responsibilities', [...(selectedProfile.responsibilities || []), { category: "Nueva Categoría", items: [] }])}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Añadir Categoría
                    </Button>
                </div>

                 <Separator />

                {/* 4. Troubleshooting */}
                <div className="space-y-4">
                   <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-red-50 text-red-700">4. Averías</Badge>
                    <h3 className="font-semibold text-lg">Guía de Resolución de Averías</h3>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Problema</TableHead>
                        <TableHead>Verificación</TableHead>
                        <TableHead>Acción</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedProfile.troubleshooting || []).map((item, idx) => (
                         <TableRow key={idx}>
                           <TableCell className="p-2">
                             <Input 
                                value={item.problem}
                                onChange={(e) => {
                                  const newTrouble = [...selectedProfile.troubleshooting];
                                  newTrouble[idx].problem = e.target.value;
                                  handleUpdateProfile('troubleshooting', newTrouble);
                                }}
                             />
                           </TableCell>
                           <TableCell className="p-2">
                             <Input 
                                value={item.check}
                                onChange={(e) => {
                                  const newTrouble = [...selectedProfile.troubleshooting];
                                  newTrouble[idx].check = e.target.value;
                                  handleUpdateProfile('troubleshooting', newTrouble);
                                }}
                             />
                           </TableCell>
                           <TableCell className="p-2">
                             <Input 
                                value={item.action}
                                onChange={(e) => {
                                  const newTrouble = [...selectedProfile.troubleshooting];
                                  newTrouble[idx].action = e.target.value;
                                  handleUpdateProfile('troubleshooting', newTrouble);
                                }}
                             />
                           </TableCell>
                           <TableCell>
                             <Button variant="ghost" size="icon" onClick={() => {
                                const newTrouble = selectedProfile.troubleshooting.filter((_, i) => i !== idx);
                                handleUpdateProfile('troubleshooting', newTrouble);
                             }}>
                               <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                             </Button>
                           </TableCell>
                         </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleUpdateProfile('troubleshooting', [...(selectedProfile.troubleshooting || []), { problem: "", check: "", action: "" }])}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Añadir Fila
                    </Button>
                </div>

              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            Selecciona un puesto o crea uno nuevo
          </div>
        )}
      </Card>
      <iframe ref={iframeRef} className="hidden" />
    </div>
  );
}
