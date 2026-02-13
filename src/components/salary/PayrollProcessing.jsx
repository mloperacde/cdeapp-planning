import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Calculator, History, Play, Download, CheckCircle } from "lucide-react";
import PayrollSimulator from "./PayrollSimulator";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PayrollProcessing() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("simulator");
  const [batchPeriod, setBatchPeriod] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));

  const { data: payrollRecords = [] } = useQuery({
    queryKey: ['payrollRecords'],
    queryFn: () => base44.entities.PayrollRecord.list('-pay_period_start', 50),
  });

  const processBatchMutation = useMutation({
    mutationFn: async (period) => {
      toast.info("Iniciando procesamiento masivo...");
      // Aquí iría la llamada a la función backend cuando la creemos
      return { processed: 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollRecords'] });
      toast.success("Nóminas procesadas correctamente");
    },
  });

  const getStatusColor = (status) => {
    const colors = {
      "Borrador": "bg-slate-100 text-slate-700",
      "Calculada": "bg-blue-100 text-blue-700",
      "Validada": "bg-purple-100 text-purple-700",
      "Aprobada": "bg-green-100 text-green-700",
      "Procesada": "bg-indigo-100 text-indigo-700",
      "Pagada": "bg-emerald-100 text-emerald-700"
    };
    return colors[status] || "bg-slate-100 text-slate-700";
  };

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList>
          <TabsTrigger value="simulator">
            <Calculator className="w-4 h-4 mr-2" />
            Simulador
          </TabsTrigger>
          <TabsTrigger value="batch">
            <Play className="w-4 h-4 mr-2" />
            Procesamiento Masivo
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simulator" className="flex-1 mt-4">
          <PayrollSimulator />
        </TabsContent>

        <TabsContent value="batch" className="flex-1 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Procesamiento Masivo de Nóminas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Periodo de Nómina</Label>
                <Input
                  type="month"
                  value={batchPeriod.substring(0, 7)}
                  onChange={(e) => {
                    const [year, month] = e.target.value.split('-');
                    setBatchPeriod(format(new Date(year, month - 1, 1), 'yyyy-MM-dd'));
                  }}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium mb-2">Información del Proceso:</h4>
                <ul className="text-sm space-y-1 text-slate-700">
                  <li>• Se calcularán nóminas para todos los empleados activos</li>
                  <li>• Se tendrán en cuenta ausencias no remuneradas</li>
                  <li>• Las nóminas quedarán en estado "Calculada"</li>
                  <li>• Podrás revisar y aprobar individualmente</li>
                </ul>
              </div>

              <Button 
                className="w-full" 
                onClick={() => processBatchMutation.mutate(batchPeriod)}
                disabled={processBatchMutation.isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                {processBatchMutation.isPending ? "Procesando..." : "Calcular Todas las Nóminas"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="flex-1 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Nóminas Procesadas</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-2">
                  {payrollRecords.map((record) => (
                    <Card key={record.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold">{record.employee_name}</h4>
                              <Badge className={getStatusColor(record.status)}>
                                {record.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-slate-500">Periodo:</span>
                                <p className="font-medium">{record.payroll_period}</p>
                              </div>
                              <div>
                                <span className="text-slate-500">Neto:</span>
                                <p className="font-medium text-emerald-600">{record.net_salary?.toFixed(2)}€</p>
                              </div>
                              <div>
                                <span className="text-slate-500">Bruto:</span>
                                <p className="font-medium">{record.gross_salary?.toFixed(2)}€</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {record.payslip_url && (
                              <Button variant="outline" size="sm">
                                <Download className="w-4 h-4 mr-2" />
                                PDF
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {payrollRecords.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No hay nóminas procesadas</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}