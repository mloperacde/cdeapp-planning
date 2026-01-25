import { useState, useEffect } from "react";
import { localDataService } from "./services/localDataService";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  GitCompare, 
  Clock, 
  Users, 
  Layers,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from "lucide-react";


export default function Compare() {
  const [articles, setArticles] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await axios.get(`${API}/articles`);
      setArticles(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching articles:", error);
      toast.error("Error al cargar los artículos");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleArticle = (articleId) => {
    setSelectedIds(prev => {
      if (prev.includes(articleId)) {
        return prev.filter(id => id !== articleId);
      }
      if (prev.length >= 4) {
        toast.error("Máximo 4 artículos para comparar");
        return prev;
      }
      return [...prev, articleId];
    });
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      toast.error("Selecciona al menos 2 artículos para comparar");
      return;
    }

    setComparing(true);
    try {
      const response = await axios.post(`${API}/compare`, selectedIds);
      setComparison(response.data);
    } catch (error) {
      console.error("Error comparing:", error);
      toast.error("Error al comparar artículos");
    } finally {
      setComparing(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return "0 seg";
    if (seconds < 60) return `${seconds.toFixed(1)} seg`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toFixed(0)}s`;
  };

  const getTimeBarWidth = (time, maxTime) => {
    if (!maxTime) return 0;
    return (time / maxTime) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="compare-loading">
        <div className="spinner h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="compare-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Comparar Configuraciones</h1>
        <p className="text-muted-foreground mt-1">
          Selecciona artículos para comparar sus tiempos y actividades
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Article Selection */}
        <Card className="lg:col-span-1" data-testid="article-selection-card">
          <CardHeader>
            <CardTitle className="text-lg">Seleccionar Artículos</CardTitle>
            <CardDescription>
              Elige de 2 a 4 artículos para comparar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {articles.length === 0 ? (
              <div className="empty-state py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  No hay artículos para comparar
                </p>
              </div>
            ) : (
              <>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {articles.map((article) => (
                      <div
                        key={article.id}
                        className={`flex items-center gap-3 p-3 rounded-sm border transition-colors cursor-pointer ${
                          selectedIds.includes(article.id) 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => handleToggleArticle(article.id)}
                        data-testid={`compare-article-${article.id}`}
                      >
                        <Checkbox
                          checked={selectedIds.includes(article.id)}
                          onCheckedChange={() => handleToggleArticle(article.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{article.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(article.total_time_seconds)}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {article.process_code || "Manual"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-3">
                    {selectedIds.length} de 4 seleccionados
                  </p>
                  <Button
                    className="w-full"
                    onClick={handleCompare}
                    disabled={selectedIds.length < 2 || comparing}
                    data-testid="compare-btn"
                  >
                    {comparing ? (
                      <>
                        <div className="spinner h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Comparando...
                      </>
                    ) : (
                      <>
                        <GitCompare className="h-4 w-4 mr-2" />
                        Comparar ({selectedIds.length})
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Comparison Results */}
        <Card className="lg:col-span-2" data-testid="comparison-results-card">
          <CardHeader>
            <CardTitle className="text-lg">Resultados de Comparación</CardTitle>
          </CardHeader>
          <CardContent>
            {!comparison ? (
              <div className="empty-state py-16">
                <GitCompare className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Selecciona artículos para comparar
                </h3>
                <p className="text-muted-foreground">
                  Los resultados de la comparación aparecerán aquí
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-sm">
                    <p className="text-sm text-muted-foreground">Diferencia de Tiempo</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatTime(comparison.summary.time_difference_seconds)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-sm">
                    <p className="text-sm text-muted-foreground">Rango</p>
                    <p className="text-lg font-semibold">
                      {formatTime(comparison.summary.min_time_seconds)} - {formatTime(comparison.summary.max_time_seconds)}
                    </p>
                  </div>
                </div>

                {/* Time Comparison Bars */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Comparación de Tiempos</h4>
                  {comparison.articles.map((article, index) => {
                    const isMin = article.total_time_seconds === comparison.summary.min_time_seconds;
                    const isMax = article.total_time_seconds === comparison.summary.max_time_seconds;
                    
                    return (
                      <div key={article.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{article.name}</span>
                            {isMin && (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Más rápido
                              </Badge>
                            )}
                            {isMax && comparison.articles.length > 1 && (
                              <Badge variant="secondary">Más lento</Badge>
                            )}
                          </div>
                          <span className="font-mono text-sm">
                            {formatTime(article.total_time_seconds)}
                          </span>
                        </div>
                        <div className="comparison-bar">
                          <div
                            className="comparison-bar-fill"
                            style={{
                              width: `${getTimeBarWidth(
                                article.total_time_seconds,
                                comparison.summary.max_time_seconds
                              )}%`,
                              backgroundColor: isMin ? 'hsl(var(--success))' : 'hsl(var(--primary))'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Detailed Table */}
                <div>
                  <h4 className="font-semibold mb-3">Detalle Comparativo</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Artículo</TableHead>
                        <TableHead>Proceso</TableHead>
                        <TableHead className="text-right">Tiempo</TableHead>
                        <TableHead className="text-right">Operarios</TableHead>
                        <TableHead className="text-right">Actividades</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.articles.map((article) => (
                        <TableRow key={article.id}>
                          <TableCell className="font-medium">
                            {article.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {article.process_code || "Manual"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatTime(article.total_time_seconds)}
                          </TableCell>
                          <TableCell className="text-right">
                            {article.operators_required}
                          </TableCell>
                          <TableCell className="text-right">
                            {article.activities_count}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Activity Comparison */}
                <div>
                  <h4 className="font-semibold mb-3">Actividades por Artículo</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {comparison.articles.map((article) => (
                      <Card key={article.id} className="p-4">
                        <h5 className="font-medium mb-2">{article.name}</h5>
                        <ScrollArea className="h-[150px]">
                          <div className="space-y-1">
                            {article.activities?.map((act, idx) => (
                              <div 
                                key={idx}
                                className="flex justify-between text-xs p-2 bg-muted/50 rounded-sm"
                              >
                                <span className="truncate flex-1">{act?.name || 'N/A'}</span>
                                <span className="font-mono ml-2">{act?.time_seconds || 0}s</span>
                              </div>
                            ))}
                            {(!article.activities || article.activities.length === 0) && (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                Sin actividades
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}