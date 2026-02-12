import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { localDataService } from "./services/localDataService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Clock, 
  Package,
  Plus,
  Building2
} from "lucide-react";
import { 
  PieChart, 
  Pie, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

export default function Dashboard() {
  const [stats, setStats] = useState({
    activities_count: 0,
    processes_count: 0,
    articles_count: 0,
    average_time_seconds: 0,
    recent_articles: [],
    articles_by_type: [],
    articles_by_client: []
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

      {/* Stats Cards */}
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

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Left Panel: Articles by Type (Pie Chart + Legend) */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Artículos por Tipo</CardTitle>
            <CardDescription>
              Distribución de artículos según su tipo
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {stats.articles_by_type && stats.articles_by_type.length > 0 ? (
              <div className="flex items-center h-full">
                {/* Legend (Left Side) */}
                <div className="w-1/3 h-full overflow-y-auto pr-2 space-y-3 pt-4">
                  {stats.articles_by_type.map((entry, index) => (
                    <div key={`legend-${index}`} className="flex items-center text-sm group">
                      <div 
                        className="w-3 h-3 rounded-full mr-2 shrink-0 transition-transform group-hover:scale-125" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-muted-foreground truncate max-w-[100px]" title={entry.name}>
                          {entry.name}
                        </span>
                        <span className="font-bold text-lg leading-none">
                          {entry.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pie Chart (Right Side) */}
                <div className="w-2/3 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.articles_by_type}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {stats.articles_by_type.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} artículos`, 'Cantidad']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No hay datos disponibles
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Right Panel: Articles by Client (Read Mode / List) */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Artículos por Cliente</CardTitle>
            <CardDescription>Lista detallada de clientes</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {stats.articles_by_client && stats.articles_by_client.length > 0 ? (
               <ScrollArea className="h-[300px] w-full px-6 pb-6">
                  <div className="space-y-4 pt-2">
                    {stats.articles_by_client
                      .sort((a, b) => b.value - a.value)
                      .map((entry, index) => (
                        <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0 hover:bg-muted/30 p-2 rounded-lg transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-full text-primary">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-sm text-foreground/80">{entry.name}</span>
                          </div>
                          <Badge variant="secondary" className="font-bold ml-2">
                            {entry.value}
                          </Badge>
                        </div>
                      ))
                    }
                  </div>
               </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No hay datos disponibles
              </div>
            )}
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
