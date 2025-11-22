import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import EmployeeReadOnlyList from "../components/employees/EmployeeReadOnlyList";
import ThemeToggle from "../components/common/ThemeToggle";

export default function EmployeeListPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("ShiftManagers")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Jefes de Turno
            </Button>
          </Link>
        </div>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Lista de Empleados
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Vista de consulta del personal con filtros avanzados
            </p>
          </div>
          <ThemeToggle />
        </div>

        <EmployeeReadOnlyList />
      </div>
    </div>
  );
}