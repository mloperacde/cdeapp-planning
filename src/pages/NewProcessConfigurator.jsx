import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewProcessConfigurator() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo Configurador de Procesos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Esperando el código fuente. Por favor, pega el código aquí para continuar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
