import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, Database, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function LockerDataCleanup() {
  const [cleaning, setCleaning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const queryClient = useQueryClient();

  const { data: lockerAssignments } = useQuery({
    queryKey: ['lockerAssignments'],
    queryFn: () => base44.entities.LockerAssignment.list(),
    initialData: [],
  });

  const recordsWithQuotes = lockerAssignments.filter(la => {
    const hasQuotesInActual = la.numero_taquilla_actual && 
      (la.numero_taquilla_actual.includes('"') || la.numero_taquilla_actual.includes("'"));
    const hasQuotesInNuevo = la.numero_taquilla_nuevo && 
      (la.numero_taquilla_nuevo.includes('"') || la.numero_taquilla_nuevo.includes("'"));
    
    return hasQuotesInActual || hasQuotesInNuevo;
  });

  const handleCleanData = async () => {
    if (!window.confirm(`¿Limpiar comillas de ${recordsWithQuotes.length} registros?`)) {
      return;
    }

    setCleaning(true);
    setProgress(0);
    const cleaned = [];
    const errors = [];

    try {
      for (let i = 0; i < recordsWithQuotes.length; i++) {
        const assignment = recordsWithQuotes[i];
        
        try {
          const cleanActual = (assignment.numero_taquilla_actual || '')
            .replace(/['"]/g, '')
            .trim();
          
          const cleanNuevo = (assignment.numero_taquilla_nuevo || '')
            .replace(/['"]/g, '')
            .trim();

          await base44.entities.LockerAssignment.update(assignment.id, {
            numero_taquilla_actual: cleanActual,
            numero_taquilla_nuevo: cleanNuevo
          });

          cleaned.push(assignment.id);
        } catch (error) {
          errors.push({
            id: assignment.id,
            error: error.message
          });
        }

        setProgress(Math.round(((i + 1) / recordsWithQuotes.length) * 100));
      }

      setResults({ cleaned: cleaned.length, errors: errors.length });
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      
      toast.success(`✅ Limpieza completada: ${cleaned.length} registros actualizados`);
      if (errors.length > 0) {
        toast.error(`⚠️ ${errors.length} errores durante la limpieza`);
      }
    } catch (error) {
      toast.error("Error durante la limpieza de datos");
      console.error(error);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" />
            Limpieza de Datos - Taquillas
          </h1>
          <p className="text-slate-600 mt-1">
            Herramienta para limpiar comillas en identificadores de taquillas
          </p>
        </div>

        <div className="space-y-6">
          <Card className={`shadow-lg ${recordsWithQuotes.length > 0 ? 'bg-amber-50 border-2 border-amber-300' : 'bg-green-50 border-2 border-green-300'}`}>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                {recordsWithQuotes.length > 0 ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Registros Problemáticos Detectados
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Base de Datos Limpia
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {recordsWithQuotes.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-lg font-bold text-slate-900">
                          {recordsWithQuotes.length} registros
                        </p>
                        <p className="text-sm text-slate-600">
                          Contienen comillas dobles o simples en los identificadores
                        </p>
                      </div>
                      <Badge className="bg-amber-600 text-white text-lg px-4 py-2">
                        Acción requerida
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">
                        ¿Qué hace esta herramienta?
                      </p>
                      <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
                        <li>Elimina todas las comillas dobles (") y simples (') de los identificadores</li>
                        <li>Limpia espacios al inicio y final</li>
                        <li>Actualiza tanto taquilla_actual como taquilla_nuevo</li>
                        <li>Preserva el historial de cambios y otros datos</li>
                      </ul>
                    </div>

                    {!cleaning && !results && (
                      <Button
                        onClick={handleCleanData}
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                        size="lg"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Limpiar {recordsWithQuotes.length} Registros
                      </Button>
                    )}
                  </div>

                  {cleaning && (
                    <div className="bg-white rounded-lg p-4 border">
                      <p className="text-sm font-semibold text-slate-700 mb-3">
                        Limpiando registros... {progress}%
                      </p>
                      <Progress value={progress} className="w-full" />
                    </div>
                  )}

                  {results && (
                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <p className="font-semibold text-green-900">Limpieza Completada</p>
                      </div>
                      <div className="text-sm text-green-800 space-y-1">
                        <p>✅ {results.cleaned} registros actualizados correctamente</p>
                        {results.errors > 0 && (
                          <p className="text-red-600">⚠️ {results.errors} errores</p>
                        )}
                      </div>
                      <Button
                        onClick={() => window.location.reload()}
                        className="w-full mt-3 bg-green-600 hover:bg-green-700"
                      >
                        Recargar Página
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-green-900">
                    ✅ No se encontraron problemas
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Todos los identificadores de taquillas están limpios
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="border-b">
              <CardTitle>Ejemplos de Registros con Comillas</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {recordsWithQuotes.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recordsWithQuotes.slice(0, 10).map((assignment) => (
                    <div key={assignment.id} className="p-3 bg-slate-50 rounded border text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-red-600">Actual: {assignment.numero_taquilla_actual || 'vacío'}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-green-600">
                          Limpio: {(assignment.numero_taquilla_actual || '').replace(/['"]/g, '').trim() || 'vacío'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {recordsWithQuotes.length > 10 && (
                    <p className="text-xs text-slate-500 text-center pt-2">
                      ... y {recordsWithQuotes.length - 10} más
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4">
                  No hay ejemplos para mostrar
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}