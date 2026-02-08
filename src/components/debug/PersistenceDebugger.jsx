import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Database, FileUp, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function PersistenceDebugger() {
  const [configs, setConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testKey, setTestKey] = useState('debug_test_key');
  const [testValue, setTestValue] = useState('test_value_' + Date.now());
  const [writeResult, setWriteResult] = useState(null);
  const [readResult, setReadResult] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const [uploadStatus, setUploadStatus] = useState('idle');

  const [deepScanResult, setDeepScanResult] = useState([]);
  const [isDeepScanning, setIsDeepScanning] = useState(false);

  const runDeepScan = async () => {
    setIsDeepScanning(true);
    setDeepScanResult([]);
    try {
      toast.info("Iniciando escaneo profundo de Roles y Training...");
      
      const keysToScan = ['roles_config', 'onboarding_training_resources'];
      let allFound = [];

      for (const key of keysToScan) {
          // 1. Filter Scan
          const byKey = await base44.entities.AppConfig.filter({ key }).catch(() => []);
          const byConfigKey = await base44.entities.AppConfig.filter({ config_key: key }).catch(() => []);
          
          // 2. List Scan
          const recent = await base44.entities.AppConfig.list('-updated_at', 100).catch(() => []);
          const byRecent = recent.filter(r => r.key === key || r.config_key === key);

          const combined = [...byKey, ...byConfigKey, ...byRecent];
          
          // Deduplicate
          const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());

          // Analyze Content
          const analyzed = unique.map(record => {
              let contentStatus = "Unknown";
              let version = "Unknown";
              let timestamp = "Unknown";
              let chunkCount = 0;
              let isChunked = false;

              let val = record.value || record.description || record.app_subtitle;
              if (val && (val.startsWith('{') || val.startsWith('['))) {
                  try {
                      const parsed = JSON.parse(val);
                      if (parsed._v) version = `v${parsed._v}`;
                      else if (parsed.timestamp) version = "v6/Legacy";
                      else version = "Raw JSON";

                      if (parsed._ts) timestamp = new Date(parsed._ts).toLocaleString();
                      else if (parsed.timestamp) timestamp = new Date(parsed.timestamp).toLocaleString();
                      
                      if (parsed._is_chunked) {
                          isChunked = true;
                          chunkCount = parsed._chunk_ids ? parsed._chunk_ids.length : (parsed.count || 0);
                      }
                      contentStatus = "Valid JSON";
                  } catch(e) {
                      contentStatus = "Invalid JSON";
                  }
              } else {
                  contentStatus = val ? "Raw Text" : "Empty";
              }

              return {
                  ...record,
                  analysis: {
                      version,
                      timestamp,
                      contentStatus,
                      isChunked,
                      chunkCount
                  }
              };
          });

          allFound = [...allFound, ...analyzed];
      }

      // Sort by updated_at desc
      allFound.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      
      setDeepScanResult(allFound);
      toast.success(`Escaneo completado. ${allFound.length} registros encontrados.`);

    } catch (error) {
      console.error("Deep scan failed:", error);
      toast.error("Error en escaneo profundo");
    } finally {
      setIsDeepScanning(false);
    }
  };

  const deleteRecord = async (id) => {
      if(!confirm(`¿Eliminar registro ${id} permanentemente?`)) return;
      try {
          await base44.entities.AppConfig.delete(id);
          toast.success(`Registro ${id} eliminado.`);
          runDeepScan(); // Refresh
      } catch(e) {
          toast.error(`Error al eliminar: ${e.message}`);
      }
  };

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      // Try to list all configs to see what exists
      // Assuming list takes sort param
      const allConfigs = await base44.entities.AppConfig.list('-updated_at', 50); 
      setConfigs(allConfigs);
      toast.success(`Se encontraron ${allConfigs.length} configuraciones`);
    } catch (error) {
      console.error("Error fetching configs:", error);
      toast.error("Error al leer AppConfig: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const runWriteTest = async () => {
    setWriteResult('pending');
    try {
      const payload = {
        key: testKey,
        config_key: testKey,
        value: JSON.stringify({ data: testValue, timestamp: Date.now() }),
        description: "Debug Test",
        app_subtitle: "Debug",
        is_active: true
      };
      
      const res = await base44.entities.AppConfig.create(payload);
      setWriteResult({ success: true, id: res.id, timestamp: new Date().toISOString() });
      toast.success("Escritura de prueba exitosa");
    } catch (error) {
      console.error("Write test failed:", error);
      setWriteResult({ success: false, error: error.message });
      toast.error("Fallo en escritura de prueba");
    }
  };

  const runReadTest = async () => {
    setReadResult('pending');
    try {
      // 1. Try standard filter
      let matches = await base44.entities.AppConfig.filter({ key: testKey });

      // 2. Fallback: List scan if filter fails (mimics usePersistentAppConfig behavior)
      if (!matches || matches.length === 0) {
        try {
          const recent = await base44.entities.AppConfig.list('-updated_at', 50);
          const found = recent.filter(r => r.key === testKey || r.config_key === testKey);
          if (found.length > 0) {
            matches = found;
            toast.info("Recuperado vía Fallback Scan (Filter falló)");
          }
        } catch (e) { console.warn("Fallback failed", e); }
      }

      if (matches && matches.length > 0) {
        setReadResult({ success: true, count: matches.length, data: matches[0] });
        toast.success(`Lectura exitosa: encontrado ${matches.length} registro(s)`);
      } else {
        setReadResult({ success: false, error: "No se encontraron registros con la clave (ni con fallback)" });
        toast.error("No se encontró el registro de prueba");
      }
    } catch (error) {
      console.error("Read test failed:", error);
      setReadResult({ success: false, error: error.message });
      toast.error("Fallo en lectura de prueba");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadStatus('uploading');
    try {
      if (base44.integrations?.Core?.UploadFile) {
        const result = await base44.integrations.Core.UploadFile({ file });
        console.log("Upload result:", result);
        if (result && result.file_url) {
          setFileUrl(result.file_url);
          setUploadStatus('success');
          toast.success("Archivo subido. URL generada.");
        } else {
          throw new Error("No file URL returned from API");
        }
      } else {
        throw new Error("Integration UploadFile not available in SDK");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadStatus('error');
      setFileUrl(error.message);
      toast.error("Error subiendo archivo");
    }
  };

  return (
    <div className="space-y-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-600" />
          Diagnóstico de Persistencia y Archivos
        </h2>
        <Button onClick={fetchConfigs} disabled={isLoading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refrescar Lista
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel de Configuración DB */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Prueba de Lectura/Escritura (AppConfig)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={testKey} 
                onChange={e => setTestKey(e.target.value)} 
                placeholder="Clave de prueba"
              />
              <Input 
                value={testValue} 
                onChange={e => setTestValue(e.target.value)} 
                placeholder="Valor de prueba"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={runWriteTest} size="sm">1. Escribir</Button>
              <Button onClick={runReadTest} size="sm" variant="secondary">2. Leer</Button>
            </div>

            {writeResult && (
              <div className={`p-3 rounded text-xs ${writeResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <strong>Escritura:</strong> {writeResult.success ? `OK (ID: ${writeResult.id})` : `Error: ${writeResult.error}`}
              </div>
            )}
            
            {readResult && (
              <div className={`p-3 rounded text-xs ${readResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <strong>Lectura:</strong> {readResult.success ? `OK (Encontrados: ${readResult.count})` : `Error: ${readResult.error}`}
                {readResult.success && <pre className="mt-1 overflow-auto max-h-20">{JSON.stringify(readResult.data, null, 2)}</pre>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel de Archivos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Prueba de Subida de Archivos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <input type="file" id="debug-file" className="hidden" onChange={handleFileUpload} />
              <label htmlFor="debug-file" className="cursor-pointer flex flex-col items-center gap-2">
                <FileUp className="w-8 h-8 text-slate-400" />
                <span className="text-sm text-slate-600">Click para probar subida</span>
              </label>
            </div>

            {uploadStatus === 'uploading' && <div className="text-blue-600 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Subiendo...</div>}
            
            {uploadStatus === 'success' && (
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-green-800 text-xs font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3"/> Subida Exitosa
                </p>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs break-all mt-1 block">
                  {fileUrl}
                </a>
              </div>
            )}
            
            {uploadStatus === 'error' && (
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <p className="text-red-800 text-xs font-bold flex items-center gap-1">
                  <XCircle className="w-3 h-3"/> Error
                </p>
                <p className="text-red-600 text-xs mt-1">{fileUrl}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de Configs Existentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Últimas Configuraciones en Base de Datos (AppConfig)</CardTitle>
          <Button onClick={runDeepScan} disabled={isDeepScanning} size="sm" variant="destructive">
            <RefreshCw className={`w-4 h-4 mr-2 ${isDeepScanning ? 'animate-spin' : ''}`} />
            Escaneo Profundo (Roles/Training)
          </Button>
        </CardHeader>
        <CardContent>
          {deepScanResult.length > 0 && (
              <div className="mb-6 border rounded-lg overflow-hidden">
                  <div className="bg-amber-50 p-2 text-amber-800 text-xs font-bold border-b border-amber-200">
                      Resultados del Escaneo Profundo ({deepScanResult.length})
                  </div>
                  <table className="w-full text-xs text-left bg-white">
                      <thead className="bg-slate-50">
                          <tr>
                              <th className="p-2 border-b">Key</th>
                              <th className="p-2 border-b">ID</th>
                              <th className="p-2 border-b">Updated (Server)</th>
                              <th className="p-2 border-b">Analysis</th>
                              <th className="p-2 border-b">Action</th>
                          </tr>
                      </thead>
                      <tbody>
                          {deepScanResult.map(r => (
                              <tr key={r.id} className="hover:bg-slate-50 border-b">
                                  <td className="p-2 font-mono text-blue-600 font-bold">{r.key || r.config_key}</td>
                                  <td className="p-2 font-mono text-slate-500">{r.id}</td>
                                  <td className="p-2">{new Date(r.updated_at).toLocaleString()}</td>
                                  <td className="p-2">
                                      <div className="flex flex-col gap-1">
                                          <span className="font-bold">{r.analysis.version}</span>
                                          <span className="text-slate-500">TS: {r.analysis.timestamp}</span>
                                          <span className={`px-1 rounded text-white text-[10px] w-fit ${r.analysis.contentStatus === 'Valid JSON' ? 'bg-green-500' : 'bg-red-500'}`}>
                                              {r.analysis.contentStatus}
                                          </span>
                                          {r.analysis.isChunked && (
                                              <span className="bg-purple-100 text-purple-800 px-1 rounded text-[10px] w-fit">
                                                  Chunks: {r.analysis.chunkCount}
                                              </span>
                                          )}
                                      </div>
                                  </td>
                                  <td className="p-2">
                                      <Button variant="ghost" size="sm" onClick={() => deleteRecord(r.id)} className="h-6 w-6 p-0 text-red-500">
                                          <XCircle className="w-4 h-4" />
                                      </Button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Key</th>
                  <th className="py-2">ID</th>
                  <th className="py-2">Updated</th>
                  <th className="py-2">Size (Total)</th>
                  <th className="py-2">Storage Mode</th>
                </tr>
              </thead>
              <tbody>
                {configs.map(c => {
                  const valSize = (c.value || '').length;
                  const descSize = (c.description || '').length;
                  const subSize = (c.app_subtitle || '').length;
                  const totalSize = valSize + descSize + subSize;
                  
                  let storageMode = [];
                  if (valSize > 0) storageMode.push('VAL');
                  if (descSize > 0) storageMode.push('DESC');
                  if (subSize > 0) storageMode.push('SUB');

                  return (
                    <tr key={c.id} className="border-b hover:bg-slate-50">
                      <td className="py-2 font-mono text-blue-600">{c.key || c.config_key || '(sin key)'}</td>
                      <td className="py-2 font-mono text-slate-500">{c.id}</td>
                      <td className="py-2">
                        {c.updated_at ? new Date(c.updated_at).toLocaleString() : 
                         c.created_at ? new Date(c.created_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-2">
                        <span className={totalSize > 0 ? "text-green-600 font-bold" : "text-red-400"}>
                          {totalSize} chars
                        </span>
                      </td>
                      <td className="py-2">
                        {storageMode.length > 0 ? (
                          <span className="bg-slate-100 px-1 rounded text-slate-600">{storageMode.join('+')}</span>
                        ) : (
                          <span className="text-red-400 italic">Empty</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {configs.length === 0 && !isLoading && (
                  <tr><td colSpan="5" className="py-4 text-center text-slate-400">No se encontraron registros</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
