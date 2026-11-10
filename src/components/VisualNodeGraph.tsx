import React, { useState } from 'react';
import type { ShaderGraph, GraphNode } from '../nodes/nodeTypes';
import { Box, Layers, Sun, Sparkles, Cpu, Link, Trash2, Plus, Grid, Disc } from 'lucide-react';

interface VisualNodeGraphProps {
  graph: ShaderGraph;
  onChange: (graph: ShaderGraph) => void;
}

export const VisualNodeGraph: React.FC<VisualNodeGraphProps> = ({ graph, onChange }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (node: GraphNode, e: React.MouseEvent) => {
    setSelectedNodeId(node.id);
    setDraggingNodeId(node.id);
    setDragOffset({
      x: e.clientX - node.x,
      y: e.clientY - node.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId) return;
    const updated = graph.nodes.map((node) => {
      if (node.id === draggingNodeId) {
        return {
          ...node,
          x: Math.max(10, e.clientX - dragOffset.x),
          y: Math.max(10, e.clientY - dragOffset.y),
        };
      }
      return node;
    });
    onChange({ ...graph, nodes: updated });
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
  };

  const updateNodeInput = (nodeId: string, paramKey: string, val: any) => {
    const updated = graph.nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          inputs: {
            ...node.inputs,
            [paramKey]: val,
          },
        };
      }
      return node;
    });
    onChange({ ...graph, nodes: updated });
  };

  const addNode = (type: GraphNode['type'], title: string) => {
    const newNode: GraphNode = {
      id: `${type}_${Date.now()}`,
      type,
      title,
      x: 200 + Math.random() * 80,
      y: 100 + Math.random() * 80,
      inputs:
        type === 'sdTorus'
          ? { majorRadius: 1.2, minorRadius: 0.2 }
          : type === 'sdCylinder'
          ? { radius: 0.5, height: 1.0 }
          : type === 'opRepeat'
          ? { period: 4.0 }
          : { size: 1.0 },
    };
    onChange({
      ...graph,
      nodes: [...graph.nodes, newNode],
    });
  };

  const deleteNode = (id: string) => {
    onChange({
      nodes: graph.nodes.filter((n) => n.id !== id),
      connections: graph.connections.filter((c) => c.fromNode !== id && c.toNode !== id),
    });
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'sdSphere':
      case 'sdBox':
      case 'sdTorus':
      case 'sdGyroid':
        return <Box className="w-4 h-4 text-cyan-400" />;
      case 'sdCylinder':
        return <Disc className="w-4 h-4 text-cyan-300" />;
      case 'opRepeat':
        return <Grid className="w-4 h-4 text-indigo-400" />;
      case 'smin':
      case 'opUnion':
      case 'opIntersect':
        return <Layers className="w-4 h-4 text-purple-400" />;
      case 'lightBlinnPhong':
      case 'lightAO':
        return <Sun className="w-4 h-4 text-amber-400" />;
      case 'creatureBridge':
        return <Cpu className="w-4 h-4 text-emerald-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div
      className="relative w-full h-full bg-[#0d0f17] select-none overflow-hidden border border-slate-800 rounded-lg flex flex-col"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="flex items-center gap-1.5 p-2 bg-[#131622] border-b border-slate-800 text-xs flex-wrap">
        <span className="font-semibold text-slate-300 mr-1 flex items-center gap-1.5">
          <Link className="w-3.5 h-3.5 text-cyan-400" /> Shader Node Graph
        </span>
        <button
          onClick={() => addNode('sdSphere', 'Sphere SDF')}
          className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 cursor-pointer transition text-[11px]"
        >
          <Plus className="w-3 h-3 text-cyan-400" /> Sphere
        </button>
        <button
          onClick={() => addNode('sdGyroid', 'Gyroid SDF')}
          className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 cursor-pointer transition text-[11px]"
        >
          <Plus className="w-3 h-3 text-cyan-400" /> Gyroid
        </button>
        <button
          onClick={() => addNode('sdTorus', 'Torus SDF')}
          className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 cursor-pointer transition text-[11px]"
        >
          <Plus className="w-3 h-3 text-cyan-400" /> Torus
        </button>
        <button
          onClick={() => addNode('sdCylinder', 'Cylinder SDF')}
          className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 cursor-pointer transition text-[11px]"
        >
          <Plus className="w-3 h-3 text-cyan-300" /> Cylinder
        </button>
        <button
          onClick={() => addNode('opRepeat', 'Domain Repeat')}
          className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 cursor-pointer transition text-[11px]"
        >
          <Plus className="w-3 h-3 text-indigo-400" /> Repeat
        </button>
        <button
          onClick={() => addNode('smin', 'Smooth Min')}
          className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 cursor-pointer transition text-[11px]"
        >
          <Plus className="w-3 h-3 text-purple-400" /> smin
        </button>
      </div>

      <div className="relative flex-1 bg-[radial-gradient(#1e2436_1px,transparent_1px)] [background-size:16px_16px] overflow-auto">
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {graph.connections.map((c) => {
            const from = graph.nodes.find((n) => n.id === c.fromNode);
            const to = graph.nodes.find((n) => n.id === c.toNode);
            if (!from || !to) return null;

            const x1 = from.x + 200;
            const y1 = from.y + 45;
            const x2 = to.x;
            const y2 = to.y + 45;
            const dx = Math.abs(x2 - x1) * 0.5;

            return (
              <path
                key={c.id}
                d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={2.5}
                strokeDasharray="4 2"
                className="opacity-80"
              />
            );
          })}
        </svg>

        {graph.nodes.map((node) => {
          const isSelected = node.id === selectedNodeId;
          return (
            <div
              key={node.id}
              style={{ left: `${node.x}px`, top: `${node.y}px`, width: '210px' }}
              className={`absolute rounded-lg border shadow-xl bg-[#161a27] transition-shadow text-xs ${
                isSelected
                  ? 'border-cyan-400 ring-2 ring-cyan-500/30'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <div
                onMouseDown={(e) => handleMouseDown(node, e)}
                className="flex items-center justify-between p-2.5 bg-[#1b2031] border-b border-slate-700 rounded-t-lg cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-1.5 font-medium text-slate-200">
                  {getNodeIcon(node.type)}
                  <span>{node.title}</span>
                </div>
                {node.type !== 'outputShader' && (
                  <button
                    onClick={() => deleteNode(node.id)}
                    className="text-slate-400 hover:text-red-400 p-0.5 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="p-3 space-y-2.5">
                {node.type === 'sdSphere' && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Radius</span>
                      <span className="text-cyan-400">{node.inputs.radius ?? 1.0}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.05"
                      value={node.inputs.radius ?? 1.0}
                      onChange={(e) => updateNodeInput(node.id, 'radius', parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 h-1 bg-slate-700 rounded"
                    />
                  </div>
                )}

                {node.type === 'sdCylinder' && (
                  <>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Radius</span>
                        <span className="text-cyan-300">{node.inputs.radius ?? 0.5}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="2.0"
                        step="0.05"
                        value={node.inputs.radius ?? 0.5}
                        onChange={(e) => updateNodeInput(node.id, 'radius', parseFloat(e.target.value))}
                        className="w-full accent-cyan-300 h-1 bg-slate-700 rounded"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Height</span>
                        <span className="text-cyan-300">{node.inputs.height ?? 1.0}</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="4.0"
                        step="0.1"
                        value={node.inputs.height ?? 1.0}
                        onChange={(e) => updateNodeInput(node.id, 'height', parseFloat(e.target.value))}
                        className="w-full accent-cyan-300 h-1 bg-slate-700 rounded"
                      />
                    </div>
                  </>
                )}

                {node.type === 'opRepeat' && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Period</span>
                      <span className="text-indigo-400">{node.inputs.period ?? 4.0}</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="10.0"
                      step="0.5"
                      value={node.inputs.period ?? 4.0}
                      onChange={(e) => updateNodeInput(node.id, 'period', parseFloat(e.target.value))}
                      className="w-full accent-indigo-400 h-1 bg-slate-700 rounded"
                    />
                  </div>
                )}

                {node.type === 'sdGyroid' && (
                  <>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Scale / Freq</span>
                        <span className="text-cyan-400">{node.inputs.scale ?? 5.0}</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="15.0"
                        step="0.2"
                        value={node.inputs.scale ?? 5.0}
                        onChange={(e) => updateNodeInput(node.id, 'scale', parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 h-1 bg-slate-700 rounded"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Thickness</span>
                        <span className="text-cyan-400">{node.inputs.thickness ?? 0.05}</span>
                      </div>
                      <input
                        type="range"
                        min="0.01"
                        max="0.2"
                        step="0.005"
                        value={node.inputs.thickness ?? 0.05}
                        onChange={(e) => updateNodeInput(node.id, 'thickness', parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 h-1 bg-slate-700 rounded"
                      />
                    </div>
                  </>
                )}

                {node.type === 'smin' && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Smooth Blend (k)</span>
                      <span className="text-purple-400">{node.inputs.blendK ?? 0.35}</span>
                    </div>
                    <input
                      type="range"
                      min="0.02"
                      max="1.2"
                      step="0.02"
                      value={node.inputs.blendK ?? 0.35}
                      onChange={(e) => updateNodeInput(node.id, 'blendK', parseFloat(e.target.value))}
                      className="w-full accent-purple-400 h-1 bg-slate-700 rounded"
                    />
                  </div>
                )}

                {node.type === 'lightBlinnPhong' && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Specular Power</span>
                      <span className="text-amber-400">{node.inputs.specularPower ?? 32}</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="128"
                      step="4"
                      value={node.inputs.specularPower ?? 32}
                      onChange={(e) => updateNodeInput(node.id, 'specularPower', parseFloat(e.target.value))}
                      className="w-full accent-amber-400 h-1 bg-slate-700 rounded"
                    />
                  </div>
                )}

                {node.type === 'creatureBridge' && (
                  <div className="text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded border border-emerald-800/40">
                    Neural weight topology stream active. Feeds dynamic limbs & entropy modulation.
                  </div>
                )}

                {node.type === 'outputShader' && (
                  <div className="text-[11px] text-sky-400 bg-sky-950/40 p-2 rounded border border-sky-800/40">
                    Master Raymarching Quad Target (GLSL Fragment Shader).
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
