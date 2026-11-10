import React, { useState, useEffect, useRef } from 'react';
import { OllamaInferenceBridge, type ModelInferenceMetrics } from './services/ollamaBridge';
import { mapMetricsToCreatureSDF, type CreatureSDFParams } from './sdf/creatureSdf';
import { WebXRTelemetryManager, type WebXRTelemetryFrame } from './xr/webxrTelemetry';
import { HRTFSpatialAudioEngine } from './audio/hrtfSpatialAudio';
import { type ShaderGraph, DEFAULT_NODES, DEFAULT_CONNECTIONS } from './nodes/nodeTypes';
import { graphToGlsl, glslToGraph } from './compiler/glslTranspiler';
import { VisualNodeGraph } from './components/VisualNodeGraph';
import { MonacoGlslEditor } from './components/MonacoGlslEditor';
import { RaymarchingViewport } from './components/RaymarchingViewport';
import { MultiModelInspector } from './components/MultiModelInspector';
import { KeyframeTimeline } from './components/KeyframeTimeline';
import { PresetLibrarySidebar } from './components/PresetLibrarySidebar';
import { applySdfOffsets, type DualModelComparativeOffset } from './services/multiModelTelemetry';
import type { OrbitCameraKeyframe } from './services/cinematicOrbit';
import type { ArchetypePreset } from './nodes/archetypePresets';
import {
  Sparkles,
  Radio,
  Headphones,
  Sliders,
  Code2,
  Share2,
  Play,
  RefreshCw,
  Eye,
  Activity,
  Layers,
  Boxes,
  ArrowRightLeft,
} from 'lucide-react';

export const App: React.FC = () => {
  // Navigation / Layout state
  const [activeTab, setActiveTab] = useState<'graph' | 'monaco' | 'split'>('split');
  const [rightPanelTab, setRightPanelTab] = useState<'telemetry' | 'multimodel' | 'presets'>('multimodel');
  const [showMeshOverlay, setShowMeshOverlay] = useState(false);

  // Model & Creature Telemetry State
  const [prompt, setPrompt] = useState('Bioluminescent abyssal creature with fractal gyroid skeletal morphology');
  const [isInferring, setIsInferring] = useState(false);
  const [metrics, setMetrics] = useState<ModelInferenceMetrics>({
    prompt: '',
    tokenCount: 0,
    tokensPerSecond: 0,
    latencyMs: 85,
    entropy: 0.35,
    weightsDistribution: [0.4, 0.7, 0.3, 0.8, 0.5, 0.35, 0.65, 0.75],
    timestamp: Date.now(),
    status: 'idle',
    rawOutput: '',
  });

  const [dualOffsets, setDualOffsets] = useState<DualModelComparativeOffset | null>(null);
  const [applyOffsetsEnabled, setApplyOffsetsEnabled] = useState(true);

  const [creatureParams, setCreatureParams] = useState<CreatureSDFParams>(() => {
    return mapMetricsToCreatureSDF(metrics);
  });

  // Camera Orbit State driven by 10s Timeline
  const [cameraOrbit, setCameraOrbit] = useState<OrbitCameraKeyframe | undefined>(undefined);

  // WebXR & Spatial Audio State
  const [xrTelemetry, setXrTelemetry] = useState<WebXRTelemetryFrame | null>(null);
  const [audioActive, setAudioActive] = useState(false);
  const [udpStats, setUdpStats] = useState({ target: '127.0.0.1:8000', packetsSent: 0 });

  // Shader & Node Graph State
  const [shaderGraph, setShaderGraph] = useState<ShaderGraph>({
    nodes: DEFAULT_NODES,
    connections: DEFAULT_CONNECTIONS,
  });
  const [glslCode, setGlslCode] = useState<string>(() => graphToGlsl(shaderGraph));
  const [shaderError, setShaderError] = useState<string | null>(null);

  // Core Service Singletons / Refs
  const ollamaRef = useRef<OllamaInferenceBridge | null>(null);
  const telemetryRef = useRef<WebXRTelemetryManager | null>(null);
  const audioEngineRef = useRef<HRTFSpatialAudioEngine | null>(null);

  useEffect(() => {
    ollamaRef.current = new OllamaInferenceBridge();
    telemetryRef.current = new WebXRTelemetryManager();
    audioEngineRef.current = new HRTFSpatialAudioEngine();

    // Start WebXR telemetry simulation & bind frame updates
    telemetryRef.current.startSimulation();
    const unsubscribeXR = telemetryRef.current.onFrame((frame) => {
      setXrTelemetry(frame);

      // Update HRTF listener pose from WebXR head pose
      if (audioEngineRef.current) {
        audioEngineRef.current.updateListenerPose(frame.head.position);
      }

      setUdpStats((prev) => ({
        ...prev,
        packetsSent: prev.packetsSent + 1,
      }));
    });

    return () => {
      unsubscribeXR();
      ollamaRef.current?.abort();
      telemetryRef.current?.stopSession();
      audioEngineRef.current?.stopSound();
    };
  }, []);

  // Update creature SDF & Spatial Audio on metrics change or dual model offsets change
  useEffect(() => {
    let baseParams = mapMetricsToCreatureSDF(metrics);
    if (dualOffsets && applyOffsetsEnabled) {
      baseParams = applySdfOffsets(baseParams, dualOffsets);
    }
    setCreatureParams(baseParams);
    if (audioEngineRef.current) {
      audioEngineRef.current.syncWithCreatureState(baseParams);
    }
  }, [metrics, dualOffsets, applyOffsetsEnabled]);

  // Handle Graph change -> Recompile to GLSL
  const handleGraphChange = (newGraph: ShaderGraph) => {
    setShaderGraph(newGraph);
    const newGlsl = graphToGlsl(newGraph);
    setGlslCode(newGlsl);
  };

  // Handle Monaco GLSL change -> Parse to Graph
  const handleMonacoCompile = () => {
    try {
      const parsedGraph = glslToGraph(glslCode);
      setShaderGraph(parsedGraph);
      setShaderError(null);
    } catch (err: any) {
      setShaderError(err.message || 'GLSL Parse Error');
    }
  };

  // Handle Preset Selection
  const handleApplyPreset = (preset: ArchetypePreset) => {
    setShaderGraph(preset.graph);
    const code = preset.glsl || graphToGlsl(preset.graph);
    setGlslCode(code);
  };

  // Trigger Ollama / Simulated Inference
  const handleTriggerInference = async () => {
    if (!ollamaRef.current) return;
    setIsInferring(true);

    await ollamaRef.current.generateStream(prompt, {
      onToken: (_token, newMetrics) => {
        setMetrics(newMetrics);
      },
      onComplete: (finalMetrics) => {
        setMetrics(finalMetrics);
        setIsInferring(false);
      },
      onError: () => {
        setIsInferring(false);
      },
    });
  };

  // Toggle HRTF Audio
  const toggleAudio = async () => {
    if (!audioEngineRef.current) return;
    if (!audioActive) {
      await audioEngineRef.current.initialize();
      audioEngineRef.current.startSound();
      setAudioActive(true);
    } else {
      audioEngineRef.current.stopSound();
      setAudioActive(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-screen bg-[#090b10] text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Application Header */}
      <header className="h-14 border-b border-slate-800 bg-[#0e121a] px-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide flex items-center gap-2 m-0 p-0">
              Procedural Creature Raymarching Studio
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                WebXR + UE5 Bridge
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 m-0">
              Ollama Weights • GLSL Monaco Node Graph • 3D HRTF Spatial Audio
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-[#151924] p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('split')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded cursor-pointer transition ${
              activeTab === 'split' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Split Studio
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded cursor-pointer transition ${
              activeTab === 'graph' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Node Graph
          </button>
          <button
            onClick={() => setActiveTab('monaco')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded cursor-pointer transition ${
              activeTab === 'monaco' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" /> Monaco IDE
          </button>
        </div>

        {/* Right Suite Selector */}
        <div className="flex items-center bg-[#151924] p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setRightPanelTab('multimodel')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded cursor-pointer transition ${
              rightPanelTab === 'multimodel' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> Dual Telemetry
          </button>
          <button
            onClick={() => setRightPanelTab('presets')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded cursor-pointer transition ${
              rightPanelTab === 'presets' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" /> Presets
          </button>
          <button
            onClick={() => setRightPanelTab('telemetry')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded cursor-pointer transition ${
              rightPanelTab === 'telemetry' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> WebXR/Bridge
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMeshOverlay(!showMeshOverlay)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition cursor-pointer ${
              showMeshOverlay
                ? 'bg-purple-950 border-purple-600 text-purple-200'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Mesh Overlay
          </button>

          <button
            onClick={toggleAudio}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition cursor-pointer ${
              audioActive
                ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" /> {audioActive ? 'HRTF Audio Active' : 'Start Spatial Audio'}
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Editors (Node Graph / Monaco IDE) */}
        <div
          className={`flex-1 flex flex-col border-r border-slate-800 p-2 overflow-hidden ${
            activeTab === 'split' ? 'w-1/2' : activeTab === 'graph' || activeTab === 'monaco' ? 'w-full' : 'hidden'
          }`}
        >
          {activeTab === 'graph' && (
            <VisualNodeGraph graph={shaderGraph} onChange={handleGraphChange} />
          )}

          {activeTab === 'monaco' && (
            <MonacoGlslEditor
              code={glslCode}
              onChange={(val) => setGlslCode(val)}
              onCompile={handleMonacoCompile}
              error={shaderError}
            />
          )}

          {activeTab === 'split' && (
            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
              <div className="h-1/2 overflow-hidden">
                <VisualNodeGraph graph={shaderGraph} onChange={handleGraphChange} />
              </div>
              <div className="h-1/2 overflow-hidden">
                <MonacoGlslEditor
                  code={glslCode}
                  onChange={(val) => setGlslCode(val)}
                  onCompile={handleMonacoCompile}
                  error={shaderError}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Live Raymarching Viewport & Telemetry Telemetry Suite */}
        <div className="w-[520px] shrink-0 flex flex-col p-2 gap-2 bg-[#0c0e15] overflow-y-auto">
          {/* 3D Raymarching Quad Viewport */}
          <div className="h-64 w-full shrink-0">
            <RaymarchingViewport
              glslCode={glslCode}
              creatureParams={creatureParams}
              creaturePosition={{ x: 0, y: 1.5, z: -2.0 }}
              entropy={metrics.entropy}
              latencyMs={metrics.latencyMs}
              showMeshOverlay={showMeshOverlay}
              cameraOrbit={cameraOrbit}
              onError={setShaderError}
            />
          </div>

          {/* Right Modular Panel Switcher Body */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {rightPanelTab === 'multimodel' && (
              <MultiModelInspector
                onOffsetsChange={(offsets, enabled) => {
                  setDualOffsets(offsets);
                  setApplyOffsetsEnabled(enabled);
                }}
                onModelSelect={(_slot, m) => {
                  setMetrics(m);
                }}
              />
            )}

            {rightPanelTab === 'presets' && (
              <PresetLibrarySidebar
                currentGraph={shaderGraph}
                onApplyPreset={handleApplyPreset}
                onApplyGlsl={(glsl, parsed) => {
                  setGlslCode(glsl);
                  setShaderGraph(parsed);
                }}
              />
            )}

            {rightPanelTab === 'telemetry' && (
              <div className="flex flex-col gap-2 overflow-y-auto">
                {/* Ollama / Model Inference Node Bridge Panel */}
                <div className="bg-[#141723] rounded-lg border border-slate-800 p-3 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" /> Ollama / llama.cpp Node Bridge
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      {metrics.tokensPerSecond} tok/s | {metrics.latencyMs}ms
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Inference prompt..."
                      className="flex-1 bg-[#1a1f30] border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={handleTriggerInference}
                      disabled={isInferring}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded font-medium flex items-center gap-1 cursor-pointer transition"
                    >
                      {isInferring ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      Infer
                    </button>
                  </div>

                  {/* Weights Distribution Bar Visualization */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Latent Weights Distribution (SDF Morphogen)</span>
                      <span>Entropy: {metrics.entropy.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-8 gap-1 h-8 bg-slate-900/60 p-1 rounded border border-slate-800">
                      {metrics.weightsDistribution.map((w, idx) => (
                        <div key={idx} className="flex flex-col justify-end h-full">
                          <div
                            style={{ height: `${Math.round(w * 100)}%` }}
                            className="bg-cyan-500 rounded-xs transition-all duration-150"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SDF Parameter Indicators */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                    <div className="bg-slate-900/40 p-1.5 rounded border border-slate-800/80">
                      <span className="text-slate-400 block text-[10px]">Gyroid Freq</span>
                      <span className="text-cyan-300 font-mono">{creatureParams.gyroidFreq}</span>
                    </div>
                    <div className="bg-slate-900/40 p-1.5 rounded border border-slate-800/80">
                      <span className="text-slate-400 block text-[10px]">Tentacles</span>
                      <span className="text-purple-300 font-mono">{creatureParams.tentacleCount}</span>
                    </div>
                    <div className="bg-slate-900/40 p-1.5 rounded border border-slate-800/80">
                      <span className="text-slate-400 block text-[10px]">Smooth min (smin)</span>
                      <span className="text-amber-300 font-mono">{creatureParams.smoothBlend}</span>
                    </div>
                  </div>
                </div>

                {/* WebXR Telemetry & UE5 UDP Streamer Panel */}
                <div className="bg-[#141723] rounded-lg border border-slate-800 p-3 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" /> WebXR Telemetry & UE5 UDP Stream
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {xrTelemetry?.sessionState.toUpperCase() || 'SIMULATED'}
                    </span>
                  </div>

                  {xrTelemetry && (
                    <div className="space-y-2 text-[11px]">
                      {/* Head 6DoF Pose */}
                      <div className="bg-slate-900/50 p-2 rounded border border-slate-800/80 font-mono">
                        <div className="text-slate-400 text-[10px] mb-1">Head Pose (Position & Euler)</div>
                        <div className="flex justify-between text-slate-300">
                          <span>Pos: [{xrTelemetry.head.position.x}, {xrTelemetry.head.position.y}, {xrTelemetry.head.position.z}]</span>
                          <span className="text-cyan-400">Rot: [{xrTelemetry.head.rotation.x}, {xrTelemetry.head.rotation.y}]</span>
                        </div>
                      </div>

                      {/* Hand Controllers */}
                      <div className="grid grid-cols-2 gap-2 font-mono">
                        <div className="bg-slate-900/50 p-2 rounded border border-slate-800/80">
                          <span className="text-slate-400 text-[10px] block">Left Hand 6DoF</span>
                          <span className="text-slate-300">Trigger: {Math.round(xrTelemetry.leftHand.trigger * 100)}%</span>
                        </div>
                        <div className="bg-slate-900/50 p-2 rounded border border-slate-800/80">
                          <span className="text-slate-400 text-[10px] block">Right Hand 6DoF</span>
                          <span className="text-slate-300">Trigger: {Math.round(xrTelemetry.rightHand.trigger * 100)}%</span>
                        </div>
                      </div>

                      {/* Unreal Engine 5 Live Stream Status */}
                      <div className="flex items-center justify-between bg-slate-950/70 p-2 rounded border border-slate-800/80">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Share2 className="w-3 h-3 text-cyan-400" />
                          <span>UE5 OSC UDP Packet Feed:</span>
                        </div>
                        <span className="text-cyan-300 font-mono text-[10px]">{udpStats.packetsSent} pkts &rarr; {udpStats.target}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: 10-Second Cinematic Keyframe Timeline */}
      <KeyframeTimeline
        creatureParams={creatureParams}
        onCameraUpdate={(orbit) => setCameraOrbit(orbit)}
      />
    </div>
  );
};

export default App;
