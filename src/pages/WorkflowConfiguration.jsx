import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Workflow } from "lucide-react";
import WorkflowRuleManager from "../components/workflows/WorkflowRuleManager";

export default function WorkflowConfigurationPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>

        <WorkflowRuleManager />
      </div>
    </div>
  );
}