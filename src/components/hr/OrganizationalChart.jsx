import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, UserCircle, MoreHorizontal, Plus, Edit, Trash2, ArrowRight 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

export default function OrganizationalChart({ 
  data, 
  onEdit, 
  onAddChild, 
  onDelete, 
  onMove 
}) {
  // Use props data if available, otherwise fetch
  const { data: fetchedDepts = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
    enabled: !data?.departments
  });

  const { data: fetchedPos = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list(),
    enabled: !data?.positions
  });

  const { data: fetchedEmps = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    enabled: !data?.employees
  });

  const departments = data?.departments || fetchedDepts;
  const positions = data?.positions || fetchedPos;
  const employees = data?.employees || fetchedEmps;

  // Recursive component for tree branch
  const OrgNode = ({ dept }) => {
    const children = departments.filter(d => d.parent_id === dept.id);
    const deptPositions = positions.filter(p => p.department_id === dept.id);
    const totalHeadcount = deptPositions.reduce((acc, p) => acc + (p.max_headcount || 0), 0);
    const manager = employees.find(e => e.id === dept.manager_id);

    return (
      <li className="flex flex-col items-center">
        <div className="relative group">
          <Card 
            className="w-64 border-t-4 shadow-md z-10 relative bg-white hover:shadow-lg transition-shadow cursor-default" 
            style={{ borderTopColor: dept.color || '#3b82f6' }}
          >
            <CardContent className="p-3">
              <div className="flex justify-between items-start absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                {(onEdit || onAddChild) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 bg-white/50 hover:bg-white shadow-sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onAddChild && (
                        <DropdownMenuItem onClick={() => onAddChild(dept.id)}>
                          <Plus className="w-4 h-4 mr-2" /> Añadir Sub-departamento
                        </DropdownMenuItem>
                      )}
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(dept)}>
                          <Edit className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                      )}
                      {onMove && (
                        <DropdownMenuItem onClick={() => onMove(dept)}>
                          <ArrowRight className="w-4 h-4 mr-2" /> Mover a...
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600" 
                            onClick={() => { if(confirm('¿Eliminar departamento?')) onDelete(dept.id); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="text-center mb-2 mt-1">
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

          {/* Add Child Button visual shortcut */}
          {onAddChild && (
             <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
               <Button 
                 size="icon" 
                 className="h-6 w-6 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-md border-2 border-white"
                 onClick={() => onAddChild(dept.id)}
                 title="Añadir hijo"
               >
                 <Plus className="w-3 h-3 text-white" />
               </Button>
             </div>
          )}
        </div>

        {children.length > 0 && (
          <>
            <div className="w-px h-6 bg-slate-300"></div>
            <ul className="flex justify-center gap-4 pt-4 border-t border-slate-300 relative">
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
