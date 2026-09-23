import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, ExternalLink, Copy, Users } from "lucide-react";
import { toast } from "sonner";

export default function EmployeeExportEndpoint() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const endpointUrl = "https://cdeplanning.base44.app/functions/exportEmployeesToCdeApp";

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(endpointUrl);
    toast.success("URL copiada al portapapeles");
  };

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      // Obtener la API key de CDEApp (necesita ser admin) — POST, no GET
      const keyRes = await fetch("/functions/getCdeApiKey", {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!keyRes.ok) {
        const errData = await keyRes.json().catch(() => ({}));
        throw new Error(errData.error || "No se pudo obtener la API key de CDEApp (requiere permisos de admin)");
      }
      const { apiKey } = await keyRes.json();

      // Llamar al endpoint de exportación con limit=5 para test
      const res = await fetch(`${endpointUrl}?limit=5`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Error HTTP ${res.status}`);
      }

      setResult(data);
      toast.success(`Endpoint OK: ${data.total} empleados exportados`);
    } catch (e) {
      toast.error(`Error: ${e.message}`);
      setResult({ error: e.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" />
          API de Empleados para CDEApp
        </CardTitle>
        <CardDescription>
          Endpoint que CDEApp consulta para sincronizar la base de datos de empleados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL del endpoint */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">URL del Endpoint</span>
            <Button size="sm" variant="ghost" onClick={handleCopyUrl}>
              <Copy className="w-3.5 h-3.5 mr-1" /> Copiar
            </Button>
          </div>
          <div className="bg-slate-950 text-slate-200 p-3 rounded-lg text-xs font-mono break-all">
            GET {endpointUrl}
          </div>
          <p className="text-xs text-slate-500">
            Autenticación: cabecera <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">X-API-Key</code> con la misma clave de CDEApp.
          </p>
        </div>

        {/* Campos exportados */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Campos Exportados (21)</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              "Código Empleado", "Nombre", "Estado", "Departamento", "Puesto",
              "Categoría", "Fecha Alta", "Fecha Baja", "DNI", "Sexo",
              "Nacionalidad", "Dirección", "Email", "Teléfono Móvil",
              "Contacto Emergencia Nombre", "Contacto Emergencia Teléfono",
              "Contacto Emergencia Relación", "Tipo de jornada",
              "Horas jornada", "Tipo de turno", "Turno/Equipo",
            ].map((field) => (
              <Badge key={field} variant="secondary" className="text-xs font-normal">
                {field}
              </Badge>
            ))}
          </div>
        </div>

        {/* Parámetros opcionales */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Parámetros Opcionales</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <div><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">?departamento=</code> — Filtra por departamento</div>
            <div><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">?estado=Alta</code> — Filtra por estado (Alta/Baja/Excedencia)</div>
            <div><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">?updated_since=ISO</code> — Sync incremental</div>
            <div><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">?limit=5000</code> — Límite de registros (máx 5000)</div>
          </div>
        </div>

        {/* Botón de prueba */}
        <div className="flex items-center gap-3">
          <Button onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
            Probar Endpoint
          </Button>
          {result && !result.error && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span><strong>{result.total}</strong> empleados exportados</span>
              <span className="text-slate-400 text-xs">· {new Date(result.exported_at).toLocaleString()}</span>
            </div>
          )}
          {result && result.error && (
            <div className="text-sm text-red-600">
              {result.error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}