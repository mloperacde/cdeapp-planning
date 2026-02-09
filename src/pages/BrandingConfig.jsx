import { ArrowLeft, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BrandingConfig from "../components/config/BrandingConfig";

export default function BrandingConfigPage() {
  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      <div className="w-full flex flex-col gap-6">
        {/* Header Estándar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Apariencia y Marca
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Personaliza el logotipo, nombre y colores de la aplicación
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={createPageUrl("Configuration")}>
              <Button variant="ghost" size="sm" className="h-8 gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Volver</span>
              </Button>
            </Link>
          </div>
        </div>

        <BrandingConfig />
      </div>
    </div>
  );
}
