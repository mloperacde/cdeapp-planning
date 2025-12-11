import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import ReactFlow, { 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  Handle, 
  Position 
} from "reactflow";
import "reactflow/dist/style.css";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

// Custom Node Component
const DeptNode = ({ data }) => {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-white border-l-4 min-w-[200px]" style={{ borderLeftColor: data.color }}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-400" />
      <div className="font-bold text-slate-800">{data.label}</div>
      <div className="text-xs text-slate-500 mb-2">{data.managerName || "Sin Manager"}</div>
      
      <div className="space-y-1">
        {data.positions.slice(0, 3).map((pos, i) => (
          <div key={i} className="text-xs flex justify-between bg-slate-50 p-1 rounded">
            <span className="truncate max-w-[120px]">{pos.name}</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1">{pos.count}/{pos.max}</Badge>
          </div>
        ))}
        {data.positions.length > 3 && (
          <div className="text-xs text-slate-400 text-center">+{data.positions.length - 3} puestos más</div>
        )}
      </div>
      
      <div className="mt-2 pt-2 border-t flex justify-between items-center text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          Total: {data.totalHeadcount}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-400" />
    </div>
  );
};

const nodeTypes = {
  department: DeptNode,
};

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

  // Transform data to ReactFlow nodes/edges
  const { nodes, edges } = useMemo(() => {
    if (!departments.length) return { nodes: [], edges: [] };

    const nodes = [];
    const edges = [];
    const levelWidth = 300;
    const levelHeight = 250;
    
    // Group departments by parent
    const deptTree = {};
    departments.forEach(d => {
      const parentId = d.parent_id || 'root';
      if (!deptTree[parentId]) deptTree[parentId] = [];
      deptTree[parentId].push(d);
    });

    // Recursive layout builder (simple tree layout)
    const buildTree = (parentId, x, y, level) => {
      const children = deptTree[parentId] || [];
      if (!children.length) return 0;

      let currentX = x - (children.length * levelWidth) / 2;

      children.forEach((dept, i) => {
        const deptPositions = positions.filter(p => p.department_id === dept.id);
        const totalHeadcount = deptPositions.reduce((acc, p) => acc + (p.max_headcount || 0), 0);
        
        nodes.push({
          id: dept.id,
          type: 'department',
          position: { x: currentX, y },
          data: { 
            label: dept.name,
            color: dept.color || '#3b82f6',
            managerName: employees.find(e => e.id === dept.manager_id)?.nombre,
            positions: deptPositions.map(p => ({
              name: p.name,
              max: p.max_headcount,
              count: 0 // In future calculate real employee count assigned to position
            })),
            totalHeadcount
          },
        });

        if (parentId !== 'root') {
          edges.push({
            id: `e-${parentId}-${dept.id}`,
            source: parentId,
            target: dept.id,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#94a3b8' }
          });
        }

        // Recursively build children
        const childrenWidth = buildTree(dept.id, currentX, y + levelHeight, level + 1);
        currentX += Math.max(levelWidth, childrenWidth); // Adjust spacing
      });

      return children.length * levelWidth;
    };

    // Start with root departments (those with no parent or explicit root)
    buildTree('root', 0, 0, 0);

    return { nodes, edges };
  }, [departments, positions, employees]);

  return (
    <div className="h-[600px] w-full bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls />
        <Background color="#cbd5e1" gap={16} />
      </ReactFlow>
    </div>
  );
}