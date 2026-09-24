import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, FileWarning, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import RequiredFieldsConfig from "@/components/master/RequiredFieldsConfig";
import MissingDataReport from "@/components/master/MissingDataReport";

export default function EmployeeDataIntegrity() {
  const [activeTab, setActiveTab] = useState("config");

  return (
    <div className="h-full flex flex-col p-4 gap-3 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 p-3 px-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/MasterEmployeeDatabase" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Integridad de Datos de Empleados
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Configura campos obligatorios y revisa empleados con datos incompletos
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full max-w-md grid-cols-2 shrink-0">
          <TabsTrigger value="config" className="text-xs">
            <ShieldCheck className="w-4 h-4 mr-2" />
            Campos Obligatorios
          </TabsTrigger>
          <TabsTrigger value="report" className="text-xs">
            <FileWarning className="w-4 h-4 mr-2" />
            Datos Faltantes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="flex-1 overflow-auto mt-3">
          <RequiredFieldsConfig />
        </TabsContent>

        <TabsContent value="report" className="flex-1 flex flex-col min-h-0 mt-3 overflow-hidden">
          <MissingDataReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}