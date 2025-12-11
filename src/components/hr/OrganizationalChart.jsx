import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCircle } from "lucide-react";

export default function OrganizationalChart() {
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  // Recursive component for tree branch
  const OrgNode = ({ dept }) => {
    const children = departments.filter(d => d.parent_id === dept.id);
    const deptPositions = positions.filter(p => p.department_id === dept.id);
    const totalHeadcount = deptPositions.reduce((acc, p) => acc + (p.max_headcount || 0), 0);
    const manager = employees.find(e => e.id === dept.manager_id);

    return (
      <li className="flex flex-col items-center">
        <Card className="w-64 border-t-4 shadow-md z-10 relative bg-white" style={{ borderTopColor: dept.color || '#3b82f6' }}>
          <CardContent className="p-3">
            <div className="text-center mb-2">
              <h4 className="font-bold text-slate-800 text-sm">{dept.name}</h4>
              <Badge variant="outline" className="text-[10px] mt-1">{dept.code}</Badge>
            </div>
            
            {manager && (
              <div className="flex items-center justify-center gap-1.5 mb-2 bg-blue-50 p-1 rounded">
                <UserCircle className="w-3 h-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-800 truncate max-w-[150px]">
                  {manager.nombre}
                </span>
              </div>
            )}

            <div className="space-y-1 bg-slate-50 p-2 rounded text-xs border border-slate-100">
              {deptPositions.length > 0 ? (
                deptPositions.slice(0, 3).map(pos => (
                  <div key={pos.id} className="flex justify-between items-center">
                    <span className="truncate max-w-[100px]" title={pos.name}>{pos.name}</span>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1">{pos.max_headcount || 1}</Badge>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 italic text-center">Sin puestos</div>
              )}
              {deptPositions.length > 3 && (
                <div className="text-[10px] text-center text-slate-400">+{deptPositions.length - 3} más</div>
              )}
            </div>

            <div className="mt-2 pt-2 border-t text-[10px] text-slate-500 flex justify-between">
              <span>HC Planificado:</span>
              <span className="font-bold">{totalHeadcount}</span>
            </div>
          </CardContent>
        </Card>

        {children.length > 0 && (
          <>
            <div className="w-px h-6 bg-slate-300"></div>
            <ul className="flex justify-center gap-4 pt-4 border-t border-slate-300 relative">
              {/* Connector logic handled by flex/border trick or custom CSS */}
              {children.map(child => (
                <div key={child.id} className="relative px-2">
                  <div className="absolute -top-4 left-1/2 w-px h-4 bg-slate-300 -translate-x-1/2"></div>
                  <OrgNode dept={child} />
                </div>
              ))}
            </ul>
          </>
        )}
      </li>
    );
  };

  // Find root departments (parent_id is null or not found in list)
  const rootDepartments = departments.filter(d => !d.parent_id || !departments.find(p => p.id === d.parent_id));

  return (
    <div className="overflow-auto p-8 bg-slate-50 min-h-[600px] rounded-lg border border-slate-200">
      <div className="min-w-max flex justify-center">
        <ul className="flex gap-8">
          {rootDepartments.map(dept => (
            <OrgNode key={dept.id} dept={dept} />
          ))}
        </ul>
      </div>
      
      {rootDepartments.length === 0 && (
        <div className="text-center text-slate-400 mt-20">
          No hay estructura organizativa definida. Configúrala en el panel de Gestión.
        </div>
      )}

      {/* Basic CSS for tree structure connectors */}
      <style>{`
        ul {
          position: relative;
          padding-top: 20px; 
          transition: all 0.5s;
          -webkit-transition: all 0.5s;
          -moz-transition: all 0.5s;
        }
        
        li {
          float: left; text-align: center;
          list-style-type: none;
          position: relative;
          padding: 20px 5px 0 5px;
          
          transition: all 0.5s;
          -webkit-transition: all 0.5s;
          -moz-transition: all 0.5s;
        }

        /*Connectors*/
        li::before, li::after{
          content: '';
          position: absolute; top: 0; right: 50%;
          border-top: 1px solid #ccc;
          width: 50%; height: 20px;
        }
        li::after{
          right: auto; left: 50%;
          border-left: 1px solid #ccc;
        }

        /*Remove left-right connectors from elements without 
        any siblings*/
        li:only-child::after, li:only-child::before {
          display: none;
        }

        /*Remove space from the top of single children*/
        li:only-child{ padding-top: 0;}

        /*Remove left connector from first child and 
        right connector from last child*/
        li:first-child::before, li:last-child::after{
          border: 0 none;
        }
        /*Adding back the vertical connector to the last nodes*/
        li:last-child::before{
          border-right: 1px solid #ccc;
          border-radius: 0 5px 0 0;
          -webkit-border-radius: 0 5px 0 0;
          -moz-border-radius: 0 5px 0 0;
        }
        li:first-child::after{
          border-radius: 5px 0 0 0;
          -webkit-border-radius: 5px 0 0 0;
          -moz-border-radius: 5px 0 0 0;
        }

        /*Time to add downward connectors from parents*/
        ul ul::before{
          content: '';
          position: absolute; top: 0; left: 50%;
          border-left: 1px solid #ccc;
          width: 0; height: 20px;
        }
      `}</style>
    </div>
  );
}