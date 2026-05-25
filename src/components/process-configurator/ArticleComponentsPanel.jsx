import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * Muestra los componentes (materias primas) de un artículo concreto.
 * Recibe `articleCdeId` (ID numérico en CDEApp) o `articleCode` como fallback.
 */
export default function ArticleComponentsPanel({ articleCdeId, articleCode }) {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvedCdeId, setResolvedCdeId] = useState(null);

  useEffect(() => {
    if (articleCdeId) {
      setResolvedCdeId(articleCdeId);
    } else if (articleCode) {
      // Intentar resolver el cde_id buscando en los componentes por código de artículo
      // a través de la función de sincronización de CDEApp
      resolveCdeIdFromCode(articleCode);
    } else {
      setComponents([]);
      setLoading(false);
    }
  }, [articleCdeId, articleCode]);

  useEffect(() => {
    if (resolvedCdeId) fetchComponents(resolvedCdeId);
  }, [resolvedCdeId]);

  const resolveCdeIdFromCode = async (code) => {
    setLoading(true);
    try {
      // 1. Primero buscar en la entidad Article de la BD (más rápido)
      const articles = await base44.entities.Article.filter({ code });
      if (articles?.length > 0 && articles[0].cde_id) {
        setResolvedCdeId(Number(articles[0].cde_id));
        return;
      }
      // 2. Fallback: buscar en CDEApp directamente
      const res = await base44.functions.invoke('cdeAppSync', { action: 'sync-articles' });
      const response = res.data?.data;
      let rows = [];
      if (response?.headers && Array.isArray(response.data)) {
        rows = response.data.map(r => {
          const obj = {};
          response.headers.forEach((h, i) => obj[h] = r[i]);
          return obj;
        });
      } else if (Array.isArray(response)) {
        rows = response;
      } else if (response?.data) {
        rows = Array.isArray(response.data) ? response.data : [];
      }
      const match = rows.find(r => 
        String(r.CodeCentral || r.code || '').trim().toLowerCase() === code.trim().toLowerCase()
      );
      if (match?.id) {
        setResolvedCdeId(Number(match.id));
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Error resolving cde_id:", err);
      setLoading(false);
    }
  };

  const fetchComponents = async (cdeId) => {
    setLoading(true);
    try {
      const data = await base44.entities.ArticleComponent.filter({ article_cde_id: cdeId });
      setComponents(Array.isArray(data) ? data.filter(c => c.is_active !== false) : []);
    } catch (err) {
      console.error("Error loading components:", err);
      toast.error("Error al cargar los componentes");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (resolvedCdeId) fetchComponents(resolvedCdeId);
    else if (articleCdeId) fetchComponents(articleCdeId);
    else if (articleCode) resolveCdeIdFromCode(articleCode);
  };

  if (!articleCdeId && !articleCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            Componentes / Materias Primas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Sincroniza el artículo desde CDEApp para ver sus componentes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Componentes / Materias Primas
            {components.length > 0 && (
              <Badge variant="secondary">{components.length}</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : components.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No se encontraron componentes para este artículo.</p>
            <p className="text-xs mt-1">Sincroniza los componentes desde la sección de Artículos.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {components.map((comp) => (
              <div
                key={comp.id}
                className="flex items-start gap-3 p-3 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                      {comp.code_component}
                    </span>
                    {comp.reference_component && (
                      <span className="text-xs text-muted-foreground">
                        Ref: {comp.reference_component}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium mt-1 truncate">{comp.name_component}</p>
                </div>
                {comp.is_active === false && (
                  <Badge variant="outline" className="text-xs shrink-0 text-slate-400">Inactivo</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}