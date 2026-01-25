import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Package, 
  Clock, 
  TrendingUp,
  Plus,
  ArrowRight,
  Layers
} from "lucide-react";

const API = `${import.meta.env.VITE_BACKEND_URL || ''}/api`;

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
      const response = await axios.get(`${API}/stats`);
      setStats(prev => ({
        ...prev,
        ...(response.data || {})
      }));
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds.toFixed(1)} seg`;
    return `${(seconds / 60).toFixed(1)} min`;
  };

  const statCards = [
    {
      title: "Actividades",
      value: stats.activities_count,
      icon: Activity,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Procesos",
      value: stats.processes_count,
      icon: Layers,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Artículos Configurados",
      value: stats.articles_count,
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Tiempo Promedio",
      value: formatTime(stats.average_time_seconds),
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="dashboard-loading">
        <div className="spinner h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Resumen del configurador de procesos de fabricación
          </p>
        </div>
        <Button asChild className="w-fit" data-testid="new-config-btn">
          <Link to="/NewProcessConfigurator/configurator">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Configuración
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card 
            key={stat.title} 
            className="industrial-card stats-card"
            style={{ animationDelay: `${index * 50}ms` }}
            data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-sm ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card data-testid="quick-actions-card">
          <CardHeader>
            <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
            <CardDescription>Accesos directos a las funciones principales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link 
              to="/NewProcessConfigurator/data" 
              className="flex items-center justify-between p-4 rounded-sm border hover:bg-accent transition-colors"
              data-testid="quick-upload-excel"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Cargar Excel</p>
                  <p className="text-sm text-muted-foreground">Importar procesos y actividades</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            
            <Link 
              to="/NewProcessConfigurator/configurator" 
              className="flex items-center justify-between p-4 rounded-sm border hover:bg-accent transition-colors"
              data-testid="quick-new-article"
            >
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Nuevo Artículo</p>
                  <p className="text-sm text-muted-foreground">Configurar un nuevo artículo</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            
            <Link 
              to="/NewProcessConfigurator/compare" 
              className="flex items-center justify-between p-4 rounded-sm border hover:bg-accent transition-colors"
              data-testid="quick-compare"
            >
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Comparar Configuraciones</p>
                  <p className="text-sm text-muted-foreground">Analizar diferentes procesos</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        {/* Recent Articles */}
        <Card data-testid="recent-articles-card">
          <CardHeader>
            <CardTitle className="text-lg">Artículos Recientes</CardTitle>
            <CardDescription>Últimas configuraciones creadas</CardDescription>
          </CardHeader>
          <CardContent>
            {(stats.recent_articles || []).length === 0 ? (
              <div className="empty-state py-8">
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
      </div>

      {/* Help Section */}
      {stats.activities_count === 0 && (
        <Card className="border-dashed border-2" data-testid="help-card">
          <CardContent className="py-8 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Comienza cargando tu archivo Excel</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Sube tu archivo Excel con los procesos y actividades para comenzar a configurar artículos.
            </p>
            <Button asChild data-testid="help-upload-btn">
              <Link to="/NewProcessConfigurator/data">Ir a Cargar Excel</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}