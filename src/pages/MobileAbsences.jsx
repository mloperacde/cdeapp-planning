import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Plus, ArrowLeft } from "lucide-react";
import UnifiedAbsenceManager from "@/components/absences/UnifiedAbsenceManager";
import ErrorBoundary from "@/components/common/ErrorBoundary";

export default function MobileAbsences() {
  return (
    <ErrorBoundary>
      <div className="p-4 max-w-md mx-auto space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Mis Ausencias
          </h1>
          <Link to={createPageUrl("Mobile")}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver
            </Button>
          </Link>
        </div>
        
        <UnifiedAbsenceManager isMobile={true} />
      </div>
    </ErrorBoundary>
  );
}