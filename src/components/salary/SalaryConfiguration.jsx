import React, { useState, useEffect } from "react";
import { useSalaryData } from "./SalaryProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar, Settings, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function SalaryConfiguration() {
  const { globalConfig, saveGlobalConfig } = useSalaryData();
  const [formData, setFormData] = useState({
    annual_pay_count: 14,
    pay_dates: []
  });

  // Load initial data
  useEffect(() => {
    if (globalConfig) {
      setFormData({
        annual_pay_count: globalConfig.annual_pay_count || 14,
        pay_dates: globalConfig.pay_dates || []
      });
    }
  }, [globalConfig]);

  const handlePayCountChange = (e) => {
    const count = parseInt(e.target.value) || 12;
    // Resize pay_dates array
    const currentDates = [...formData.pay_dates];
    let newDates = [];
    
    if (count > currentDates.length) {
      // Add empty slots
      newDates = [...currentDates, ...Array(count - currentDates.length).fill("")];
    } else {
      // Trim
      newDates = currentDates.slice(0, count);
    }

    setFormData({
      ...formData,
      annual_pay_count: count,
      pay_dates: newDates
    });
  };

  const handleDateChange = (index, value) => {
    const newDates = [...formData.pay_dates];
    newDates[index] = value;
    setFormData({ ...formData, pay_dates: newDates });
  };

  const handleSave = () => {
    saveGlobalConfig(formData);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-600" />
          Configuración Global de Nóminas
        </h1>
        <p className="text-slate-500">
          Define el número de pagas anuales y el calendario de devengo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-slate-800">
            Parámetros Generales
          </CardTitle>
          <CardDescription>
            Esta configuración afectará al cálculo automático de salarios anuales en las políticas retributivas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="pay_count" className="text-sm font-medium">
                Número de Pagas Anuales
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="pay_count"
                  type="number"
                  min="1"
                  max="24"
                  value={formData.annual_pay_count}
                  onChange={handlePayCountChange}
                  className="w-32 font-bold text-lg text-center"
                />
                <span className="text-sm text-slate-500">pagas / año</span>
              </div>
              <p className="text-xs text-slate-400">
                Por defecto: 14 pagas (12 mensualidades + 2 extras)
              </p>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Importante</p>
                <p>
                  Si cambias el número de pagas, asegúrate de revisar las fechas de devengo. 
                  El cálculo "Salario Mensual × Nº Pagas" usará este valor.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <Label className="text-sm font-medium mb-4 block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Calendario de Pagas ({formData.annual_pay_count})
            </Label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: formData.annual_pay_count }).map((_, index) => (
                <div key={index} className="space-y-1.5">
                  <Label className="text-xs text-slate-500">
                    Paga #{index + 1}
                  </Label>
                  <Input
                    type="date"
                    value={formData.pay_dates[index] || ""}
                    onChange={(e) => handleDateChange(index, e.target.value)}
                    className="text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} className="gap-2 bg-slate-900 hover:bg-slate-800">
              <Save className="w-4 h-4" />
              Guardar Configuración
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
