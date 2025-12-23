import React from "react";
import { ArrowLeft, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ProtectedPage from "../components/roles/ProtectedPage";
import Breadcrumbs from "../components/common/Breadcrumbs";
import BrandingConfig from "../components/config/BrandingConfig";

export default function BrandingConfigPage() {
  return (
    <ProtectedPage module="configuration" action="edit_general">
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <Breadcrumbs items={[
            { label: "Configuración", url: createPageUrl("Configuration") },
            { label: "Apariencia y Marca" }
          ]} />

          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Palette className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
              Apariencia y Marca
            </h1>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-1">
              Personaliza el logotipo, nombre y colores de la aplicación
            </p>
          </div>

          <BrandingConfig />
        </div>
      </div>
    </ProtectedPage>
  );
}