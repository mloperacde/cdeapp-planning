import React, { useMemo, useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppData } from "../components/data/DataProvider";
import { getMachineAlias } from "@/utils/machineAlias";
import { format } from "date-fns";

const getEmployeeName = (emp) => {
  if (!emp) return "";
  return emp.nombre || emp.name || emp.Name || emp.full_name || emp.fullName || emp.display_name || "Sin Nombre";
};

export default function ShiftAssignmentsDisplayPage() {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get("date");
  const shiftParam = searchParams.get("shift") || "";
  const teamIdParam = searchParams.get("teamId");
  const payloadParam = searchParams.get("payload");

  const { employees, machines, teams } = useAppData();

  const dateForFilter = dateParam || format(new Date(), "yyyy-MM-dd");

  const teamKey = useMemo(() => {
    if (!teamIdParam || teamIdParam === "all") return null;
    const t = teams.find(team => String(team.id) === String(teamIdParam));
    return t ? t.team_key : teamIdParam;
  }, [teams, teamIdParam]);

  const { data: dailyStaffing = [] } = useQuery({
    queryKey: ["dailyMachineStaffingDisplay", dateForFilter, shiftParam, teamKey],
    queryFn: () => {
      const filters = {
        date: dateForFilter,
        shift: shiftParam
      };
      if (teamKey) {
        filters.team_key = teamKey;
      }
      return base44.entities.DailyMachineStaffing.filter(filters);
    }
  });

  const localPayload = useMemo(() => {
    let fromUrl = null;
    if (payloadParam) {
      try {
        const decodedParam = decodeURIComponent(payloadParam);
        const json = decodeURIComponent(escape(atob(decodedParam)));
        fromUrl = JSON.parse(json);
      } catch {
        fromUrl = null;
      }
    }
    if (fromUrl) return fromUrl;
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem("shiftAssignmentsDisplayPayload");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed || null;
    } catch {
      return null;
    }
  }, [payloadParam]);

  const roles = useMemo(
    () => [
      { key: "responsable_linea", label: "Responsable línea" },
      { key: "segunda_linea", label: "2ª línea" },
      { key: "operador_1", label: "Operador 1" },
      { key: "operador_2", label: "Operador 2" },
      { key: "operador_3", label: "Operador 3" },
      { key: "operador_4", label: "Operador 4" },
      { key: "operador_5", label: "Operador 5" },
      { key: "operador_6", label: "Operador 6" },
      { key: "operador_7", label: "Operador 7" },
      { key: "operador_8", label: "Operador 8" }
    ],
    []
  );

  const [viewMode, setViewMode] = useState("machines");
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => {
      setViewMode(prev => (prev === "machines" ? "employees" : "machines"));
    }, 45000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTop = 0;
    const totalScroll = container.scrollHeight - container.clientHeight;
    if (totalScroll <= 0) return;
    const duration = 45000;
    const start = performance.now();
    let frameId;
    const step = (now) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      container.scrollTop = totalScroll * t;
      if (t < 1) {
        frameId = requestAnimationFrame(step);
      }
    };
    frameId = requestAnimationFrame(step);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [viewMode, machinesGrouped.length, employeeRows.length]);

  const machineRows = useMemo(() => {
    const rows = [];
    if (localPayload?.assignments) {
      const assignments = localPayload.assignments || {};
      const plannedIds = new Set((localPayload.plannedMachineIds || []).map(id => String(id)));
      const targetMachines = machines.filter(m => plannedIds.size === 0 || plannedIds.has(String(m.id)));
      targetMachines.forEach(machine => {
        const rolesForMachine = assignments[machine.id] || {};
        roles.forEach(role => {
          const empId = rolesForMachine[role.key];
          const emp = empId ? employees.find(e => String(e.id) === String(empId)) : null;
          const empName = getEmployeeName(emp);
          rows.push({
            machineId: machine.id,
            machineName: getMachineAlias(machine),
            machineCode: machine.codigo_maquina || "",
            roleLabel: role.label,
            employeeName: empName
          });
        });
      });
    } else {
      dailyStaffing.forEach(ds => {
        const machine = machines.find(m => String(m.id) === String(ds.machine_id));
        roles.forEach(role => {
          const empId = ds[role.key];
          const emp = empId ? employees.find(e => String(e.id) === String(empId)) : null;
          const empName = getEmployeeName(emp);
          rows.push({
            machineId: ds.machine_id,
            machineName: machine ? getMachineAlias(machine) : String(ds.machine_id || ""),
            machineCode: machine?.codigo_maquina || "",
            roleLabel: role.label,
            employeeName: empName
          });
        });
      });
    }
    return rows;
  }, [localPayload, dailyStaffing, machines, employees, roles]);

  const employeeRows = useMemo(() => {
    const rows = [];
    if (localPayload?.assignments) {
      const assignments = localPayload.assignments || {};
      const plannedIds = new Set((localPayload.plannedMachineIds || []).map(id => String(id)));
      const targetMachines = machines.filter(m => plannedIds.size === 0 || plannedIds.has(String(m.id)));
      targetMachines.forEach(machine => {
        const rolesForMachine = assignments[machine.id] || {};
        roles.forEach(role => {
          const empId = rolesForMachine[role.key];
          if (!empId) return;
          const emp = employees.find(e => String(e.id) === String(empId));
          const empName = getEmployeeName(emp);
          rows.push({
            employeeName: empName,
            roleLabel: role.label,
            machineName: getMachineAlias(machine),
            machineCode: machine.codigo_maquina || ""
          });
        });
      });
    } else {
      dailyStaffing.forEach(ds => {
        const machine = machines.find(m => String(m.id) === String(ds.machine_id));
        roles.forEach(role => {
          const empId = ds[role.key];
          if (!empId) return;
          const emp = employees.find(e => String(e.id) === String(empId));
          const empName = getEmployeeName(emp);
          rows.push({
            employeeName: empName,
            roleLabel: role.label,
            machineName: machine ? getMachineAlias(machine) : String(ds.machine_id || ""),
            machineCode: machine?.codigo_maquina || ""
          });
        });
      });
    }
    rows.sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || ""));
    return rows;
  }, [localPayload, dailyStaffing, machines, employees, roles]);

  const machinesGrouped = useMemo(() => {
    const map = new Map();
    machineRows.forEach(row => {
      const key = String(row.machineId || row.machineName);
      if (!map.has(key)) {
        map.set(key, { header: row.machineName, code: row.machineCode, rows: [] });
      }
      map.get(key).rows.push(row);
    });
    return Array.from(map.values());
  }, [machineRows]);

  const displayDate = useMemo(() => {
    try {
      if (!dateForFilter) return "";
      const d = new Date(dateForFilter);
      return format(d, "dd/MM/yyyy");
    } catch {
      return dateForFilter;
    }
  }, [dateForFilter]);

  const teamName = useMemo(() => {
    if (!teamIdParam || teamIdParam === "all") return "";
    const t = teams.find(team => String(team.id) === String(teamIdParam));
    return t ? t.team_name : "";
  }, [teams, teamIdParam]);

  return (
    <div className="h-screen w-screen bg-slate-900 text-slate-50 flex flex-col">
      <div className="px-8 py-4 flex items-center justify-between border-b border-slate-800">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Asignación de Turno</div>
          <div className="text-sm text-slate-300">
            {displayDate} · {shiftParam} {teamName ? `· ${teamName}` : ""}
          </div>
        </div>
        <div className="text-sm text-slate-400">
          Vista: {viewMode === "machines" ? "Por máquinas" : "Por empleados"} · Cambio automático cada 45 segundos
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-auto px-8 py-6">
        {viewMode === "machines" ? (
          <>
            <div className="text-xl font-semibold mb-4">Máquinas y personal asignado</div>
            {machinesGrouped.length === 0 ? (
              <div className="text-center text-slate-400 mt-10">
                No hay asignaciones cargadas para estos filtros.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {machinesGrouped.map((machine, idx) => (
                  <div
                    key={idx}
                    className="border border-slate-800 rounded-lg p-4 bg-slate-950/60"
                  >
                    <div className="flex items-baseline justify-between mb-3">
                      <div className="text-lg font-semibold">{machine.header}</div>
                      {machine.code ? (
                        <div className="text-xs text-slate-400">{machine.code}</div>
                      ) : null}
                    </div>
                    <table className="w-full text-lg">
                      <tbody>
                        {machine.rows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className={rIdx % 2 === 0 ? "bg-slate-950" : "bg-slate-900"}
                          >
                            <td className="py-1.5 pr-4 text-slate-300">{row.roleLabel}</td>
                            <td className="py-1.5 pr-4">{row.employeeName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-xl font-semibold mb-4">Empleados y rol asignado</div>
            {employeeRows.length === 0 ? (
              <div className="text-center text-slate-400 mt-10">
                No hay asignaciones cargadas para estos filtros.
              </div>
            ) : (
              <table className="w-full text-lg">
                <thead className="text-left border-b border-slate-700">
                  <tr className="text-slate-300">
                    <th className="py-2 pr-4">Empleado</th>
                    <th className="py-2 pr-4">Rol</th>
                    <th className="py-2">Máquina</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeRows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-slate-900" : "bg-slate-950"}>
                      <td className="py-1.5 pr-4">{row.employeeName}</td>
                      <td className="py-1.5 pr-4 text-slate-300">{row.roleLabel}</td>
                      <td className="py-1.5">{row.machineName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
