import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, CheckCircle2, FileText, MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function OnboardingAIAssistant({ employee }) {
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [welcomeMessage, setWelcomeMessage] = useState(null);
  const [faqData, setFaqData] = useState(null);
  const [question, setQuestion] = useState("");

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Genera un plan de onboarding personalizado para:
      - Empleado: ${employee.nombre}
      - Puesto: ${employee.puesto || 'No especificado'}
      - Departamento: ${employee.departamento || 'No especificado'}
      - Tipo de Turno: ${employee.tipo_turno}
      
      Incluye tareas específicas para las primeras semanas, formaciones necesarias, personas clave a conocer, y objetivos a corto plazo.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            semana_1: { type: "array", items: { type: "string" } },
            semana_2: { type: "array", items: { type: "string" } },
            semana_3: { type: "array", items: { type: "string" } },
            semana_4: { type: "array", items: { type: "string" } },
            formaciones_necesarias: { type: "array", items: { type: "string" } },
            personas_clave: { type: "array", items: { type: "string" } },
            objetivos_primer_mes: { type: "array", items: { type: "string" } }
          }
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setGeneratedPlan(data);
    }
  });

  const generateWelcomeMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Genera un mensaje de bienvenida personalizado y cálido para:
      - Empleado: ${employee.nombre}
      - Puesto: ${employee.puesto || 'No especificado'}
      - Departamento: ${employee.departamento || 'No especificado'}
      
      El mensaje debe ser profesional pero cercano, mencionar el equipo y desearle éxito.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt
      });

      return response;
    },
    onSuccess: (data) => {
      setWelcomeMessage(data);
    }
  });

  const askFAQMutation = useMutation({
    mutationFn: async (userQuestion) => {
      const prompt = `Eres un asistente de RRHH para nuevos empleados. Responde esta pregunta de forma clara y concisa:
      
      Pregunta: ${userQuestion}
      
      Contexto del empleado:
      - Puesto: ${employee.puesto || 'No especificado'}
      - Departamento: ${employee.departamento || 'No especificado'}
      - Tipo de Turno: ${employee.tipo_turno}
      
      Proporciona una respuesta útil y profesional.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt
      });

      return response;
    },
    onSuccess: (data) => {
      setFaqData(data);
    }
  });

  const handleAskQuestion = (e) => {
    e.preventDefault();
    if (question.trim()) {
      askFAQMutation.mutate(question);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Asistente IA de Onboarding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={() => generatePlanMutation.mutate()}
              disabled={generatePlanMutation.isPending}
              className="bg-purple-600"
            >
              {generatePlanMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Generar Plan Personalizado
            </Button>

            <Button
              onClick={() => generateWelcomeMutation.mutate()}
              disabled={generateWelcomeMutation.isPending}
              variant="outline"
            >
              {generateWelcomeMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="w-4 h-4 mr-2" />
              )}
              Generar Mensaje de Bienvenida
            </Button>
          </div>

          {generatedPlan && (
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Plan de Onboarding Generado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-purple-900 mb-2">Semana 1</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {generatedPlan.semana_1?.map((task, i) => (
                      <li key={i} className="text-sm text-slate-700">{task}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-purple-900 mb-2">Semana 2</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {generatedPlan.semana_2?.map((task, i) => (
                      <li key={i} className="text-sm text-slate-700">{task}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-purple-900 mb-2">Formaciones Necesarias</h4>
                  <div className="flex flex-wrap gap-2">
                    {generatedPlan.formaciones_necesarias?.map((f, i) => (
                      <Badge key={i} variant="outline">{f}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-purple-900 mb-2">Objetivos Primer Mes</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {generatedPlan.objetivos_primer_mes?.map((obj, i) => (
                      <li key={i} className="text-sm text-slate-700">
                        <CheckCircle2 className="w-3 h-3 inline mr-1 text-green-600" />
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {welcomeMessage && (
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Mensaje de Bienvenida</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{welcomeMessage}</p>
              </CardContent>
            </Card>
          )}

          <Card className="bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Asistente FAQ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAskQuestion} className="space-y-3">
                <Textarea
                  placeholder="Pregunta sobre políticas, procedimientos, beneficios..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={3}
                />
                <Button
                  type="submit"
                  disabled={askFAQMutation.isPending || !question.trim()}
                  className="w-full bg-blue-600"
                >
                  {askFAQMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Consultar IA
                </Button>
              </form>

              {faqData && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{faqData}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}