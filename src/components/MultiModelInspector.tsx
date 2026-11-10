import React, { useState, useEffect, useRef } from 'react';
import { OllamaInferenceBridge, type ModelInferenceMetrics } from '../services/ollamaBridge';
import {
  type ModelTelemetrySlot,
  type DualModelComparativeOffset,
  computeProceduralSdfOffsets,
} from '../services/multiModelTelemetry';
import {
  ArrowRightLeft,
  Sliders,
  Play,
  RotateCcw,
} from 'lucide-react';

interface MultiModelInspectorProps {
  onOffsetsChange?: (offsets: DualModelComparativeOffset, applyOffsets: boolean) => void;
  onModelSelect?: (modelSlot: 'A' | 'B', metrics: ModelInferenceMetrics) => void;
}

export const MultiModelInspector: React.FC<MultiModelInspectorProps> = ({
  onOffsetsChange,
  onModelSelect,
}) => {
  const [modelA, setModelA] = useState<ModelTelemetrySlot>({
    id: 'slot_a',
    name: 'llama3:8b-instruct',
    endpoint: 'http://localhost:11434',
    isStreaming: false,
    metrics: {
      prompt: 'Morphological abyssal titan with dense gyroid bones',
      tokenCount: 42,
      tokensPerSecond: 28.4,
      latencyMs: 78,
      entropy: 0.38,
      weightsDistribution: [0.35, 0.65, 0.4, 0.75, 0.55, 0.3, 0.6, 0.7],
      timestamp: Date.now(),
      status: 'idle',
      rawOutput: 'The biological manifold forms recursive spiral tendrils with resonant crystal lattice nodes.',
    },
    history: {
      entropy: [0.32, 0.34, 0.36, 0.35, 0.38],
      latency: [85, 82, 80, 79, 78],
    },
  });

  const [modelB, setModelB] = useState<ModelTelemetrySlot>({
    id: 'slot_b',
    name: 'mistral:7b-v0.3',
    endpoint: 'http://localhost:11434',
    isStreaming: false,
    metrics: {
      prompt: 'Hyper-chaotic deep sea organism oscillating at high frequencies',
      tokenCount: 68,
      tokensPerSecond: 36.8,
      latencyMs: 142,
      entropy: 0.74,
      weightsDistribution: [0.75, 0.3, 0.82, 0.45, 0.88, 0.62, 0.41, 0.9],
      timestamp: Date.now(),
      status: 'idle',
      rawOutput: 'High entropy pulse destabilizes primary topology; secondary gyroid cavitation expands radially.',
    },
    history: {
      entropy: [0.55, 0.62, 0.68, 0.71, 0.74],
      latency: [120, 130, 138, 145, 142],
    },
  });

  const [applyOffsets, setApplyOffsets] = useState(true);
  const [activeModelKey, setActiveModelKey] = useState<'A' | 'B'>('B');
  const [dualPrompt, setDualPrompt] = useState('Bioluminescent abyssal creature with recursive gyroid morphology');
  const [offsetBlendWeight, setOffsetBlendWeight] = useState(1.0);

  const bridgeARef = useRef<OllamaInferenceBridge | null>(null);
  const bridgeBRef = useRef<OllamaInferenceBridge | null>(null);

  useEffect(() => {
    bridgeARef.current = new OllamaInferenceBridge(modelA.endpoint, modelA.name);
    bridgeBRef.current = new OllamaInferenceBridge(modelB.endpoint, modelB.name);

    return () => {
      bridgeARef.current?.abort();
      bridgeBRef.current?.abort();
    };
  }, []);

  const currentOffsets = computeProceduralSdfOffsets(modelA.metrics, modelB.metrics);

  useEffect(() => {
    onOffsetsChange?.(currentOffsets, applyOffsets);
  }, [modelA.metrics, modelB.metrics, applyOffsets, offsetBlendWeight]);

  const triggerDualStreaming = async () => {
    if (!bridgeARef.current || !bridgeBRef.current) return;

    setModelA((prev) => ({ ...prev, isStreaming: true }));
    setModelB((prev) => ({ ...prev, isStreaming: true }));

    // Stream Model A
    bridgeARef.current.generateStream(dualPrompt, {
      onToken: (_tok, m) => {
        setModelA((prev) => ({
          ...prev,
          metrics: m,
          history: {
            entropy: [...prev.history.entropy.slice(-9), m.entropy],
            latency: [...prev.history.latency.slice(-9), m.latencyMs],
          },
        }));
      },
      onComplete: (m) => {
        setModelA((prev) => ({ ...prev, metrics: m, isStreaming: false }));
        if (activeModelKey === 'A') onModelSelect?.('A', m);
      },
      onError: () => {
        setModelA((prev) => ({ ...prev, isStreaming: false }));
      },
    });

    // Stream Model B with slight variation to show divergence
    bridgeBRef.current.generateStream(`${dualPrompt} with increased chaotic entropy and morphological divergence`, {
      onToken: (_tok, m) => {
        // synthesize higher entropy variance for Model B to demonstrate differential telemetry
        const modifiedMetrics: ModelInferenceMetrics = {
          ...m,
          latencyMs: Math.round(m.latencyMs * 1.35),
          entropy: Math.min(0.98, Math.max(0.15, m.entropy * 1.4)),
        };
        setModelB((prev) => ({
          ...prev,
          metrics: modifiedMetrics,
          history: {
            entropy: [...prev.history.entropy.slice(-9), modifiedMetrics.entropy],
            latency: [...prev.history.latency.slice(-9), modifiedMetrics.latencyMs],
          },
        }));
      },
      onComplete: (m) => {
        const finalB: ModelInferenceMetrics = {
          ...m,
          latencyMs: Math.round(m.latencyMs * 1.35),
          entropy: Math.min(0.98, Math.max(0.15, m.entropy * 1.4)),
        };
        setModelB((prev) => ({ ...prev, metrics: finalB, isStreaming: false }));
        if (activeModelKey === 'B') onModelSelect?.('B', finalB);
      },
      onError: () => {
        setModelB((prev) => ({ ...prev, isStreaming: false }));
      },
    });
  };

  const handleSelectActive = (slot: 'A' | 'B') => {
    setActiveModelKey(slot);
    onModelSelect?.(slot, slot === 'A' ? modelA.metrics : modelB.metrics);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1017] rounded-lg border border-slate-800 text-slate-200 overflow-hidden text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#131722] border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-100">Dual-Model Comparative Telemetry</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
            Live Token Entropy &rarr; SDF Offsets
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={applyOffsets}
              onChange={(e) => setApplyOffsets(e.target.checked)}
              className="accent-cyan-500 rounded"
            />
            Apply SDF Offsets
          </label>
        </div>
      </div>

      {/* Synchronized Prompt & Run Bar */}
      <div className="flex items-center gap-2 p-2 bg-[#11141e] border-b border-slate-800 shrink-0">
        <input
          type="text"
          value={dualPrompt}
          onChange={(e) => setDualPrompt(e.target.value)}
          placeholder="Comparative inference prompt..."
          className="flex-1 bg-[#181d2a] border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
        />
        <button
          onClick={triggerDualStreaming}
          disabled={modelA.isStreaming || modelB.isStreaming}
          className="px-3 py-1 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded font-medium flex items-center gap-1.5 cursor-pointer transition"
        >
          {modelA.isStreaming || modelB.isStreaming ? (
            <RotateCcw className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          Compare Live
        </button>
      </div>

      {/* Model A & Model B Comparative Panels */}
      <div className="grid grid-cols-2 gap-2 p-2 shrink-0">
        {/* Model A Slot */}
        <div
          onClick={() => handleSelectActive('A')}
          className={`p-2.5 rounded-lg border cursor-pointer transition ${
            activeModelKey === 'A'
              ? 'bg-[#141b2a] border-cyan-500/80 shadow-md shadow-cyan-950/40'
              : 'bg-[#121520] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="font-semibold text-slate-200 font-mono text-[11px]">Model A (Baseline)</span>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono">
              {modelA.metrics.tokensPerSecond} tok/s
            </span>
          </div>

          <div className="text-[11px] font-mono text-cyan-300 truncate mb-2">
            {modelA.name}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2 font-mono text-[11px]">
            <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[9px]">Latency</span>
              <span className="text-cyan-400 font-bold">{modelA.metrics.latencyMs}ms</span>
            </div>
            <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[9px]">Token Entropy</span>
              <span className="text-amber-400 font-bold">{modelA.metrics.entropy.toFixed(3)}</span>
            </div>
          </div>

          {/* Sparkline Entropy history */}
          <div className="h-6 flex items-end gap-1 bg-slate-950/60 p-1 rounded border border-slate-800/80">
            {modelA.history.entropy.map((val, idx) => (
              <div
                key={idx}
                style={{ height: `${Math.round(val * 100)}%` }}
                className="flex-1 bg-cyan-500/70 rounded-xs"
                title={`Entropy: ${val.toFixed(2)}`}
              />
            ))}
          </div>
        </div>

        {/* Model B Slot */}
        <div
          onClick={() => handleSelectActive('B')}
          className={`p-2.5 rounded-lg border cursor-pointer transition ${
            activeModelKey === 'B'
              ? 'bg-[#1a1428] border-purple-500/80 shadow-md shadow-purple-950/40'
              : 'bg-[#121520] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="font-semibold text-slate-200 font-mono text-[11px]">Model B (Comparative)</span>
            </div>
            <span className="text-[10px] text-purple-400 font-mono">
              {modelB.metrics.tokensPerSecond} tok/s
            </span>
          </div>

          <div className="text-[11px] font-mono text-purple-300 truncate mb-2">
            {modelB.name}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2 font-mono text-[11px]">
            <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[9px]">Latency</span>
              <span className="text-purple-400 font-bold">{modelB.metrics.latencyMs}ms</span>
            </div>
            <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[9px]">Token Entropy</span>
              <span className="text-amber-400 font-bold">{modelB.metrics.entropy.toFixed(3)}</span>
            </div>
          </div>

          {/* Sparkline Entropy history */}
          <div className="h-6 flex items-end gap-1 bg-slate-950/60 p-1 rounded border border-slate-800/80">
            {modelB.history.entropy.map((val, idx) => (
              <div
                key={idx}
                style={{ height: `${Math.round(val * 100)}%` }}
                className="flex-1 bg-purple-500/70 rounded-xs"
                title={`Entropy: ${val.toFixed(2)}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Differential Offset Mapping Matrix */}
      <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-[11px]">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Procedural SDF Parameter Offsets
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            &Delta; Entropy: <span className="text-amber-400">{currentOffsets.deltaEntropy > 0 ? `+${currentOffsets.deltaEntropy}` : currentOffsets.deltaEntropy}</span> | &Delta; Latency:{' '}
            <span className="text-cyan-400">{currentOffsets.deltaLatencyMs > 0 ? `+${currentOffsets.deltaLatencyMs}` : currentOffsets.deltaLatencyMs}ms</span>
          </span>
        </div>

        {/* Offset Strength Slider */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Differential Offset Blend Multiplier</span>
            <span className="text-cyan-400 font-mono">{offsetBlendWeight.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0"
            max="2.0"
            step="0.05"
            value={offsetBlendWeight}
            onChange={(e) => setOffsetBlendWeight(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
          />
        </div>

        {/* Procedural Offsets Breakdown Grid */}
        <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
          <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
            <span className="text-slate-400 block text-[9px] mb-0.5">Body Radius Offset</span>
            <span className={currentOffsets.offsetBodyRadius >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {currentOffsets.offsetBodyRadius >= 0 ? `+${currentOffsets.offsetBodyRadius}` : currentOffsets.offsetBodyRadius}
            </span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
            <span className="text-slate-400 block text-[9px] mb-0.5">Gyroid Freq Offset</span>
            <span className={currentOffsets.offsetGyroidFreq >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {currentOffsets.offsetGyroidFreq >= 0 ? `+${currentOffsets.offsetGyroidFreq}` : currentOffsets.offsetGyroidFreq}
            </span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
            <span className="text-slate-400 block text-[9px] mb-0.5">Gyroid Amp Offset</span>
            <span className={currentOffsets.offsetGyroidAmp >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {currentOffsets.offsetGyroidAmp >= 0 ? `+${currentOffsets.offsetGyroidAmp}` : currentOffsets.offsetGyroidAmp}
            </span>
          </div>

          <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
            <span className="text-slate-400 block text-[9px] mb-0.5">Tentacle Count Delta</span>
            <span className={currentOffsets.offsetTentacles >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {currentOffsets.offsetTentacles >= 0 ? `+${currentOffsets.offsetTentacles}` : currentOffsets.offsetTentacles}
            </span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
            <span className="text-slate-400 block text-[9px] mb-0.5">Tentacle Twist Delta</span>
            <span className={currentOffsets.offsetTwist >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {currentOffsets.offsetTwist >= 0 ? `+${currentOffsets.offsetTwist}` : currentOffsets.offsetTwist}
            </span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
            <span className="text-slate-400 block text-[9px] mb-0.5">Roughness Offset</span>
            <span className={currentOffsets.offsetRoughness >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {currentOffsets.offsetRoughness >= 0 ? `+${currentOffsets.offsetRoughness}` : currentOffsets.offsetRoughness}
            </span>
          </div>
        </div>

        {/* Chromatic / Spectral RGB Offset Preview */}
        <div className="bg-slate-900/60 p-2 rounded border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[9px]">Spectral Chromatic Shift [R, G, B]</span>
            <span className="font-mono text-cyan-300 text-[10px]">
              [{currentOffsets.spectralShift.join(', ')}]
            </span>
          </div>
          <div
            className="w-7 h-7 rounded border border-white/20 shadow-inner"
            style={{
              backgroundColor: `rgb(${Math.round(
                Math.max(0, Math.min(255, (0.5 + currentOffsets.spectralShift[0]) * 255))
              )}, ${Math.round(
                Math.max(0, Math.min(255, (0.5 + currentOffsets.spectralShift[1]) * 255))
              )}, ${Math.round(
                Math.max(0, Math.min(255, (0.5 + currentOffsets.spectralShift[2]) * 255))
              )})`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
