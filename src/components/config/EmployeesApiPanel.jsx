import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, CheckCircle, Key, Globe, Database, RefreshCw, Code } from 'lucide-react';

export default function EmployeesApiPanel() {
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState('');

  const functionUrl = 'https://app.base44.com/api/functions/getEmployeesApi'; // placeholder

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke('getEmployeesApi', { limit: 5 });
      setTestResult({ ok: true, data: res.data });
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
    } finally {
      setTesting(false);
    }
  };

  const endpoints = [
    {
      label: 'Todos los empleados',
      description: 'Obtiene todos los empleados activos e inactivos',
      url: '/functions/getEmployeesApi',
    },
    {
      label: 'Solo activos',
      description: 'Filtrar solo empleados activos',
      url: '/functions/getEmployeesApi?activo=true',
    },
    {
      label: 'Por departamento',
      description: 'Filtrar por departamento específico',
      url: '/functions/getEmployeesApi?departamento=Fabricacion',
    },
    {
      label: 'Sync incremental',
      description: 'Solo empleados modificados desde una fecha',
      url: '/functions/getEmployeesApi?updated_since=2024-01-01T00:00:00Z',
    },
    {
      label: 'Con paginación',
      description: 'Paginar resultados (limit y offset)',
      url: '/functions/getEmployeesApi?limit=100&offset=0',
    },
  ];

  const curlExample = `curl -X GET \\
  "https://[TU-APP].base44.app/functions/getEmployeesApi?activo=true" \\
  -H "x-api-key: [EMPLOYEES_API_KEY]" \\
  -H "Content-Type: application/json"`;

  const phpExample = `$response = Http::withHeaders([
    'x-api-key' => env('BASE44_EMPLOYEES_KEY'),
])->get('https://[TU-APP].base44.app/functions/getEmployeesApi', [
    'activo' => 'true',
    'updated_since' => now()->subHour()->toISOString(),
]);
$employees = $response->json('data');`;

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Globe className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">API de Empleados para cdeapp</h2>
          <p className="text-sm text-slate-500">Endpoint seguro para sincronizar EmployeeMasterDatabase</p>
        </div>
      </div>

      {/* Estado */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Endpoint activo</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">getEmployeesApi desplegado</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">API Key configurada</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Secret EMPLOYEES_API_KEY</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">EmployeeMasterDatabase</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Fuente de datos principal</p>
          </CardContent>
        </Card>
      </div>

      {/* Autenticación */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="w-4 h-4" /> Autenticación requerida
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Todas las peticiones deben incluir la cabecera <code className="bg-slate-100 px-1 rounded text-xs">x-api-key</code> con el valor del secret <strong>EMPLOYEES_API_KEY</strong> configurado en Base44.
          </p>
          <div className="bg-slate-900 rounded-lg p-3 flex items-center justify-between">
            <code className="text-green-400 text-xs font-mono">x-api-key: [valor de EMPLOYEES_API_KEY en Dashboard → Secrets]</code>
            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white h-7" onClick={() => copy('x-api-key', 'header')}>
              {copied === 'header' ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints disponibles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="w-4 h-4" /> Parámetros disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {endpoints.map((ep, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                <div>
                  <span className="font-medium text-slate-700">{ep.label}</span>
                  <span className="text-slate-400 text-xs ml-2">{ep.description}</span>
                </div>
                <code className="text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded">{ep.url}</code>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <strong>Respuesta JSON:</strong> <code>{'{ success, total, count, offset, limit, updated_since, data: [...] }'}</code>
          </div>
        </CardContent>
      </Card>

      {/* Ejemplo cURL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Code className="w-4 h-4" /> Ejemplos de integración
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase">cURL</span>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => copy(curlExample, 'curl')}>
                {copied === 'curl' ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
            <pre className="bg-slate-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto font-mono">{curlExample}</pre>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase">PHP / Laravel (cdeapp)</span>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => copy(phpExample, 'php')}>
                {copied === 'php' ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
            <pre className="bg-slate-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto font-mono">{phpExample}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Test en vivo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Test del endpoint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runTest} disabled={testing} className="mb-3">
            {testing ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Probando...</> : 'Ejecutar test (5 empleados)'}
          </Button>
          {testResult && (
            <div className={`rounded-lg p-3 text-xs font-mono ${testResult.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {testResult.ok ? (
                <>
                  <div className="flex items-center gap-1 mb-2 font-semibold">
                    <CheckCircle className="w-3 h-3" /> Endpoint funcionando correctamente
                  </div>
                  <pre className="overflow-x-auto">{JSON.stringify(testResult.data?.data?.slice(0, 2), null, 2)}</pre>
                </>
              ) : (
                <span>Error: {testResult.error}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instrucciones finales */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">📋 Pasos para integrar en cdeapp.es</h3>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Copia el valor de <strong>EMPLOYEES_API_KEY</strong> desde Dashboard → Código → Secrets</li>
            <li>Guárdalo como variable de entorno en cdeapp.es (ej: <code className="bg-blue-100 px-1 rounded">BASE44_EMPLOYEES_KEY</code>)</li>
            <li>Ve a Dashboard → Código → Funciones → <strong>getEmployeesApi</strong> y copia la URL del endpoint</li>
            <li>En cdeapp, implementa una llamada GET a esa URL con la cabecera <code className="bg-blue-100 px-1 rounded">x-api-key</code></li>
            <li>Para sync incremental, usa el parámetro <code className="bg-blue-100 px-1 rounded">updated_since</code> con la última fecha de sincronización</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}