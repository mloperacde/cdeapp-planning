import { ArrowLeft, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmployeeSkillsMatrix from "../components/skillmatrix/EmployeeSkillsMatrix";
import { useNavigationHistory } from "../components/utils/useNavigationHistory";

export default function AlmacenSkills() {
  const { goBack } = useNavigationHistory();

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={goBack} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Award className="w-8 h-8 text-blue-600" />
            Habilidades Almacén
          </h1>
          <p className="text-slate-600 mt-1">
            Gestión de habilidades del personal de Almacén.
          </p>
        </div>

        <EmployeeSkillsMatrix defaultDepartment="ALMACEN" fixedDepartment={true} />
      </div>
    </div>
  );
}

