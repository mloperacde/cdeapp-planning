import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CalendarDays } from "lucide-react";

export default function MobilePlanning() {
  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-indigo-600" />
          Mi Planning
        </h1>
        <Link to={createPageUrl("Dashboard")}>
          <Button variant="ghost" size="sm">Volver</Button>
        </Link>
      </div>
      
      <Card>
        <CardContent className="p-4">
          <p className="text-slate-500 text-center">No hay turnos asignados para esta semana.</p>
        </CardContent>
      </Card>
    </div>
  );
}