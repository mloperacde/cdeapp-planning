import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function AppUserManagement() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link to="/Configuration">
            <Button type="button" variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Gestión de Usuarios de la App
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Esta sección permitirá invitar usuarios, gestionar roles (Admin/User) y
              revisar el estado de acceso a la app móvil y web.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Por ahora es una pantalla placeholder para que los enlaces de
              navegación y configuración funcionen correctamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

