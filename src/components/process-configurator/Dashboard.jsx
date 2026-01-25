import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { localDataService } from "./services/localDataService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Settings, 
  FileText, 
  Clock, 
  Users, 
  TrendingUp, 
  Package,
  Plus
} from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    activities_count: 0,
    processes_count: 0,
    articles_count: 0,
    average_time_seconds: 0,
    recent_articles: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await localDataService.getStats();
      setStats(prev => ({
        ...prev,
        ...(data || {})
      }));
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Panel de Control</h2>
          <p className="text-muted-foreground">Resumen de configuración de procesos</p>
        </div>
        <Button asChild>
          <Link to="/NewProcessConfigurator/configurator">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Artículo
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Artículos Configurados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.articles_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Procesos Estándar</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processes_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actividades Disponibles</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activities_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats.average_time_seconds)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Artículos Recientes</CardTitle>
            <CardDescription>
              Últimos artículos configurados en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(stats.recent_articles || []).length === 0 ? (
              <div className="empty-state py-8 text-center flex flex-col items-center">
                <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No hay artículos configurados</p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link to="/NewProcessConfigurator/configurator">Crear primero</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {(stats.recent_articles || []).map((article) => (
                  <Link 
                    key={article.id} 
                    to={`/NewProcessConfigurator/configurator/${article.id}`}
                    className="flex items-center justify-between p-3 rounded-sm border hover:bg-accent transition-colors"
                    data-testid={`recent-article-${article.id}`}
                  >
                    <div>
                      <p className="font-medium">{article.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(article.total_time_seconds)} • {article.operators_required} operario(s)
                      </p>
                    </div>
                    <div className="text-xs px-2 py-1 rounded-sm bg-muted">
                      {article.process_code || "Manual"}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>Accesos directos a funciones comunes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
             <Button asChild variant="ghost" className="w-full justify-start">
              <Link to="/NewProcessConfigurator/data-management">
                <FileText className="mr-2 h-4 w-4" />
                Importar Excel de Datos
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link to="/NewProcessConfigurator/compare">
                <TrendingUp className="mr-2 h-4 w-4" />
                Comparar Artículos
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link to="/NewProcessConfigurator/articles">
                <ListChecks className="mr-2 h-4 w-4" />
                Ver todos los artículos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ListChecks({ className }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M10 6h10" />
            <path d="M10 12h10" />
            <path d="M10 18h10" />
            <path d="M4 6h1" />
            <path d="M4 12h1" />
            <path d="M4 18h1" />
        </svg>
    );
}