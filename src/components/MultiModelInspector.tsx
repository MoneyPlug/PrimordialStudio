import React, { useState, useEffect, useRef } from 'react';
import type { ModelInferenceMetrics } from '../services/ollamaBridge';
import { OllamaInferenceBridge } from '../services/ollamaBridge';
import { mapMetricsToCreatureSDF, type CreatureSDFParams } from '../sdf/creatureSdf';
import {
  Play,
  RefreshCw,
  Sliders,
  X,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react';

export interface MultiModelInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  primaryMetrics: ModelInferenceMetrics;
  onApplyModelMetrics?: (metrics: ModelInferenceMetrics) => void;
}

export interface SparklinePoint {
  time: number;
  value: number;
}

export function computeParameterOffsets(
  primaryParams: CreatureSDFParams,
  secondaryParams: CreatureSDFParams
) {
  return {
    gyroidFreq: +(secondaryParams.gyroidFreq - primaryParams.gyroidFreq).toFixed(2),
    gyroidAmp: +(secondaryParams.gyroidAmp - primaryParams.gyroidAmp).toFixed(2),
    tentacleCount: secondaryParams.tentacleCount - primaryParams.tentacleCount,
    tentacleLength: +(secondaryParams.tentacleLength - primaryParams.tentacleLength).toFixed(2),
    tentacleTwist: +(secondaryParams.tentacleTwist - primaryParams.tentacleTwist).toFixed(2),
    smoothBlend: +(secondaryParams.smoothBlend - primaryParams.smoothBlend).toFixed(2),
    pulseSpeed: +(secondaryParams.pulseSpeed - primaryParams.pulseSpeed).toFixed(2),
    roughness: +(secondaryParams.roughness - primaryParams.roughness).toFixed(2),
  };
}

export const Sparkline: React.FC<{
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  min?: number;
  max?: number;
  label?: string;
}> = ({ data, color = '#38bdf8', height = 36, width = 160, min, max, label }) => {
  if (data.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center text-[10px] text-slate-500 bg-slate-900/60 rounded border border-slate-800"
      >
        Waiting for stream...
      </div>
    );
  }

  const computedMin = min ?? Math.min(...data);
  const computedMax = max ?? Math.max(...data);
  const range = computedMax - computedMin || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 4) + 2;
      const normalized = (val - computedMin) / range;
      const y = height - (normalized * (height - 8) + 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const lastValue = data[data.length - 1];

  return (
    <div className="relative inline-flex flex-col bg-slate-900/70 p-1 rounded border border-slate-800/80">
      {label && (
        <div className="flex justify-between items-center text-[9px] text-slate-400 px-1 mb-0.5">
          <span>{label}</span>
          <span className="font-mono text-slate-200">{lastValue.toFixed(2)}</span>
        </div>
      )}
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {/* Glow dot at last point */}
        {data.length > 0 && (
          <circle
            cx={(width - 4) + 2}
            cy={height - (((lastValue - computedMin) / range) * (height - 8) + 4)}
            r="2.5"
            fill={color}
          />
        )}
      </svg>
    </div>
  );
};

export const MultiModelInspector: React.FC<MultiModelInspectorProps> = ({
  isOpen,
  onClose,
  primaryMetrics,
  onApplyModelMetrics,
}) => {
  // Secondary model state (e.g. comparing Llama-3 vs Mistral / custom weights)
  const [modelA, setModelA] = useState('llama3:latest');
  const [modelB, setModelB] = useState('mistral:7b-instruct');

  const [metricsA, setMetricsA] = useState<ModelInferenceMetrics>(primaryMetrics);
  const [metricsB, setMetricsB] = useState<ModelInferenceMetrics>({
    prompt: primaryMetrics.prompt || 'Deep abyss bioluminescent entity with crystalline lattice',
    tokenCount: 42,
    tokensPerSecond: 31.4,
    latencyMs: 64,
    entropy: 0.62,
    weightsDistribution: [0.65, 0.42, 0.88, 0.35, 0.72, 0.58, 0.44, 0.81],
    timestamp: Date.now(),
    status: 'idle',
    rawOutput: 'Secondary model synthetic generation stream active...',
  });

  const [isInferringA, setIsInferringA] = useState(false);
  const [isInferringB, setIsInferringB] = useState(false);

  // Sparkline history buffers
  const [latencyHistoryA, setLatencyHistoryA] = useState<number[]>([primaryMetrics.latencyMs]);
  const [entropyHistoryA, setEntropyHistoryA] = useState<number[]>([primaryMetrics.entropy]);
  const [latencyHistoryB, setLatencyHistoryB] = useState<number[]>([64]);
  const [entropyHistoryB, setEntropyHistoryB] = useState<number[]>([0.62]);

  const bridgeARef = useRef<OllamaInferenceBridge | null>(null);
  const bridgeBRef = useRef<OllamaInferenceBridge | null>(null);

  useEffect(() => {
    bridgeARef.current = new OllamaInferenceBridge('http://localhost:11434', modelA);
    bridgeBRef.current = new OllamaInferenceBridge('http://localhost:11434', modelB);
    return () => {
      bridgeARef.current?.abort();
      bridgeBRef.current?.abort();
    };
  }, []);

  // Sync external primary metrics changes to slot A
  useEffect(() => {
    setMetricsA(primaryMetrics);
    setLatencyHistoryA((prev) => [...prev.slice(-19), primaryMetrics.latencyMs]);
    setEntropyHistoryA((prev) => [...prev.slice(-19), primaryMetrics.entropy]);
  }, [primaryMetrics]);

  if (!isOpen) return null;

  const sdfA = mapMetricsToCreatureSDF(metricsA);
  const sdfB = mapMetricsToCreatureSDF(metricsB);
  const offsets = computeParameterOffsets(sdfA, sdfB);

  const runSlotAInference = async () => {
    if (!bridgeARef.current) return;
    setIsInferringA(true);
    bridgeARef.current.setModel(modelA);
    await bridgeARef.current.generateStream(metricsA.prompt || 'Synthesize morphology', {
      onToken: (_token, m) => {
        setMetricsA(m);
        setLatencyHistoryA((prev) => [...prev.slice(-19), m.latencyMs]);
        setEntropyHistoryA((prev) => [...prev.slice(-19), m.entropy]);
      },
      onComplete: (m) => {
        setMetricsA(m);
        setIsInferringA(false);
      },
      onError: () => setIsInferringA(false),
    });
  };

  const runSlotBInference = async () => {
    if (!bridgeBRef.current) return;
    setIsInferringB(true);
    bridgeBRef.current.setModel(modelB);
    await bridgeBRef.current.generateStream(metricsB.prompt || 'Synthesize morphology', {
      onToken: (_token, m) => {
        setMetricsB(m);
        setLatencyHistoryB((prev) => [...prev.slice(-19), m.latencyMs]);
        setEntropyHistoryB((prev) => [...prev.slice(-19), m.entropy]);
      },
      onComplete: (m) => {
        setMetricsB(m);
        setIsInferringB(false);
      },
      onError: () => setIsInferringB(false),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl bg-[#0c0e17] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-800 bg-[#121624] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Multi-Model Latency & Weight Inspector Overlay
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Telemetry Comparison
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Inspect side-by-side inference streams, sparklines, and active SDF parameter offsets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Split Panes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Slot A: Model 1 */}
            <div className="bg-[#131726] border border-cyan-900/50 rounded-lg p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold">
                    Slot A
                  </span>
                  <input
                    type="text"
                    value={modelA}
                    onChange={(e) => setModelA(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 font-mono w-36 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={runSlotAInference}
                    disabled={isInferringA}
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition"
                  >
                    {isInferringA ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Stream
                  </button>
                  {onApplyModelMetrics && (
                    <button
                      onClick={() => onApplyModelMetrics(metricsA)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 rounded text-[10px] cursor-pointer"
                      title="Apply Slot A weights to master studio creature"
                    >
                      Apply To Studio
                    </button>
                  )}
                </div>
              </div>

              {/* Sparklines row */}
              <div className="grid grid-cols-2 gap-2">
                <Sparkline
                  data={entropyHistoryA}
                  color="#38bdf8"
                  min={0.0}
                  max={1.0}
                  label="Entropy (Chaos)"
                  width={180}
                />
                <Sparkline
                  data={latencyHistoryA}
                  color="#a855f7"
                  min={0}
                  max={300}
                  label="Latency (ms)"
                  width={180}
                />
              </div>

              {/* Latent weights */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Latent Weight Vector</span>
                  <span className="text-cyan-400 font-mono">{metricsA.tokensPerSecond} tok/s</span>
                </div>
                <div className="grid grid-cols-8 gap-1 h-9 bg-slate-950 p-1 rounded border border-slate-800">
                  {metricsA.weightsDistribution.map((w, idx) => (
                    <div key={idx} className="flex flex-col justify-end h-full">
                      <div
                        style={{ height: `${Math.round(w * 100)}%` }}
                        className="bg-cyan-500/80 hover:bg-cyan-400 rounded-xs transition-all"
                        title={`Dim ${idx}: ${w.toFixed(2)}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Morphology summary */}
              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono bg-slate-900/60 p-2 rounded border border-slate-800/80">
                <div>
                  <span className="text-slate-500 text-[10px] block">Gyroid</span>
                  <span className="text-cyan-300">{sdfA.gyroidFreq}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Tentacles</span>
                  <span className="text-purple-300">{sdfA.tentacleCount}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">smin blend</span>
                  <span className="text-amber-300">{sdfA.smoothBlend}</span>
                </div>
              </div>
            </div>

            {/* Slot B: Model 2 */}
            <div className="bg-[#131726] border border-purple-900/50 rounded-lg p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-[11px] font-bold">
                    Slot B
                  </span>
                  <input
                    type="text"
                    value={modelB}
                    onChange={(e) => setModelB(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 font-mono w-36 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={runSlotBInference}
                    disabled={isInferringB}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition"
                  >
                    {isInferringB ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Stream
                  </button>
                  {onApplyModelMetrics && (
                    <button
                      onClick={() => onApplyModelMetrics(metricsB)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-800/60 rounded text-[10px] cursor-pointer"
                      title="Apply Slot B weights to master studio creature"
                    >
                      Apply To Studio
                    </button>
                  )}
                </div>
              </div>

              {/* Sparklines row */}
              <div className="grid grid-cols-2 gap-2">
                <Sparkline
                  data={entropyHistoryB}
                  color="#c084fc"
                  min={0.0}
                  max={1.0}
                  label="Entropy (Chaos)"
                  width={180}
                />
                <Sparkline
                  data={latencyHistoryB}
                  color="#ec4899"
                  min={0}
                  max={300}
                  label="Latency (ms)"
                  width={180}
                />
              </div>

              {/* Latent weights */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Latent Weight Vector</span>
                  <span className="text-purple-400 font-mono">{metricsB.tokensPerSecond} tok/s</span>
                </div>
                <div className="grid grid-cols-8 gap-1 h-9 bg-slate-950 p-1 rounded border border-slate-800">
                  {metricsB.weightsDistribution.map((w, idx) => (
                    <div key={idx} className="flex flex-col justify-end h-full">
                      <div
                        style={{ height: `${Math.round(w * 100)}%` }}
                        className="bg-purple-500/80 hover:bg-purple-400 rounded-xs transition-all"
                        title={`Dim ${idx}: ${w.toFixed(2)}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Morphology summary */}
              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono bg-slate-900/60 p-2 rounded border border-slate-800/80">
                <div>
                  <span className="text-slate-500 text-[10px] block">Gyroid</span>
                  <span className="text-purple-300">{sdfB.gyroidFreq}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Tentacles</span>
                  <span className="text-purple-300">{sdfB.tentacleCount}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">smin blend</span>
                  <span className="text-amber-300">{sdfB.smoothBlend}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active SDF Parameter Offsets Diff Panel */}
          <div className="bg-[#101420] border border-slate-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Active SDF Parameter Offsets (Slot B vs. Slot A)
              </span>
              <span className="text-[10px] text-slate-400">
                Dynamic morphological shifts driven by model confidence & output structure
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              <div className="bg-slate-900/70 p-2 rounded border border-slate-800/80">
                <div className="text-[10px] text-slate-400">Gyroid Freq Offset</div>
                <div className={`text-xs font-mono font-bold ${offsets.gyroidFreq >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {offsets.gyroidFreq >= 0 ? `+${offsets.gyroidFreq}` : offsets.gyroidFreq}
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  Internal skeletal density shift
                </div>
              </div>

              <div className="bg-slate-900/70 p-2 rounded border border-slate-800/80">
                <div className="text-[10px] text-slate-400">Tentacle Twist Offset</div>
                <div className={`text-xs font-mono font-bold ${offsets.tentacleTwist >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {offsets.tentacleTwist >= 0 ? `+${offsets.tentacleTwist}` : offsets.tentacleTwist}
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  Entropy-driven helical curvature
                </div>
              </div>

              <div className="bg-slate-900/70 p-2 rounded border border-slate-800/80">
                <div className="text-[10px] text-slate-400">smin Blending Offset</div>
                <div className={`text-xs font-mono font-bold ${offsets.smoothBlend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {offsets.smoothBlend >= 0 ? `+${offsets.smoothBlend}` : offsets.smoothBlend}
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  Organic manifold fusion radius
                </div>
              </div>

              <div className="bg-slate-900/70 p-2 rounded border border-slate-800/80">
                <div className="text-[10px] text-slate-400">Tentacle Count Offset</div>
                <div className={`text-xs font-mono font-bold ${offsets.tentacleCount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {offsets.tentacleCount >= 0 ? `+${offsets.tentacleCount}` : offsets.tentacleCount}
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  Radially symmetric appendage branches
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#121624] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dual inference bridges active • Ready for comparative morphological inspection</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
