import React, { useState, useEffect, useRef } from 'react';
import { type ModelInferenceMetrics } from './services/ollamaBridge';
import { MultiModelInspector, type ModelComparisonState } from './services/multiModelInspector';
import { PredatorSwarmSimulation, type CreatureCoordinateTuple } from './simulation/predatorSwarm';
import { mapMetricsToCreatureSDF, type CreatureSDFParams } from './sdf/creatureSdf';
import { WebXRTelemetryManager, type WebXRTelemetryFrame } from './xr/webxrTelemetry';
import { HRTFSpatialAudioEngine } from './audio/hrtfSpatialAudio';
import { type ShaderGraph, DEFAULT_NODES, DEFAULT_CONNECTIONS } from './nodes/nodeTypes';
import { graphToGlsl, glslToGraph } from './compiler/glslTranspiler';
import { VisualNodeGraph } from './components/VisualNodeGraph';
import { MonacoGlslEditor } from './components/MonacoGlslEditor';
import { RaymarchingViewport } from './components/RaymarchingViewport';
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
  AlertTriangle,
  Shield,
  Zap,
} from 'lucide-react';

export const App: React.FC = () => {
  // Navigation / Layout state
  const [activeTab, setActiveTab] = useState<'graph' | 'monaco' | 'split'>('split');
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

  // MultiModelInspector State
  const [comparisonState, setComparisonState] = useState<ModelComparisonState | null>(null);

  // Predator-Prey Swarm State
  const [streamedCreatures, setStreamedCreatures] = useState<CreatureCoordinateTuple[]>([]);
  const [simulationTick, setSimulationTick] = useState(0);

  const [creatureParams, setCreatureParams] = useState<CreatureSDFParams>(() =>
    mapMetricsToCreatureSDF(metrics)
  );

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
  const multiModelRef = useRef<MultiModelInspector | null>(null);
  const swarmRef = useRef<PredatorSwarmSimulation | null>(null);
  const telemetryRef = useRef<WebXRTelemetryManager | null>(null);
  const audioEngineRef = useRef<HRTFSpatialAudioEngine | null>(null);

  useEffect(() => {
    multiModelRef.current = new MultiModelInspector();
    swarmRef.current = new PredatorSwarmSimulation();
    telemetryRef.current = new WebXRTelemetryManager();
    audioEngineRef.current = new HRTFSpatialAudioEngine();

    // Subscribe to MultiModelInspector changes
    const unsubMulti = multiModelRef.current.subscribe((state) => {
      setComparisonState({ ...state });
    });

    // Wire Awakening event to Swarm Simulation
    multiModelRef.current.setEventListeners({
      onMacroPredatorAwakening: (event) => {
        swarmRef.current?.triggerApexCrisis(event.duration);
      },
      onEcologicalEraChange: (era) => {
        if (era === 'stable_era') {
          swarmRef.current?.endApexCrisis();
        }
      },
    });

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

    // Swarm Simulation behavior loop (60Hz / 16ms)
    let lastTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (swarmRef.current && multiModelRef.current) {
        const cState = multiModelRef.current.getState();
        multiModelRef.current.tickCountdown(dt);

        const currentEntropy = cState.comparativeEntropy;
        const stress = cState.isCrisisActive ? 1.0 : currentEntropy * 0.5;

        swarmRef.current.update(dt, currentEntropy, stress);
        const coords = swarmRef.current.getCreatureCoordinates();
        setStreamedCreatures(coords);
        setSimulationTick((t) => t + 1);

        // Update spatial audio position to track primary predator
        const preds = swarmRef.current.getPredators();
        if (preds.length > 0 && audioEngineRef.current) {
          audioEngineRef.current.updateEmitterPosition(preds[0].position);
        }
      }
    }, 16);

    return () => {
      clearInterval(interval);
      unsubscribeXR();
      unsubMulti();
      multiModelRef.current?.dispose();
      telemetryRef.current?.stopSession();
      audioEngineRef.current?.stopSound();
    };
  }, []);

  // Update creature SDF & Spatial Audio on metrics change
  useEffect(() => {
    const params = mapMetricsToCreatureSDF(metrics);
    // If during Apex Crisis, flare bioluminescence and crimson hue
    if (comparisonState?.isCrisisActive) {
      params.bodyRadius = Math.max(params.bodyRadius, 1.2);
      params.tentacleCount = Math.max(params.tentacleCount, 10);
      params.glowColor = [1.0, 0.08, 0.05];
      params.bioluminescence = 1.0;
    }
    setCreatureParams(params);
    if (audioEngineRef.current) {
      audioEngineRef.current.syncWithCreatureState(params);
    }
  }, [metrics, comparisonState?.isCrisisActive]);

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

  // Trigger Primary Model Streaming Inference
  const handleTriggerInference = async () => {
    const bridge = multiModelRef.current?.getPrimaryBridge();
    if (!bridge) return;
    setIsInferring(true);

    await bridge.generateStream(prompt, {
      onToken: (_token, newMetrics) => {
        setMetrics(newMetrics);
        multiModelRef.current?.updatePrimaryMetrics(newMetrics);
      },
      onComplete: (finalMetrics) => {
        setMetrics(finalMetrics);
        multiModelRef.current?.updatePrimaryMetrics(finalMetrics);
        setIsInferring(false);
      },
      onError: () => {
        setIsInferring(false);
      },
    });
  };

  // Trigger Macro-Predator Awakening Event (Apex Crisis)
  const handleTriggerCrisis = () => {
    multiModelRef.current?.triggerMacroPredatorAwakening(10);
    swarmRef.current?.triggerApexCrisis(10);
  };

  // Reset to Stable Era
  const handleResetStable = () => {
    multiModelRef.current?.resetToStableEra();
    swarmRef.current?.endApexCrisis();
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

  const isCrisis = comparisonState?.isCrisisActive ?? false;
  const countdown = comparisonState?.crisisCountdown ?? 0;
  const predators = swarmRef.current?.getPredators() ?? [];
  const civilians = swarmRef.current?.getCivilians() ?? [];
  const structures = swarmRef.current?.getStructures() ?? [];

  return (
    <div className="flex flex-col w-full h-screen bg-[#090b10] text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Application Header */}
      <header className={`h-14 border-b px-4 flex items-center justify-between z-10 shrink-0 transition-colors ${
        isCrisis ? 'bg-[#220b0b] border-red-900/60' : 'bg-[#0e121a] border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg text-white shadow-lg transition-all ${
            isCrisis
              ? 'bg-gradient-to-tr from-red-600 to-amber-600 shadow-red-500/30 animate-pulse'
              : 'bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-cyan-500/20'
          }`}>
            {isCrisis ? <AlertTriangle className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide flex items-center gap-2 m-0 p-0">
              Procedural Creature Raymarching Studio
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                isCrisis
                  ? 'bg-red-950 text-red-300 border-red-800 animate-pulse'
                  : 'bg-cyan-950 text-cyan-300 border-cyan-800'
              }`}>
                {isCrisis ? `APEX CRISIS AWAKENING (${countdown.toFixed(1)}s)` : 'STABLE ERA • BOIDS SWARM'}
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 m-0">
              Multi-Model Entropy Feed • Boids-Based Predator-Prey Swarm • Mobile Actor Entities
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-[#151924] p-1 rounded-lg border border-slate-800 text-xs">
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
          <button
            onClick={() => setActiveTab('split')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded cursor-pointer transition ${
              activeTab === 'split' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Split Studio
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isCrisis ? (
            <button
              onClick={handleResetStable}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-emerald-600 bg-emerald-950 text-emerald-300 hover:bg-emerald-900 cursor-pointer transition"
            >
              <Shield className="w-3.5 h-3.5" /> Restore Stable Era
            </button>
          ) : (
            <button
              onClick={handleTriggerCrisis}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-red-600 bg-red-950 text-red-300 hover:bg-red-900 cursor-pointer transition"
            >
              <Zap className="w-3.5 h-3.5 text-red-400" /> Trigger Apex Awakening (10s)
            </button>
          )}

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
        <div className="w-[540px] shrink-0 flex flex-col p-2 gap-2 bg-[#0c0e15] overflow-y-auto">
          {/* 3D Raymarching Quad Viewport with Mobile Actor Entities */}
          <div className="h-72 w-full shrink-0">
            <RaymarchingViewport
              glslCode={glslCode}
              creatureParams={creatureParams}
              creaturePosition={{ x: 0, y: 1.5, z: -2.0 }}
              entropy={comparisonState?.comparativeEntropy ?? metrics.entropy}
              latencyMs={comparisonState?.averageLatencyMs ?? metrics.latencyMs}
              showMeshOverlay={showMeshOverlay}
              isCrisis={isCrisis}
              predatorActors={predators}
              civilianAgents={civilians}
              structures={structures}
              onError={setShaderError}
            />
          </div>

          {/* MultiModelInspector & Comparative Telemetry Feed */}
          <div className={`rounded-lg border p-3 space-y-2 text-xs transition-colors ${
            isCrisis ? 'bg-[#1e1114] border-red-800/80' : 'bg-[#141723] border-slate-800'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Radio className={`w-3.5 h-3.5 ${isCrisis ? 'text-red-400' : 'text-cyan-400'}`} />
                MultiModelInspector: Dual-Model Entropy Feed
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                isCrisis ? 'bg-red-950 text-red-300 border-red-700' : 'bg-slate-900 text-cyan-300 border-slate-700'
              }`}>
                {isCrisis ? `CRISIS: ${countdown.toFixed(1)}s` : 'ERA: STABLE'}
              </span>
            </div>

            {/* Model A vs Model B Comparative Card */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                <div className="flex justify-between text-slate-400 text-[10px] mb-1">
                  <span className="font-semibold text-cyan-300">Model A (llama3)</span>
                  <span>{metrics.tokensPerSecond} tok/s</span>
                </div>
                <div className="flex justify-between text-slate-300 font-mono">
                  <span>Entropy: {metrics.entropy.toFixed(2)}</span>
                  <span>{metrics.latencyMs}ms</span>
                </div>
              </div>

              <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                <div className="flex justify-between text-slate-400 text-[10px] mb-1">
                  <span className="font-semibold text-purple-300">Model B (mistral)</span>
                  <span>{comparisonState?.secondaryMetrics.tokensPerSecond ?? 28} tok/s</span>
                </div>
                <div className="flex justify-between text-slate-300 font-mono">
                  <span>Entropy: {comparisonState?.secondaryMetrics.entropy.toFixed(2) ?? '0.28'}</span>
                  <span>{comparisonState?.secondaryMetrics.latencyMs ?? 95}ms</span>
                </div>
              </div>
            </div>

            {/* Combined Metrics Bar */}
            <div className="flex items-center justify-between text-[11px] bg-slate-950/70 p-2 rounded border border-slate-800/80">
              <span>Comparative Cross-Entropy:</span>
              <span className={`font-mono font-bold ${
                (comparisonState?.comparativeEntropy ?? 0) > 0.6 ? 'text-red-400' : 'text-amber-400'
              }`}>
                {comparisonState?.comparativeEntropy.toFixed(2) ?? '0.30'}
                <span className="text-slate-500 font-normal ml-1">
                  (Div: {comparisonState?.entropyDivergence.toFixed(2) ?? '0.04'})
                </span>
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
          </div>

          {/* Boids Predator-Prey Swarm & Mobile Actor Entities Stream */}
          <div className="bg-[#141723] rounded-lg border border-slate-800 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" /> Boids Swarm & Mobile Actor Buffer
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                {civilians.length} Civilians • {predators.length} Predators
              </span>
            </div>

            {/* Streamed Creature Coordinates Feed */}
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 font-mono">
                Creature Buffer Array: [x, y, z, state, hunger] (Tick #{simulationTick})
              </div>
              <div className="bg-slate-950/70 p-2 rounded border border-slate-800/80 font-mono text-[10px] space-y-1">
                {streamedCreatures.map((c, idx) => (
                  <div key={idx} className="flex justify-between items-center text-slate-300">
                    <span className="text-cyan-400 font-bold">Actor #{idx + 1}:</span>
                    <span>[{c[0]}, {c[1]}, {c[2]}]</span>
                    <span className={c[3] >= 2 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                      {c[3] === 0 ? 'DORMANT' : c[3] === 1 ? 'DOCILE' : c[3] === 2 ? 'HUNTING' : 'ATTACKING'}
                    </span>
                    <span className="text-amber-300">H: {Math.round(c[4] * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Territorial Structures Status */}
            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              {structures.map((s) => (
                <div key={s.id} className="bg-slate-900/50 p-1.5 rounded border border-slate-800/80">
                  <span className="text-slate-400 block truncate">{s.type}</span>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-emerald-400 font-mono">{Math.round(s.health)}% HP</span>
                    <span className="text-slate-500">r={s.radius}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WebXR Telemetry & UE5 UDP Streamer Panel */}
          <div className="bg-[#141723] rounded-lg border border-slate-800 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" /> WebXR Telemetry & UE5 UDP Stream
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {xrTelemetry?.sessionState.toUpperCase() || 'SIMULATED'}
              </span>
            </div>

            {xrTelemetry && (
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between text-slate-300 bg-slate-900/50 p-1.5 rounded border border-slate-800/80">
                  <span>Pos: [{xrTelemetry.head.position.x}, {xrTelemetry.head.position.y}, {xrTelemetry.head.position.z}]</span>
                  <span className="text-cyan-400">Rot: [{xrTelemetry.head.rotation.x}, {xrTelemetry.head.rotation.y}]</span>
                </div>
                <div className="flex items-center justify-between bg-slate-950/70 p-1.5 rounded border border-slate-800/80">
                  <div className="flex items-center gap-1 text-slate-300 text-[10px]">
                    <Share2 className="w-3 h-3 text-cyan-400" />
                    <span>UE5 OSC UDP Packet Feed:</span>
                  </div>
                  <span className="text-cyan-300 text-[10px]">{udpStats.packetsSent} pkts &rarr; {udpStats.target}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
