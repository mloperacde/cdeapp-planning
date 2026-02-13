import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function PayrollProcessing() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Procesamiento de Nóminas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-slate-400">
          <p>Módulo de procesamiento de nóminas en desarrollo</p>
        </div>
      </CardContent>
    </Card>
  );
}