import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  Briefcase, CheckCircle2, AlertTriangle, BookOpen, PenTool, RefreshCw 
} from "lucide-react";
import { toast } from "sonner";
import TrainingPlansBuilder from "./TrainingPlansBuilder";

// Initial Seed Data based on User Request
const INITIAL_PROFILES = {
  "tecnico-proceso": {
    id: "tecnico-proceso",
    title: "Técnico de Proceso",
    mission: "El Técnico de Proceso es el máximo responsable operativo de una línea de fabricación. Su función es garantizar la excelencia en el envasado mediante el manejo técnico avanzado (cambio de formato, limpieza, montaje y arranque), la resolución proactiva de averías y la gestión directa del equipo humano asignado. Es el garante del cumplimiento de los estándares de calidad, seguridad y orden (GMP) en su área de influencia.",
    training_summary: "El plan de formación se estructura en 4 fases progresivas diseñadas para garantizar una integración segura y eficiente. Comienza con una inmersión en cultura y seguridad (Semana 1), avanza hacia el control de procesos y gestión (Semana 2), profundiza en aspectos técnicos y mantenimiento (Semanas 3-4), y culmina con la autonomía operativa y liderazgo (Mes 2).",
    section5_title: "Protocolos y Estándares",
    section6_title: "Estándares de Relevo (Handover)",
    section7_title: "Guía de Resolución de Averías",
    onboarding: [
      { 
        phase: "Semana 1", 
        focus: "Inmersión y Seguridad", 
        milestones: [
          { text: "Cultura GMP: Normas de Correcta Fabricación.", responsible: "", completed: false },
          { text: "Seguridad: Protocolos LOTO (Bloqueo/Etiquetado) y EPIs.", responsible: "", completed: false },
          { text: "Shadowing: Observación guiada con un técnico mentor.", responsible: "", completed: false }
        ]
      },
      { 
        phase: "Semana 2", 
        focus: "Control y Gestión", 
        milestones: [
          { text: "Manejo de Software: Registro de producción y paradas en la App interna.", responsible: "", completed: false },
          { text: "IPC (In-Process Control): Verificación de atributos cada 30 minutos.", responsible: "", completed: false },
          { text: "Gestión de Equipos: Asignación de tareas y supervisión de operarios.", responsible: "", completed: false }
        ]
      },
      { 
        phase: "Semanas 3-4", 
        focus: "Técnica y Mantenimiento", 
        milestones: [
          { text: "Resolución de averías: Diagnóstico y reparación de fallos comunes.", responsible: "", completed: false },
          { text: "Cambio de Formato: Ajustes mecánicos y sustitución de piezas.", responsible: "", completed: false },
          { text: "Limpieza y Desinfección: Protocolos de contacto con producto.", responsible: "", completed: false }
        ]
      },
      { 
        phase: "Mes 2", 
        focus: "Autonomía", 
        milestones: [
          { text: "Liderazgo real: Gestión de turno bajo supervisión mínima.", responsible: "", completed: false },
          { text: "Evaluación de KPIs: Revisión de productividad y mermas.", responsible: "", completed: false }
        ]
      }
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

export default function PositionProfileManager({ trainingResources = [] }) {
  const queryClient = useQueryClient();
  const [selectedProfileId, setSelectedProfileId] = useState("tecnico-proceso");
  const [localProfile, setLocalProfile] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const iframeRef = useRef(null);

  // Ref to track the last server profile version we synced with to prevent infinite loops
  const lastSyncedProfileRef = useRef(null);
  const prevProfileIdRef = useRef(selectedProfileId);

  const trainingDocs = useMemo(() => {
    return (trainingResources || []).filter(r => r.type === 'document' || r.type === 'url');
  }, [trainingResources]);

  const trainingPlans = useMemo(() => {
    return (trainingResources || []).filter(r => r.type === 'training_plan');
  }, [trainingResources]);

  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['positionProfiles'],
    queryFn: async () => {
      try {
        const results = await base44.entities.AppConfig.filter({ config_key: 'position_profiles_v1' });
        
        if (!results || results.length === 0) {
          return INITIAL_PROFILES;
        }
        
        // Usar solo el más reciente (primero)
        const record = results[0];
        const jsonString = record.value || record.app_subtitle || record.description;
        
        if (!jsonString) {
          return INITIAL_PROFILES;
        }
        
        const parsed = JSON.parse(jsonString);
        return parsed || INITIAL_PROFILES;
      } catch (error) {
        console.error('Error cargando perfiles:', error);
        return INITIAL_PROFILES;
      }
    },
    initialData: INITIAL_PROFILES,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const saveProfilesMutation = useMutation({
    mutationFn: async (updatedProfiles) => {
      const payload = {
        config_key: 'position_profiles_v1',
        app_name: 'Position Profiles',
        value: JSON.stringify(updatedProfiles),
        app_subtitle: JSON.stringify(updatedProfiles),
      };

      const existing = await base44.entities.AppConfig.filter({ config_key: 'position_profiles_v1' });
      
      if (existing && existing.length > 0) {
        // Actualizar el primero
        const mainRecord = existing[0];
        await base44.entities.AppConfig.update(mainRecord.id, payload);
        
        // ELIMINAR duplicados obsoletos
        const obsoleteRecords = existing.slice(1);
        for (const obsolete of obsoleteRecords) {
          try {
            await base44.entities.AppConfig.delete(obsolete.id);
          } catch (err) {
            console.warn('No se pudo eliminar duplicado:', obsolete.id, err);
          }
        }
        
        return mainRecord;
      } else {
        return base44.entities.AppConfig.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positionProfiles'] });
      toast.success('Perfil guardado correctamente');
    },
    onError: (error) => {
      console.error('Error guardando perfil:', error);
      toast.error('Error al guardar perfil');
    }
  });

  const isSaving = saveProfilesMutation.isPending;

  // Sync logic: Only update local state if ID changed OR server data is new (and we haven't edited)
  useEffect(() => {
    // If profiles data is not loaded yet, do nothing
    if (!profiles || !profiles[selectedProfileId]) return;

    const serverProfile = profiles[selectedProfileId];
    const profileIdChanged = prevProfileIdRef.current !== selectedProfileId;
    
    // Check if server data is actually different from what we last synced
    // This uses object reference equality from React Query (stable if data unchanged)
    const isNewServerData = serverProfile !== lastSyncedProfileRef.current;

    // Conditions to sync:
    // 1. User switched profile (always load fresh)
    // 2. We don't have local state yet (initial load)
    // 3. Server has new data AND we haven't made unsaved changes
    if (profileIdChanged || !localProfile || (isNewServerData && !hasChanges)) {
       let profileData = JSON.parse(JSON.stringify(serverProfile));
       
       // Migration: Convert legacy string milestones to array objects
        if (profileData.onboarding) {
          profileData.onboarding = profileData.onboarding.map(phase => {
            if (typeof phase.milestones === 'string') {
              return {
                ...phase,
                milestones: phase.milestones.split('\n').map(line => ({
                  text: line.replace(/^[•\-\*]\s*/, ''),
                  responsible: "",
                  resourceId: "",
                  completed: false
                })).filter(m => m.text.trim() !== '')
              };
            }
            return phase;
          });
        }

        // Migration: Add default section titles if missing
        if (!profileData.section5_title) profileData.section5_title = "Protocolos y Estándares";
        if (!profileData.section6_title) profileData.section6_title = "Estándares de Relevo (Handover)";
        if (!profileData.section7_title) profileData.section7_title = "Guía de Resolución de Averías";

       setLocalProfile(profileData);
       setHasChanges(false);
       
       // Update refs to track current state
       prevProfileIdRef.current = selectedProfileId;
       lastSyncedProfileRef.current = serverProfile;
    }
  }, [profiles, selectedProfileId, hasChanges]); // Removed localProfile from deps to avoid loop

  const handleSave = () => {
    if (!localProfile) return;
    
    const newProfiles = {
      ...profiles,
      [selectedProfileId]: localProfile
    };
    
    saveProfilesMutation.mutate(newProfiles);
    setHasChanges(false);
  };

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
        section5_title: "Protocolos y Estándares",
        section6_title: "Estándares de Relevo (Handover)",
        section7_title: "Guía de Resolución de Averías",
        protocols: [],
        handover: [],
        troubleshooting: []
    };

    const newProfiles = {
      ...profiles,
      [id]: newProfile
    };

    saveProfilesMutation.mutate(newProfiles);
    setSelectedProfileId(id);
  };

  const handleDeleteProfile = (e, profileId) => {
    e.stopPropagation(); // Prevent selection when clicking delete
    
    if (Object.keys(profiles).length <= 1) {
        toast.error("Debe existir al menos un perfil activo.");
        return;
    }
    
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el perfil "${profiles[profileId].title}"? Esta acción no se puede deshacer.`)) return;

    const newProfiles = { ...profiles };
    delete newProfiles[profileId];
    
    saveProfilesMutation.mutate(newProfiles);
    
    // Select another profile if we deleted the current one
    if (selectedProfileId === profileId) {
        const remainingIds = Object.keys(newProfiles);
        if (remainingIds.length > 0) {
            setSelectedProfileId(remainingIds[0]);
        }
    }
  };

  const selectedProfile = localProfile;

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    // Construct absolute URL for the logo to ensure it loads inside the iframe
    const logoUrl = `${window.location.origin}/logo2.png`;
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Plan de Onboarding - ${selectedProfile.title}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
            .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 20px; }
            .logo { max-height: 60px; }
            .main-title { color: #1e40af; margin: 0; font-size: 24px; }
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
              @page { size: portrait; margin: 15mm; }
              body { font-size: 11pt; }
              .no-print { display: none; }
              .section { page-break-inside: avoid; margin-bottom: 20px; }
              table { page-break-inside: avoid; width: 100%; }
              tr { page-break-inside: avoid; }
              h2, h3 { page-break-after: avoid; }
              ul, li { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <h1 class="main-title">${selectedProfile.title}</h1>
            <img src="${logoUrl}" alt="Logo" class="logo" />
          </div>
          
          <div class="section">
            <h2>1. Descripción y Misión</h2>
            <div class="mission">${selectedProfile.mission || 'Sin definir'}</div>
          </div>

          <div class="section">
            <h2>2. Funciones y Responsabilidades</h2>
            ${(selectedProfile.responsibilities || []).map(cat => `
              <h3>${cat.category}</h3>
              <ul>
                ${cat.items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            `).join('')}
          </div>

          <div class="section">
            <h2>3. Resumen del Plan de Formación</h2>
            <div style="margin-bottom: 15px;">${selectedProfile.training_summary || 'Sin resumen definido'}</div>
          </div>

          <div class="section">
            <h2>4. Detalle de Fases de Formación (Onboarding)</h2>
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
                  <td>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                      ${Array.isArray(o.milestones) ? o.milestones.map(m => `
                        <li style="margin-bottom: 8px; display: flex; align-items: flex-start;">
                          <span style="margin-right: 8px; font-weight: bold; font-family: monospace;">${m.completed ? '[X]' : '[_]'}</span>
                          <div>
                            <div style="margin-bottom: 2px;">${m.text}</div>
                            ${m.responsible ? `<div style="font-size: 10px; color: #666; font-style: italic;">Resp: ${m.responsible}</div>` : ''}
                            ${m.resourceId ? (() => {
                              const doc = trainingDocs.find(d => d.id === m.resourceId);
                              return doc ? `<div style="font-size: 10px; color: #3b82f6;">Doc: ${doc.title}</div>` : '';
                            })() : ''}
                          </div>
                        </li>
                      `).join('') : o.milestones}
                    </ul>
                  </td>
                  <td></td>
                  <td></td>
                </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>5. ${selectedProfile.section5_title || 'Protocolos y Estándares'}</h2>
            <ul>
              ${(selectedProfile.protocols || []).map(p => `
                <li><strong>${p.title}:</strong> ${p.description}</li>
              `).join('')}
            </ul>
          </div>

          <div class="section">
            <h2>6. ${selectedProfile.section6_title || 'Estándares de Relevo (Handover)'}</h2>
            <ul>
              ${(selectedProfile.handover || []).map(h => `<li>${h}</li>`).join('')}
            </ul>
          </div>

           <div class="page-break"></div>

          <div class="section">
            <h2>7. ${selectedProfile.section7_title || 'Guía de Resolución de Averías'}</h2>
            <table>
              <thead>
                <tr>
                  <th>Problema</th>
                  <th>Verificación</th>
                  <th>Acción</th>
                  <th style="width: 100px;">Firma</th>
                </tr>
              </thead>
              <tbody>
                ${(selectedProfile.troubleshooting || []).map(t => `
                  <tr>
                    <td>${t.problem}</td>
                    <td>${t.check}</td>
                    <td>${t.action}</td>
                    <td></td>
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
    <div className="flex flex-col gap-6">
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
              <div key={profile.id} className="group relative">
                <Button
                  variant={selectedProfileId === profile.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-sm truncate pr-20"
                  onClick={() => setSelectedProfileId(profile.id)}
                >
                  <Briefcase className="w-4 h-4 mr-2 opacity-70" />
                  {profile.title}
                </Button>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newName = prompt("Nombre del puesto clonado:", profile.title + " (Copia)");
                      if (!newName) return;
                      const newId = newName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
                      const clonedProfile = JSON.parse(JSON.stringify(profile));
                      clonedProfile.id = newId;
                      clonedProfile.title = newName;
                      const newProfiles = { ...profiles, [newId]: clonedProfile };
                      saveProfilesMutation.mutate(newProfiles);
                      setSelectedProfileId(newId);
                      toast.success("Perfil clonado correctamente");
                    }}
                    title="Clonar puesto"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => handleDeleteProfile(e, profile.id)}
                    title="Eliminar puesto"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
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
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['positionProfiles'] });
                    toast.info("Recargando datos...");
                  }} 
                  title="Recargar datos del servidor"
                  className="mr-2"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={handleSave}  
                  disabled={!hasChanges || isSaving}
                  className={`${hasChanges ? "bg-green-600 hover:bg-green-700 animate-pulse" : "bg-slate-300 text-slate-500"}`}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Guardando..." : "Guardar Cambios"}
                </Button>
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

                {/* 2. Responsabilidades */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">2. Funciones</Badge>
                    <h3 className="font-semibold text-lg">Responsabilidades Detalladas</h3>
                  </div>
                  
                  {selectedProfile.responsibilities.map((cat, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="space-y-3">
                        <Input 
                          value={cat.category} 
                          onChange={(e) => {
                            const newResp = [...selectedProfile.responsibilities];
                            newResp[idx].category = e.target.value;
                            handleUpdateProfile('responsibilities', newResp);
                          }}
                          className="font-medium border-none shadow-none text-lg p-0 h-auto focus-visible:ring-0"
                        />
                        <Textarea 
                          value={cat.items.join('\n')}
                          onChange={(e) => {
                            const newResp = [...selectedProfile.responsibilities];
                            newResp[idx].items = e.target.value.split('\n');
                            handleUpdateProfile('responsibilities', newResp);
                          }}
                          className="min-h-[100px] font-normal"
                          placeholder="Lista de responsabilidades (una por línea)"
                        />
                      </div>
                    </Card>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                       const newResp = [...(selectedProfile.responsibilities || []), { category: "Nueva Categoría", items: ["Nueva responsabilidad"] }];
                       handleUpdateProfile('responsibilities', newResp);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Añadir Categoría
                  </Button>
                </div>

                <Separator />

                {/* 3. Training Summary */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-orange-50 text-orange-700">3. Resumen</Badge>
                    <h3 className="font-semibold text-lg">Resumen del Plan de Formación</h3>
                  </div>
                  <Textarea 
                    value={selectedProfile.training_summary || ''} 
                    onChange={(e) => handleUpdateProfile('training_summary', e.target.value)}
                    className="min-h-[80px]"
                    placeholder="Resumen ejecutivo del plan de formación..."
                  />
                </div>

                <Separator />

                {/* 4. Onboarding */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700">4. Detalle</Badge>
                      <h3 className="font-semibold text-lg">Detalle de Fases de Formación (Onboarding)</h3>
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
                            <div className="border rounded-md mt-1">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[40px] p-2 text-center">OK</TableHead>
                                    <TableHead className="p-2">Hito</TableHead>
                                    <TableHead className="p-2 w-[140px]">Responsable</TableHead>
                                    <TableHead className="p-2 w-[160px]">Documento</TableHead>
                                    <TableHead className="w-[40px] p-2"></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {Array.isArray(phase.milestones) ? phase.milestones.map((milestone, mIdx) => (
                                    <TableRow key={mIdx}>
                                      <TableCell className="p-2 align-top text-center">
                                        <Checkbox 
                                          checked={milestone.completed}
                                          onCheckedChange={(checked) => {
                                            const newOnboarding = [...selectedProfile.onboarding];
                                            newOnboarding[idx].milestones[mIdx].completed = checked;
                                            handleUpdateProfile('onboarding', newOnboarding);
                                          }}
                                        />
                                      </TableCell>
                                      <TableCell className="p-2 align-top">
                                        <Textarea 
                                          value={milestone.text}
                                          onChange={(e) => {
                                            const newOnboarding = [...selectedProfile.onboarding];
                                            newOnboarding[idx].milestones[mIdx].text = e.target.value;
                                            handleUpdateProfile('onboarding', newOnboarding);
                                          }}
                                          className="min-h-[38px] h-auto resize-none py-2 text-sm"
                                          placeholder="Descripción del hito..."
                                        />
                                      </TableCell>
                                      <TableCell className="p-2 align-top">
                                         <Input 
                                          value={milestone.responsible}
                                          onChange={(e) => {
                                            const newOnboarding = [...selectedProfile.onboarding];
                                            newOnboarding[idx].milestones[mIdx].responsible = e.target.value;
                                            handleUpdateProfile('onboarding', newOnboarding);
                                          }}
                                          placeholder="Rol/Persona"
                                          className="h-9 text-xs"
                                        />
                                      </TableCell>
                                      <TableCell className="p-2 align-top">
                                        <Select 
                                          value={milestone.resourceId || "none"} 
                                          onValueChange={(val) => {
                                            const newOnboarding = [...selectedProfile.onboarding];
                                            newOnboarding[idx].milestones[mIdx].resourceId = val === "none" ? "" : val;
                                            handleUpdateProfile('onboarding', newOnboarding);
                                          }}
                                        >
                                          <SelectTrigger className="h-9 text-xs w-full">
                                            <SelectValue placeholder="Seleccionar..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">Ninguno</SelectItem>
                                            {trainingDocs.length > 0 ? (
                                              trainingDocs.map(doc => (
                                                <SelectItem key={doc.id} value={doc.id} className="text-xs">
                                                  {doc.title}
                                                </SelectItem>
                                              ))
                                            ) : (
                                              <SelectItem value="no-docs" disabled>No hay documentos disponibles</SelectItem>
                                            )}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell className="p-2 align-top">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                           const newOnboarding = [...selectedProfile.onboarding];
                                           newOnboarding[idx].milestones = newOnboarding[idx].milestones.filter((_, i) => i !== mIdx);
                                           handleUpdateProfile('onboarding', newOnboarding);
                                        }}>
                                          <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-500" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  )) : (
                                    <TableRow>
                                      <TableCell colSpan={5} className="text-center text-red-500 p-4">
                                        Error de formato en hitos. Guarde para corregir.
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="w-full text-xs text-muted-foreground hover:text-primary rounded-t-none border-t"
                                onClick={() => {
                                  const newOnboarding = [...selectedProfile.onboarding];
                                  if (!Array.isArray(newOnboarding[idx].milestones)) newOnboarding[idx].milestones = [];
                                  newOnboarding[idx].milestones.push({ text: "", responsible: "", resourceId: "", completed: false });
                                  handleUpdateProfile('onboarding', newOnboarding);
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" /> Añadir Hito
                              </Button>
                            </div>
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

                {/* 5. Protocolos */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">5. Protocolos</Badge>
                    <Input 
                      value={selectedProfile.section5_title || "Protocolos y Estándares"} 
                      onChange={(e) => handleUpdateProfile('section5_title', e.target.value)}
                      className="font-semibold text-lg h-auto border-transparent hover:border-input px-0 focus-visible:ring-0"
                    />
                  </div>
                  
                  {(selectedProfile.protocols || []).map((proto, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="grid gap-2">
                        <Input 
                          value={proto.title} 
                          onChange={(e) => {
                            const newProto = [...selectedProfile.protocols];
                            newProto[idx].title = e.target.value;
                            handleUpdateProfile('protocols', newProto);
                          }}
                          placeholder="Título del protocolo"
                          className="font-medium"
                        />
                        <Input 
                          value={proto.description} 
                          onChange={(e) => {
                            const newProto = [...selectedProfile.protocols];
                            newProto[idx].description = e.target.value;
                            handleUpdateProfile('protocols', newProto);
                          }}
                          placeholder="Descripción breve"
                        />
                      </div>
                    </Card>
                  ))}
                </div>

                <Separator />

                {/* 6. Handover */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-red-50 text-red-700">6. Relevos</Badge>
                    <Input 
                      value={selectedProfile.section6_title || "Estándares de Relevo (Handover)"} 
                      onChange={(e) => handleUpdateProfile('section6_title', e.target.value)}
                      className="font-semibold text-lg h-auto border-transparent hover:border-input px-0 focus-visible:ring-0"
                    />
                  </div>
                  <Textarea 
                    value={(selectedProfile.handover || []).join('\n')}
                    onChange={(e) => handleUpdateProfile('handover', e.target.value.split('\n'))}
                    className="min-h-[100px]"
                    placeholder="Lista de puntos clave para el relevo (uno por línea)"
                  />
                </div>

                <Separator />

                {/* 7. Troubleshooting */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                     <Badge variant="outline" className="bg-gray-50 text-gray-700">7. Averías</Badge>
                     <Input 
                       value={selectedProfile.section7_title || "Guía de Resolución de Averías"} 
                       onChange={(e) => handleUpdateProfile('section7_title', e.target.value)}
                       className="font-semibold text-lg h-auto border-transparent hover:border-input px-0 focus-visible:ring-0"
                     />
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

      {/* Training Plans Catalog Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Catálogo de Planes de Formación Disponibles
              </CardTitle>
              <CardDescription>
                Planes configurados que puedes asignar a los perfiles de puesto
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {trainingPlans && trainingPlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trainingPlans.map((plan) => (
                <Card key={plan.id} className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{plan.title}</h4>
                        {plan.duration && (
                          <Badge variant="outline" className="text-xs">
                            {plan.duration}
                          </Badge>
                        )}
                      </div>
                      
                      {plan.colectivo && (
                        <Badge className="bg-purple-100 text-purple-800 text-xs">
                          {plan.colectivo}
                        </Badge>
                      )}
                      
                      {plan.description && (
                        <p className="text-sm text-slate-600">{plan.description}</p>
                      )}

                      <div className="flex gap-4 text-xs text-slate-500 pt-2">
                        {plan.documents && plan.documents.length > 0 && (
                          <span>📄 {plan.documents.length} documentos</span>
                        )}
                        {plan.files && plan.files.length > 0 && (
                          <span>📎 {plan.files.length} archivos</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
              <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm mb-2">
                No hay planes de formación configurados
              </p>
              <p className="text-xs text-slate-400">
                Ve a la pestaña "Formaciones" para crear planes de formación
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}