 
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MaintenanceTrackingPage from "./MaintenanceTracking";

export default function MachineMaintenancePage() {
  return (
    <div>
      <div className="p-6 md:p-8 print:hidden">
        <div className="max-w-7xl mx-auto mb-6">
          <Link to={createPageUrl("Machines")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Máquinas
            </Button>
          </Link>
        </div>
      </div>
      <MaintenanceTrackingPage />
    </div>
  );
}
