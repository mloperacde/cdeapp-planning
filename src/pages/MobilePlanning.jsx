import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CalendarDays, ArrowLeft } from "lucide-react";
import ErrorBoundary from "@/components/common/ErrorBoundary";

export default function MobilePlanning() {
  return (
    <ErrorBoundary>
      <div className="p-4 max-w-md mx-auto space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            Mi Planning
          </h1>
          <Link to={createPageUrl("Mobile")}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardContent className="p-4">
            <p className="text-slate-500 text-center">No hay turnos asignados para esta semana.</p>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}