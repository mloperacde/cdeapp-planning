import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageSquare } from "lucide-react";

export default function MobileChat() {
  return (
    <div className="p-4 max-w-md mx-auto h-screen flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Chat de Empresa
        </h1>
        <Link to={createPageUrl("Dashboard")}>
          <Button variant="ghost" size="sm">Volver</Button>
        </Link>
      </div>
      
      <Card className="flex-1 flex items-center justify-center bg-slate-50">
        <CardContent className="text-center p-6">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900">Chat Móvil</h3>
          <p className="text-slate-500 mt-2">Selecciona un canal para comenzar a chatear.</p>
        </CardContent>
      </Card>
    </div>
  );
}