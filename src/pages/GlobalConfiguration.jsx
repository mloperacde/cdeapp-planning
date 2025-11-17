import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, ArrowLeft, Building2, Briefcase, Users, FileText, GraduationCap, Globe, LayoutDashboard } from "lucide-react";
import ConfigListManager from "../components/config/ConfigListManager";
import DashboardRoleConfigurator from "../components/config/DashboardRoleConfigurator";

export default function GlobalConfigurationPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("departamentos");

  const configSections = [
    {
      key: "departamentos",
      label: "Departamentos",
      icon: Building2,
      description: "Gestiona los departamentos de la empresa",
      color: "blue"
    },
    {
      key: "tipos_contrato",
      label: "Tipos de Contrato",
      icon: FileText,
      description: "Define los tipos de contrato disponibles",
      color: "purple"
    },
    {
      key: "puestos",
      label: "Puestos de Trabajo",
      icon: Briefcase,
      description: "Configura los puestos disponibles",
      color: "green"
    },
    {
      key: "categorias_profesionales",
      label: "Categorías Profesionales",
      icon: Users,
      description: "Define las categorías profesionales",
      color: "orange"
    },
    {
      key: "formaciones",
      label: "Tipos de Formación",
      icon: GraduationCap,
      description: "Configura tipos de formación académica",
      color: "indigo"
    },
    {
      key: "nacionalidades",
      label: "Nacionalidades",
      icon: Globe,
      description: "Gestiona nacionalidades disponibles",
      color: "pink"
    },
    {
      key: "dashboard",
      label: "Dashboard por Roles",
      icon: LayoutDashboard,
      description: "Configura qué ve cada rol en el dashboard",
      color: "emerald"
    }
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            Configuración Global
          </h1>
          <p className="text-slate-600 mt-1">
            Gestiona configuraciones centralizadas que afectan a toda la aplicación
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7 mb-6">
            {configSections.map(section => {
              const Icon = section.icon;
              return (
                <TabsTrigger key={section.key} value={section.key} className="text-xs">
                  <Icon className="w-4 h-4 mr-1" />
                  {section.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {configSections.slice(0, -1).map(section => (
            <TabsContent key={section.key} value={section.key}>
              <ConfigListManager configKey={section.key} config={section} />
            </TabsContent>
          ))}

          <TabsContent value="dashboard">
            <DashboardRoleConfigurator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}