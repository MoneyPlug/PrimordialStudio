import React, { useState } from 'react';
import { ARCHETYPE_PRESETS, type ArchetypePreset } from '../nodes/archetypePresets';
import type { ShaderGraph } from '../nodes/nodeTypes';
import { graphToGlsl, glslToGraph } from '../compiler/glslTranspiler';
import {
  Boxes,
  Sparkles,
  ArrowRight,
  Code2,
  CheckCircle2,
  BookmarkPlus,
  Copy,
} from 'lucide-react';

interface PresetLibrarySidebarProps {
  currentGraph: ShaderGraph;
  onApplyPreset: (preset: ArchetypePreset) => void;
  onApplyGlsl?: (glsl: string, parsedGraph: ShaderGraph) => void;
}

export const PresetLibrarySidebar: React.FC<PresetLibrarySidebarProps> = ({
  currentGraph,
  onApplyPreset,
  onApplyGlsl: _onApplyGlsl,
}) => {
  const [presets, setPresets] = useState<ArchetypePreset[]>(ARCHETYPE_PRESETS);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(ARCHETYPE_PRESETS[0].id);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [isTranspiledOk, setIsTranspiledOk] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ['All', 'Creature', 'Fractal', 'Cosmic', 'Architectural'];

  const filteredPresets = presets.filter((p) =>
    filterCategory === 'All' ? true : p.category === filterCategory
  );

  const handleSelectAndApply = (preset: ArchetypePreset) => {
    setSelectedPresetId(preset.id);
    onApplyPreset(preset);

    // Verify bi-directional transpilation
    try {
      const generatedGlsl = graphToGlsl(preset.graph);
      const roundtripGraph = glslToGraph(generatedGlsl);
      setIsTranspiledOk(roundtripGraph.nodes.length > 0);
    } catch {
      setIsTranspiledOk(false);
    }
  };

  const handleSaveCurrentAsPreset = () => {
    const newName = `Custom Archetype ${presets.length + 1}`;
    const generatedGlsl = graphToGlsl(currentGraph);
    const newPreset: ArchetypePreset = {
      id: `custom_${Date.now()}`,
      name: newName,
      category: 'Creature',
      description: 'User-designed modular SDF raymarching node archetype.',
      tags: ['Custom', 'User Preset'],
      graph: currentGraph,
      glsl: generatedGlsl,
    };
    setPresets([newPreset, ...presets]);
    setSelectedPresetId(newPreset.id);
  };

  const copyGlslSnippet = (preset: ArchetypePreset) => {
    const code = preset.glsl || graphToGlsl(preset.graph);
    navigator.clipboard.writeText(code);
    setCopiedId(preset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1017] border-l border-slate-800 text-slate-200 text-xs overflow-hidden select-none">
      {/* Header */}
      <div className="p-3 bg-[#131622] border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-100 block">Archetype Presets</span>
            <span className="text-[10px] text-slate-400">Modular Node Templates</span>
          </div>
        </div>

        <button
          onClick={handleSaveCurrentAsPreset}
          className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 cursor-pointer transition text-[11px]"
          title="Save active graph as a new preset"
        >
          <BookmarkPlus className="w-3.5 h-3.5 text-cyan-400" /> Save
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1 p-2 bg-[#10131d] border-b border-slate-800 overflow-x-auto shrink-0">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-2 py-0.5 rounded-full text-[10px] transition cursor-pointer shrink-0 ${
              filterCategory === cat
                ? 'bg-cyan-600 text-white font-medium'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Preset List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredPresets.map((preset) => {
          const isSelected = selectedPresetId === preset.id;
          return (
            <div
              key={preset.id}
              onClick={() => handleSelectAndApply(preset)}
              className={`p-2.5 rounded-lg border transition cursor-pointer flex flex-col gap-1.5 ${
                isSelected
                  ? 'bg-[#151b2a] border-cyan-500 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                  : 'bg-[#111420] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-cyan-400" /> {preset.name}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  {preset.category}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {preset.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mt-0.5">
                {preset.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 text-cyan-400/90 font-mono border border-slate-800/80"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 mt-1">
                <span className="text-[10px] text-slate-500 font-mono">
                  {preset.graph.nodes.length} Nodes • {preset.graph.connections.length} Edges
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyGlslSnippet(preset);
                    }}
                    className="p-1 hover:text-cyan-300 text-slate-400 rounded cursor-pointer transition"
                    title="Copy transpiled GLSL source"
                  >
                    {copiedId === preset.id ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAndApply(preset);
                    }}
                    className="px-2 py-0.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded font-medium flex items-center gap-1 text-[10px] cursor-pointer"
                  >
                    Apply <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bi-directional Transpilation Status Footer */}
      <div className="p-2.5 bg-[#121622] border-t border-slate-800 shrink-0 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-300 flex items-center gap-1">
            <Code2 className="w-3.5 h-3.5 text-cyan-400" /> Transpiler Status:
          </span>
          {isTranspiledOk ? (
            <span className="text-emerald-400 font-mono flex items-center gap-1 text-[10px]">
              <CheckCircle2 className="w-3 h-3" /> Bi-directional Sync
            </span>
          ) : (
            <span className="text-rose-400 font-mono text-[10px]">Syntax Divergence</span>
          )}
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          Graph &harr; GLSL 96-step Raymarching compiler ready.
        </div>
      </div>
    </div>
  );
};
