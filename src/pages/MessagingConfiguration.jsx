import { ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AdminOnly from "@/components/security/AdminOnly";
import NotificationTemplateManager from "../components/notifications/NotificationTemplateManager";

export default function MessagingConfiguration() {
  return (
    <AdminOnly message="Solo administradores pueden configurar la mensajería">
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-indigo-600" />
              Configuración de Mensajería
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Gestiona plantillas de mensajes y notificaciones del sistema
            </p>
          </div>

          <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-6">
            <NotificationTemplateManager />
          </div>
        </div>
      </div>
    </AdminOnly>
  );
}
