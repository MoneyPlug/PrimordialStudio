import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CircleDot,
  Download,
  Film,
  Camera,
  ChevronUp,
  ChevronDown,
  Box,
} from 'lucide-react';
import type { CreatureSDFParams } from '../sdf/creatureSdf';
import { generateCreatureGeometry } from '../sdf/marchingCubes';
import { exportToOBJ, exportToGLTF, downloadFile } from '../utils/meshExporter';

export interface KeyframeData {
  id: string;
  time: number; // in seconds (0.0 to duration)
  camDistance: number;
  camAngleY: number;
  camAngleX: number;
  uTime: number;
  entropy: number;
  latencyMs: number;
  creatureParams: CreatureSDFParams;
  density: number;
  stress: number;
}

export interface KeyframeTimelineProps {
  creatureParams: CreatureSDFParams;
  currentEntropy: number;
  currentLatency: number;
  onApplyTimelineState?: (state: {
    uTime: number;
    camOrbit?: { rotY: number; rotX: number; dist: number };
    creatureParams?: CreatureSDFParams;
    entropy?: number;
    latencyMs?: number;
  }) => void;
}

export const KeyframeTimeline: React.FC<KeyframeTimelineProps> = ({
  creatureParams,
  currentEntropy,
  currentLatency,
  onApplyTimelineState,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0.0);
  const duration = 10.0; // 10 second cinematic loop
  const [keyframes, setKeyframes] = useState<KeyframeData[]>([
    {
      id: 'kf_0',
      time: 0.0,
      camDistance: 3.8,
      camAngleY: 0.0,
      camAngleX: 0.0,
      uTime: 0.0,
      entropy: currentEntropy,
      latencyMs: currentLatency,
      creatureParams: { ...creatureParams },
      density: 1.0,
      stress: 0.0,
    },
    {
      id: 'kf_5',
      time: 5.0,
      camDistance: 4.5,
      camAngleY: Math.PI,
      camAngleX: 0.3,
      uTime: 5.0,
      entropy: Math.min(1.0, currentEntropy + 0.3),
      latencyMs: currentLatency + 40,
      creatureParams: { ...creatureParams, gyroidFreq: creatureParams.gyroidFreq * 1.4 },
      density: 1.5,
      stress: 0.4,
    },
    {
      id: 'kf_10',
      time: 10.0,
      camDistance: 3.8,
      camAngleY: Math.PI * 2.0,
      camAngleX: 0.0,
      uTime: 10.0,
      entropy: currentEntropy,
      latencyMs: currentLatency,
      creatureParams: { ...creatureParams },
      density: 1.0,
      stress: 0.0,
    },
  ]);

  const animFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  // Linear interpolation between keyframes
  const evaluateTimelineAt = (t: number) => {
    if (keyframes.length === 0) return;
    const sorted = [...keyframes].sort((a, b) => a.time - b.time);

    let prev = sorted[0];
    let next = sorted[sorted.length - 1];

    for (let i = 0; i < sorted.length - 1; i++) {
      if (t >= sorted[i].time && t <= sorted[i + 1].time) {
        prev = sorted[i];
        next = sorted[i + 1];
        break;
      }
    }

    const span = next.time - prev.time || 1;
    const alpha = Math.max(0, Math.min(1, (t - prev.time) / span));

    const interpOrbit = {
      rotY: prev.camAngleY + (next.camAngleY - prev.camAngleY) * alpha,
      rotX: prev.camAngleX + (next.camAngleX - prev.camAngleX) * alpha,
      dist: prev.camDistance + (next.camDistance - prev.camDistance) * alpha,
    };

    const interpEntropy = prev.entropy + (next.entropy - prev.entropy) * alpha;
    const interpLatency = prev.latencyMs + (next.latencyMs - prev.latencyMs) * alpha;

    onApplyTimelineState?.({
      uTime: t,
      camOrbit: interpOrbit,
      entropy: interpEntropy,
      latencyMs: interpLatency,
    });
  };

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTickRef.current = null;
      return;
    }

    const loop = (now: number) => {
      if (!lastTickRef.current) lastTickRef.current = now;
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      setCurrentTime((prev) => {
        let nextTime = prev + dt;
        if (nextTime > duration) {
          nextTime = 0.0;
        }
        evaluateTimelineAt(nextTime);
        return nextTime;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, keyframes]);

  // Scrubbing handler
  const handleScrub = (newTime: number) => {
    setCurrentTime(newTime);
    evaluateTimelineAt(newTime);
  };

  // Add keyframe at current scrub time
  const handleAddKeyframe = () => {
    const newKf: KeyframeData = {
      id: `kf_${Date.now()}`,
      time: Math.round(currentTime * 10) / 10,
      camDistance: 3.8,
      camAngleY: (currentTime / duration) * Math.PI * 2,
      camAngleX: 0.1,
      uTime: currentTime,
      entropy: currentEntropy,
      latencyMs: currentLatency,
      creatureParams: { ...creatureParams },
      density: 1.0,
      stress: 0.1,
    };

    setKeyframes((prev) => [...prev.filter((k) => Math.abs(k.time - newKf.time) > 0.05), newKf]);
  };

  // Export current procedural mesh to OBJ
  const handleExportOBJ = () => {
    const geom = generateCreatureGeometry(creatureParams, 28);
    const objText = exportToOBJ(geom, 'ProceduralRaymarchingCreature');
    downloadFile(`creature_${Date.now()}.obj`, objText, 'text/plain');
  };

  // Export current procedural mesh to glTF
  const handleExportGLTF = () => {
    const geom = generateCreatureGeometry(creatureParams, 28);
    const gltfText = exportToGLTF(geom, 'ProceduralRaymarchingCreature');
    downloadFile(`creature_${Date.now()}.gltf`, gltfText, 'application/json');
  };

  // Export timeline keyframes cinematic sequence metadata
  const handleExportSequence = () => {
    const sequenceData = {
      version: '1.0',
      generator: 'Primordia Studio Timeline Recorder',
      duration,
      exportedAt: new Date().toISOString(),
      keyframes: [...keyframes].sort((a, b) => a.time - b.time),
    };
    downloadFile(
      `cinematic_sequence_${Date.now()}.json`,
      JSON.stringify(sequenceData, null, 2),
      'application/json'
    );
  };

  return (
    <div className="w-full bg-[#0d101a] border-t border-slate-800 flex flex-col text-xs text-slate-300 shrink-0">
      {/* Timeline Bar Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#121624] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Film className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-200">
            Keyframe Timeline & Cinematic Raymarching Recorder
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 text-cyan-300 rounded border border-slate-700">
            {currentTime.toFixed(2)}s / {duration.toFixed(1)}s
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium cursor-pointer transition text-[11px]"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isPlaying ? 'Pause Loop' : 'Play Cinematic'}
          </button>

          {/* Reset */}
          <button
            onClick={() => handleScrub(0.0)}
            className="p-1 text-slate-400 hover:text-white rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
            title="Rewind to start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Record Keyframe */}
          <button
            onClick={handleAddKeyframe}
            className="flex items-center gap-1 px-2 py-1 bg-rose-600/80 hover:bg-rose-500 text-white rounded cursor-pointer transition text-[11px]"
            title="Record Keyframe at current scrub head"
          >
            <CircleDot className="w-3 h-3" /> Keyframe
          </button>

          {/* Procedural Mesh Exporters */}
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <button
            onClick={handleExportOBJ}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 cursor-pointer transition text-[11px]"
            title="Export procedural Marching Cubes mesh as Wavefront OBJ"
          >
            <Box className="w-3 h-3 text-cyan-400" /> OBJ
          </button>

          <button
            onClick={handleExportGLTF}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 cursor-pointer transition text-[11px]"
            title="Export procedural mesh as glTF 2.0"
          >
            <Download className="w-3 h-3 text-purple-400" /> glTF
          </button>

          <button
            onClick={handleExportSequence}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 cursor-pointer transition text-[11px]"
            title="Export cinematic camera & simulation timeline JSON"
          >
            <Download className="w-3 h-3 text-amber-400" /> Loop JSON
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Timeline Scrubber & Keyframe Track */}
      {isExpanded && (
        <div className="p-3 bg-[#0a0d16] space-y-2">
          {/* Main Track with Keyframe Markers */}
          <div className="relative w-full h-8 bg-slate-900 rounded border border-slate-800 flex items-center px-2 select-none">
            {/* Time ticks */}
            <div className="absolute inset-0 flex justify-between pointer-events-none px-2 opacity-25">
              {[0, 2, 4, 6, 8, 10].map((t) => (
                <div key={t} className="flex flex-col items-center">
                  <div className="h-2 w-px bg-slate-400" />
                  <span className="text-[8px] font-mono">{t}s</span>
                </div>
              ))}
            </div>

            {/* Keyframe diamonds */}
            {keyframes.map((kf) => {
              const leftPercent = (kf.time / duration) * 100;
              return (
                <div
                  key={kf.id}
                  style={{ left: `calc(${leftPercent}% - 5px)` }}
                  onClick={() => handleScrub(kf.time)}
                  className="absolute z-10 w-2.5 h-2.5 rotate-45 bg-amber-400 border border-slate-950 hover:scale-125 transition-transform cursor-pointer shadow-md"
                  title={`Keyframe at ${kf.time}s`}
                />
              );
            })}

            {/* Scrubber head input range */}
            <input
              type="range"
              min={0}
              max={duration}
              step={0.05}
              value={currentTime}
              onChange={(e) => handleScrub(parseFloat(e.target.value))}
              className="absolute inset-x-0 w-full opacity-0 h-full cursor-ew-resize z-20"
            />

            {/* Playhead indicator bar */}
            <div
              style={{ left: `${(currentTime / duration) * 100}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-rose-500 shadow-lg pointer-events-none z-15"
            >
              <div className="w-2 h-2 -ml-[3px] bg-rose-500 rotate-45" />
            </div>
          </div>

          {/* Keyframe Track Info */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <div className="flex items-center gap-3">
              <span>Keyframes: <strong className="text-slate-200">{keyframes.length}</strong></span>
              <span>Procedural u_time: <strong className="font-mono text-cyan-300">{currentTime.toFixed(2)}s</strong></span>
              <span>Loop Range: <strong className="font-mono text-slate-300">0.0s - 10.0s</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Camera className="w-3 h-3 text-cyan-400" /> 360° Procedural Orbit & SDF Morphing Loop
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
