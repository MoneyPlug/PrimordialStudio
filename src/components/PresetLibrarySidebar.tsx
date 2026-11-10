import React, { useState } from 'react';
import { PRESET_LIBRARY, type ShaderPresetTemplate } from '../presets/shaderPresets';
import {
  Sparkles,
  Search,
  Check,
  ChevronRight,
  Code2,
  X,
} from 'lucide-react';

export interface PresetLibrarySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: ShaderPresetTemplate) => void;
  activePresetId?: string;
}

export const PresetLibrarySidebar: React.FC<PresetLibrarySidebarProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  activePresetId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [previewPreset, setPreviewPreset] = useState<ShaderPresetTemplate | null>(null);

  if (!isOpen) return null;

  const categories = ['All', 'Abyssal', 'Cybernetic', 'Neural', 'Cosmic'];

  const filteredPresets = PRESET_LIBRARY.filter((preset) => {
    const matchesSearch =
      preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preset.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory =
      selectedCategory === 'All' || preset.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-y-0 left-0 z-40 w-84 bg-[#0e111a] border-r border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200 select-none">
      {/* Header */}
      <div className="p-3 bg-[#131724] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              Preset & Node Template Library
            </h3>
            <p className="text-[10px] text-slate-400">
              Instant morphological archetypes & GLSL graphs
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Filter */}
      <div className="p-2.5 border-b border-slate-800 space-y-2 bg-[#101420]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search archetypes, tags, nodes..."
            className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-900 border border-slate-700/80 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 text-[10px]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded cursor-pointer transition shrink-0 ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white font-medium'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Presets List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        {filteredPresets.map((preset) => {
          const isActive = preset.id === activePresetId;
          const [r, g, b] = preset.creatureParams.glowColor;
          const rgbColor = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;

          return (
            <div
              key={preset.id}
              className={`p-3 rounded-lg border transition-all text-xs bg-[#141826] flex flex-col gap-2 ${
                isActive
                  ? 'border-cyan-400 ring-1 ring-cyan-500/30'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: rgbColor }}
                  />
                  <h4 className="font-semibold text-slate-200 text-xs">{preset.name}</h4>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                  {preset.category}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {preset.description}
              </p>

              {/* Tags */}
              <div className="flex items-center gap-1 flex-wrap">
                {preset.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 text-cyan-400 border border-slate-800"
                  >
                    #{t}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                <button
                  onClick={() => onSelectPreset(preset)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium text-[11px] cursor-pointer transition shadow-md"
                >
                  {isActive ? <Check className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  {isActive ? 'Loaded' : 'Load Template'}
                </button>
                <button
                  onClick={() => setPreviewPreset(preset)}
                  className="p-1 px-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded cursor-pointer text-[11px]"
                  title="View GLSL & Graph Specs"
                >
                  <Code2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preset Details Modal / Inspection Overlay */}
      {previewPreset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-[#0c0e17] border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                {previewPreset.name} (GLSL Raymarching Snippet)
              </h3>
              <button
                onClick={() => setPreviewPreset(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">{previewPreset.description}</p>

            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] font-mono text-cyan-300 max-h-60 overflow-y-auto">
              <pre>{previewPreset.glslSnippet}</pre>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPreviewPreset(null)}
                className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs cursor-pointer hover:bg-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onSelectPreset(previewPreset);
                  setPreviewPreset(null);
                }}
                className="px-3 py-1 bg-cyan-600 text-white rounded text-xs cursor-pointer hover:bg-cyan-500 font-medium"
              >
                Apply This Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
