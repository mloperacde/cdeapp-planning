import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    CheckCircle2, UserX, RefreshCw, KeyRound, Clock, 
    Sunrise, Sunset, Users, 
    UserCog, UsersRound, TrendingUp,
    MessageSquare, ArrowLeftRight, Coffee, Cake, Calendar, AlertTriangle, MapPin
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

// Widget: KPI Summary
export function KPIWidget({ employees, activeAbsencesToday, pendingSwaps, lockersWithoutNumber, selectedTeamFilter }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-green-700 dark:text-green-200 font-medium">Empleados Disponibles</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                {employees.filter(e => 
                                    e.disponibilidad === "Disponible" && 
                                    e.equipo && 
                                    (selectedTeamFilter === "all" || e.equipo === selectedTeamFilter)
                                ).length}
                            </p>
                        </div>
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-red-700 dark:text-red-200 font-medium">Ausentes Hoy</p>
                            <p className="text-2xl font-bold text-red-900 dark:text-red-100">{activeAbsencesToday.length}</p>
                        </div>
                        <UserX className="w-8 h-8 text-red-600" />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-amber-700 dark:text-amber-200 font-medium">Intercambios Pendientes</p>
                            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{pendingSwaps.length}</p>
                        </div>
                        <RefreshCw className="w-8 h-8 text-amber-600" />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-orange-700 dark:text-orange-200 font-medium">Taquillas sin Asignar</p>
                            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{lockersWithoutNumber}</p>
                        </div>
                        <KeyRound className="w-8 h-8 text-orange-600" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Widget: Team Status
export function TeamStatusWidget({ teamStats, absencesByTeam, machines, dailyStaffing, employees, manufacturingConfig, shifts }) {

    const getTeamSalas = (teamName) => {
        if (!dailyStaffing?.length || !machines?.length || !employees?.length) return [];
        
        const normalize = (str) => str ? str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
        const targetTeam = normalize(teamName);
        
        const teamEmployeeIds = new Set(
            employees
                .filter(e => {
                    const empTeam = normalize(e.equipo);
                    return empTeam === targetTeam || 
                           empTeam === `equipo ${targetTeam}` || 
                           targetTeam === `equipo ${empTeam}` ||
                           (targetTeam === "t2" && (empTeam === "equipo sara" || empTeam === "turno 2" || empTeam.includes("sara") || empTeam.includes("ivan")));
                })
                .map(e => e.id)
        );
        
        const STAFF_FIELDS = [
            'responsable_linea', 'segunda_linea',
            'operador_1', 'operador_2', 'operador_3', 'operador_4',
            'operador_5', 'operador_6', 'operador_7', 'operador_8'
        ];

        const activeSalas = new Set();
        
        dailyStaffing.forEach(assignment => {
            const hasTeamMember = STAFF_FIELDS.some(field => {
                const empId = assignment[field];
                return empId && teamEmployeeIds.has(empId);
            });
            
            if (hasTeamMember) {
                // Robust ID matching
                const machine = machines.find(m => String(m.id) === String(assignment.machine_id));
                if (machine?.ubicacion) {
                    activeSalas.add(machine.ubicacion);
                }
            }
        });
        
        return Array.from(activeSalas).sort();
    };

    const getShiftLeaders = (shiftName) => {
        if (!manufacturingConfig?.assignments || !employees) return [];
        
        let shiftKey = null;
        const normalizedShift = shiftName?.toLowerCase()?.trim() || "";
        
        // Robust shift matching
        const morningShift = (shifts?.MORNING || "Mañana").toLowerCase();
        const afternoonShift = (shifts?.AFTERNOON || "Tarde").toLowerCase();

        if (normalizedShift === morningShift || normalizedShift.includes("mañana") || 
            normalizedShift === "turno 1" || normalizedShift === "t1" || normalizedShift === "1") {
            shiftKey = "shift1";
        }
        if (normalizedShift === afternoonShift || normalizedShift.includes("tarde") || 
            normalizedShift === "turno 2" || normalizedShift === "t2" || normalizedShift === "2") {
            shiftKey = "shift2";
        }
        
        if (!shiftKey || !manufacturingConfig.assignments[shiftKey]?.leaderMap) return [];
        
        const leaderMap = manufacturingConfig.assignments[shiftKey].leaderMap;
        const areasMap = manufacturingConfig.assignments[shiftKey].areas || {};
        
        return Object.entries(leaderMap).map(([role, empId]) => {
            const emp = employees.find(e => String(e.id) === String(empId));
            const areaIds = areasMap[role] || [];
            const areaNames = areaIds.map(id => {
                const area = manufacturingConfig.areas?.find(a => a.id === id);
                return area?.name;
            }).filter(Boolean);

            return {
                    role,
                    name: emp ? `${emp.nombre} ${emp.apellidos || ''}` : `Empleado ${empId} (No encontrado)`,
                    id: empId,
                    areas: areaNames
                };
            });
        };

    return (
        <Card className="mb-6 shadow-lg border-0 bg-white dark:bg-card/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Turnos de Hoy - {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {teamStats.map((team) => {
                        const activeSalas = getTeamSalas(team.team_name);
                        const leaders = getShiftLeaders(team.shift);
                        
                        return (
                        <div 
                            key={team.team_key} 
                            className="border-2 rounded-lg p-4"
                            style={{ borderColor: team.color }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{team.team_name}</h3>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        {team.shift === (shifts?.MORNING || "Mañana") && (
                                            <Badge className="bg-amber-100 text-amber-800">
                                                <Sunrise className="w-3 h-3 mr-1" />
                                                {shifts?.MORNING || "Mañana"} (7:00-15:00)
                                            </Badge>
                                        )}
                                        {team.shift === (shifts?.AFTERNOON || "Tarde") && (
                                            <Badge className="bg-indigo-100 text-indigo-800">
                                                <Sunset className="w-3 h-3 mr-1" />
                                                {shifts?.AFTERNOON || "Tarde"} (14:00/15:00-22:00)
                                            </Badge>
                                        )}
                                        {!team.shift && (
                                            <Badge variant="outline" className="bg-slate-100">
                                                Sin asignar
                                            </Badge>
                                        )}
                                        {activeSalas.length > 0 && (
                                            <div className="flex items-center gap-1 ml-1 border-l pl-2 border-slate-200">
                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                <div className="flex gap-1 flex-wrap">
                                                    {activeSalas.map(sala => (
                                                        <Badge key={sala} variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-slate-50 text-slate-600 border-slate-200">
                                                            {sala}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: `${team.color}20`, borderColor: team.color, borderWidth: 2 }}
                                >
                                    <Users className="w-6 h-6" style={{ color: team.color }} />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{team.total}</div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400">Total</div>
                                </div>
                                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">{team.available}</div>
                                    <div className="text-xs text-green-700 dark:text-green-200">Disp.</div>
                                </div>
                                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <div className="text-2xl font-bold text-red-900 dark:text-red-100">{team.absencesCount}</div>
                                    <div className="text-xs text-red-700 dark:text-red-200">Aus.</div>
                                </div>
                            </div>

                            {leaders.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-200">
                                    <p className="text-xs font-semibold text-slate-700 mb-2">Responsables de Turno:</p>
                                    {leaders.map(l => (
                                        <div key={l.role} className="mb-2">
                                            <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
                                                <span className="text-slate-500">{l.role}:</span>
                                                <span className="font-medium text-slate-800 dark:text-slate-200">{l.name}</span>
                                            </div>
                                            {l.areas && l.areas.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1 pl-2 border-l-2 border-slate-100 ml-1">
                                                    {l.areas.map(area => (
                                                        <span key={area} className="text-[10px] text-slate-500 bg-slate-50 px-1 rounded">
                                                            {area}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {team.absencesCount > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-200">
                                    <p className="text-xs font-semibold text-slate-700 mb-2">Ausentes:</p>
                                    {absencesByTeam[team.team_name]?.slice(0, 3).map(abs => (
                                        <div key={abs.id} className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                                            • {abs.employee?.nombre} - {abs.tipo || abs.motivo}
                                        </div>
                                    ))}
                                    {team.absencesCount > 3 && (
                                        <p className="text-xs text-slate-500 mt-1">...y {team.absencesCount - 3} más</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

// Widget: Modules Grid
export function ModulesWidget({ lockersWithoutNumber, setActiveView }) {
    const modules = [
        {
            title: "Planificación Equipos",
            icon: UsersRound,
            url: createPageUrl("ShiftPlanning"),
            color: "purple",
            description: "Asigna turnos"
        },
        {
            title: "Empleados",
            icon: Users,
            url: createPageUrl("EmployeesShiftManager"),
            color: "teal",
            description: "Personal fabricación"
        },
        {
            title: "Asignaciones",
            icon: UserCog,
            url: createPageUrl("MachineAssignments"),
            color: "blue",
            description: "Distribuye operarios"
        },
        {
            title: "Taquillas",
            icon: KeyRound,
            url: createPageUrl("LockerManagement"),
            color: "orange",
            description: "Asigna vestuarios",
            badge: lockersWithoutNumber > 0 ? lockersWithoutNumber : null
        },
        {
            title: "Rendimiento",
            icon: TrendingUp,
            url: createPageUrl("PerformanceManagement"),
            color: "cyan",
            description: "Evaluaciones y PIPs"
        },
        {
            title: "Ausencias",
            icon: MessageSquare,
            action: "absences",
            color: "red",
            description: "Reporta ausencias"
        }
    ];

    const colorClasses = {
        purple: "from-purple-500 to-purple-600",
        blue: "from-blue-500 to-blue-600",
        green: "from-green-500 to-green-600",
        orange: "from-orange-500 to-orange-600",
        red: "from-red-500 to-red-600",
        cyan: "from-cyan-500 to-cyan-600",
        teal: "from-teal-500 to-teal-600",
        violet: "from-violet-500 to-violet-600"
    };

    return (
        <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Gestión</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((module) => {
                    const Icon = module.icon;
                    const content = (
                        <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group h-full border-0 bg-white dark:bg-card shadow-sm dark:shadow-none">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[module.color]} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                                                {module.title}
                                            </h3>
                                            {module.badge && (
                                                <Badge className="bg-red-600 text-white">
                                                    {module.badge}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">{module.description}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                    
                    return module.action ? (
                        <button key={module.title} onClick={() => setActiveView(module.action)} className="w-full text-left">
                            {content}
                        </button>
                    ) : (
                        <Link key={module.title} to={module.url}>
                            {content}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

// Widget: Communication
export function CommunicationWidget() {
    return (
        <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Coordinación</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link to={createPageUrl("ShiftHandover")}>
                    <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group h-full border-0 bg-white dark:bg-card/80 backdrop-blur-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                    <ArrowLeftRight className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">Traspaso</h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Entre turnos</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link to={createPageUrl("Breaks")}>
                    <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group h-full border-0 bg-white dark:bg-card/80 backdrop-blur-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                    <Coffee className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">Descansos</h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Gestión de turnos</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link to={createPageUrl("SupportManagement1415")}>
                    <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group h-full border-0 bg-white dark:bg-card/80 backdrop-blur-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                    <Clock className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">Apoyos</h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">14:00 - 15:00</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}

// Widget: Requests & Birthdays
export function RequestsAndBirthdaysWidget({ pendingSwaps, employees, upcomingBirthdays }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="shadow-lg border-0 bg-white dark:bg-card/80 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-amber-600" />
                        Solicitudes Pendientes
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {pendingSwaps.length === 0 ? (
                        <div className="text-center py-8">
                            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                            <p className="text-sm text-slate-600">Al día</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingSwaps.slice(0, 3).map(swap => {
                                const solicitante = employees.find(e => e.id === swap.solicitante_id);
                                const receptor = employees.find(e => e.id === swap.receptor_id);
                                return (
                                    <div key={swap.id} className="p-3 border rounded-lg bg-amber-50 border-amber-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge className="bg-yellow-100 text-yellow-800">{swap.estado}</Badge>
                                            <span className="text-xs text-slate-500">{format(new Date(swap.fecha_solicitud), "dd/MM")}</span>
                                        </div>
                                        <p className="text-sm font-semibold">{solicitante?.nombre} ↔️ {receptor?.nombre}</p>
                                    </div>
                                );
                            })}
                            <Link to={createPageUrl("Dashboard")}><Button variant="outline" className="w-full mt-2">Ver en Dashboard</Button></Link>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-white dark:bg-card/80 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="flex items-center gap-2">
                        <Cake className="w-5 h-5 text-purple-600" />
                        Próximos Cumpleaños
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {upcomingBirthdays.length === 0 ? (
                        <div className="text-center py-8">
                            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-600">Sin eventos próximos</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {upcomingBirthdays.map(emp => {
                                const birthDate = new Date(emp.fecha_nacimiento);
                                const thisYearBirthday = new Date(new Date().getFullYear(), birthDate.getMonth(), birthDate.getDate());
                                const isToday = isSameDay(thisYearBirthday, new Date());
                                return (
                                    <div key={emp.id} className={`p-3 rounded-lg ${isToday ? 'bg-purple-100 border-2 border-purple-400' : 'bg-slate-50'}`}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="font-semibold text-sm">{emp.nombre}</div>
                                                <div className="text-xs text-slate-600">{format(thisYearBirthday, "d 'de' MMMM", { locale: es })}</div>
                                            </div>
                                            {isToday && <Badge className="bg-purple-600 text-white">¡HOY!</Badge>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Widget: Alerts
export function AlertsWidget({ lockersWithoutNumber, pendingSwaps, activeAbsencesToday }) {
    if (lockersWithoutNumber === 0 && pendingSwaps.length === 0 && activeAbsencesToday.length <= 5) return null;

    return (
        <Card className="mb-6 shadow-lg border-2 border-amber-300 bg-amber-50">
            <CardHeader className="border-b border-amber-200">
                <CardTitle className="flex items-center gap-2 text-amber-900">
                    <AlertTriangle className="w-5 h-5" />
                    Acciones Requeridas
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
                {lockersWithoutNumber > 0 && (
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-orange-600" />
                            <span className="text-sm text-slate-900"><strong>{lockersWithoutNumber}</strong> sin taquilla</span>
                        </div>
                        <Link to={createPageUrl("LockerManagement")}><Button size="sm" variant="outline">Resolver</Button></Link>
                    </div>
                )}
                {activeAbsencesToday.length > 5 && (
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2">
                            <UserX className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-slate-900"><strong>{activeAbsencesToday.length}</strong> ausencias - alta criticidad</span>
                        </div>
                        <Link to={createPageUrl("ShiftAbsenceReport")}><Button size="sm" variant="outline">Comunicar</Button></Link>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
