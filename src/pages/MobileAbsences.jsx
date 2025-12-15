import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Plus } from "lucide-react";
import UnifiedAbsenceManager from "@/components/absences/UnifiedAbsenceManager";

export default function MobileAbsences() {
  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Mis Ausencias
        </h1>
        <Link to={createPageUrl("Dashboard")}>
          <Button variant="ghost" size="sm">Volver</Button>
        </Link>
      </div>
      
      <UnifiedAbsenceManager isMobile={true} />
    </div>
  );
}