import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BrandingConfig from "../components/config/BrandingConfig";

export default function BrandingConfigPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Apariencia y Marca
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Personaliza el logotipo, nombre y colores de la aplicación
          </p>
        </div>

        <BrandingConfig />
      </div>
    </div>
  );
}
