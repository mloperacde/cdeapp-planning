import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function CompensationPolicyManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          Políticas Retributivas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-slate-400">
          <p>Módulo de políticas retributivas en desarrollo</p>
        </div>
      </CardContent>
    </Card>
  );
}