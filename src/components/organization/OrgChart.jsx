import React, { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { User, Users } from "lucide-react";

export default function OrgChart({ employees, structures }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !employees || !structures) return;
    drawChart();
  }, [employees, structures]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Build hierarchy tree
    const hierarchy = buildHierarchy();
    
    // Draw the tree
    const nodeWidth = 180;
    const nodeHeight = 80;
    const levelHeight = 120;
    
    drawNode(ctx, hierarchy, canvas.width / 2, 50, nodeWidth, nodeHeight, levelHeight);
  };

  const buildHierarchy = () => {
    const structureMap = new Map();
    structures.forEach(s => structureMap.set(s.employee_id, s));

    const employeeMap = new Map();
    employees.forEach(e => employeeMap.set(e.id, e));

    // Find root (CEO/Owner - no manager)
    const roots = structures.filter(s => !s.manager_id);
    
    const buildNode = (structure) => {
      const employee = employeeMap.get(structure.employee_id);
      const subordinates = structures
        .filter(s => s.manager_id === structure.employee_id)
        .map(buildNode);

      return {
        id: structure.employee_id,
        name: employee?.full_name || "Desconhecido",
        position: employee?.position || "",
        subordinates
      };
    };

    return roots.length > 0 ? buildNode(roots[0]) : null;
  };

  const drawNode = (ctx, node, x, y, width, height, levelHeight) => {
    if (!node) return;

    // Draw node box
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(x - width/2, y, width, height);
    
    // Draw text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(node.name, x, y + 25);
    
    ctx.font = '12px Arial';
    ctx.fillText(node.position, x, y + 45);

    ctx.fillStyle = '#93C5FD';
    ctx.fillText(`${node.subordinates.length} subordinados`, x, y + 65);

    // Draw lines to subordinates
    if (node.subordinates.length > 0) {
      const totalWidth = node.subordinates.length * (width + 50);
      const startX = x - totalWidth / 2 + width / 2;

      node.subordinates.forEach((sub, i) => {
        const subX = startX + i * (width + 50);
        const subY = y + levelHeight;

        // Draw line
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + height);
        ctx.lineTo(x, y + height + 20);
        ctx.lineTo(subX, y + height + 20);
        ctx.lineTo(subX, subY);
        ctx.stroke();

        // Draw subordinate
        drawNode(ctx, sub, subX, subY, width, height, levelHeight);
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="overflow-auto">
          <canvas 
            ref={canvasRef} 
            width={1200} 
            height={800}
            className="border rounded-lg bg-gray-50"
          />
        </div>
      </CardContent>
    </Card>
  );
}