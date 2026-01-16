

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Palmtree } from "lucide-react";
import VacationPendingBalancePanel from "@/components/absences/VacationPendingBalancePanel";

export default function MobileVacations() {
  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Palmtree className="w-5 h-5 text-amber-500" />
          Mis Vacaciones
        </h1>
        <Link to={createPageUrl("Dashboard")}>
          <Button variant="ghost" size="sm">Volver</Button>
        </Link>
      </div>
      
      <VacationPendingBalancePanel isMobile={true} />
    </div>
  );
}
