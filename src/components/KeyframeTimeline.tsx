import React, { useState, useEffect, useRef } from 'react';
import {
  type OrbitCameraKeyframe,
  DEFAULT_KEYFRAMES,
  interpolateOrbit,
} from '../services/cinematicOrbit';
import { exportToOBJ, exportToGLTF, downloadFile } from '../sdf/meshExporter';
import type { CreatureSDFParams } from '../sdf/creatureSdf';
import { generateCreatureGeometry } from '../sdf/marchingCubes';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Download,
  Film,
  Camera,
  FastForward,
} from 'lucide-react';

interface KeyframeTimelineProps {
  creatureParams: CreatureSDFParams;
  onCameraUpdate?: (orbit: OrbitCameraKeyframe) => void;
  currentCameraOrbit?: Partial<OrbitCameraKeyframe>;
}

export const KeyframeTimeline: React.FC<KeyframeTimelineProps> = ({
  creatureParams,
  onCameraUpdate,
  currentCameraOrbit,
}) => {
  const [keyframes, setKeyframes] = useState<OrbitCameraKeyframe[]>(DEFAULT_KEYFRAMES);
  const [currentTime, setCurrentTime] = useState(0.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [selectedKeyframeIndex, setSelectedKeyframeIndex] = useState<number | null>(0);
  const [isExporting, setIsExporting] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Continuous animation loop when playing
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setCurrentTime((prev) => {
        let next = prev + delta * playbackSpeed;
        if (next >= 10.0) {
          next = 0.0; // Loop 10s cinematic
        }
        return Math.round(next * 100) / 100;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // Interpolate camera orbit and notify parent on currentTime change
  useEffect(() => {
    const orbit = interpolateOrbit(keyframes, currentTime);
    onCameraUpdate?.(orbit);
  }, [currentTime, keyframes]);

  // Scrubbing handler
  const handleTimelineScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const newTime = Math.round((clickX / rect.width) * 10.0 * 100) / 100;
    setCurrentTime(newTime);
  };

  // Add keyframe at current playhead time
  const handleAddKeyframe = () => {
    const existing = keyframes.find((k) => Math.abs(k.time - currentTime) < 0.2);
    if (existing) {
      // update existing
      setKeyframes(
        keyframes.map((k) =>
          k === existing
            ? {
                ...k,
                azimuth: currentCameraOrbit?.azimuth ?? k.azimuth,
                elevation: currentCameraOrbit?.elevation ?? k.elevation,
                distance: currentCameraOrbit?.distance ?? k.distance,
              }
            : k
        )
      );
      return;
    }

    const currentOrbit = interpolateOrbit(keyframes, currentTime);
    const newKeyframe: OrbitCameraKeyframe = {
      time: currentTime,
      azimuth: currentCameraOrbit?.azimuth ?? currentOrbit.azimuth,
      elevation: currentCameraOrbit?.elevation ?? currentOrbit.elevation,
      distance: currentCameraOrbit?.distance ?? currentOrbit.distance,
      target: currentOrbit.target,
      fov: currentOrbit.fov,
      label: `Shot @ ${currentTime.toFixed(1)}s`,
    };

    const nextKeyframes = [...keyframes, newKeyframe].sort((a, b) => a.time - b.time);
    setKeyframes(nextKeyframes);
  };

  const handleDeleteKeyframe = (index: number) => {
    if (keyframes.length <= 1) return;
    setKeyframes(keyframes.filter((_, i) => i !== index));
    setSelectedKeyframeIndex(null);
  };

  // Trigger Native Marching Cubes procedural mesh extraction and export
  const handleExportMesh = (format: 'obj' | 'gltf') => {
    setIsExporting(true);
    try {
      const geometry = generateCreatureGeometry(creatureParams, 28);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      if (format === 'obj') {
        const objData = exportToOBJ(geometry, {
          name: `creature_cinematic_${currentTime.toFixed(1)}s`,
          includeNormals: true,
          includeColors: true,
        });
        downloadFile(objData, `procedural_creature_${timestamp}.obj`, 'text/plain');
      } else {
        const gltfData = exportToGLTF(geometry, {
          name: `creature_cinematic_${currentTime.toFixed(1)}s`,
        });
        downloadFile(gltfData, `procedural_creature_${timestamp}.gltf`, 'application/json');
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const activeInterpolated = interpolateOrbit(keyframes, currentTime);

  return (
    <div className="w-full bg-[#0d1017] border-t border-slate-800 p-2.5 flex flex-col gap-2 select-none text-xs text-slate-200">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-100">
            <Film className="w-4 h-4 text-cyan-400" />
            <span>10s Cinematic Keyframe Recorder</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
            Linear Orbit Interpolation
          </span>

          {/* Current playhead time display */}
          <div className="font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-cyan-400 font-bold">
            {currentTime.toFixed(2)}s / 10.00s
          </div>
        </div>

        {/* Playback & Keyframe Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium cursor-pointer transition"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentTime(0.0);
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
            title="Reset to 0s"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center bg-slate-900 rounded border border-slate-800 px-1.5 py-0.5 gap-1 text-[11px] font-mono text-slate-400">
            <FastForward className="w-3 h-3 text-cyan-400" />
            <button
              onClick={() => setPlaybackSpeed(0.5)}
              className={`px-1 rounded ${playbackSpeed === 0.5 ? 'bg-cyan-900 text-cyan-200' : 'hover:text-slate-200'}`}
            >
              0.5x
            </button>
            <button
              onClick={() => setPlaybackSpeed(1.0)}
              className={`px-1 rounded ${playbackSpeed === 1.0 ? 'bg-cyan-900 text-cyan-200' : 'hover:text-slate-200'}`}
            >
              1x
            </button>
            <button
              onClick={() => setPlaybackSpeed(2.0)}
              className={`px-1 rounded ${playbackSpeed === 2.0 ? 'bg-cyan-900 text-cyan-200' : 'hover:text-slate-200'}`}
            >
              2x
            </button>
          </div>

          <button
            onClick={handleAddKeyframe}
            className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium cursor-pointer transition text-[11px]"
            title="Capture current camera pose at playhead"
          >
            <Plus className="w-3 h-3" /> Keyframe
          </button>

          {/* Native Marching Cubes Exporters */}
          <div className="flex items-center gap-1 ml-2 border-l border-slate-800 pl-2">
            <span className="text-[10px] text-slate-400 mr-1 flex items-center gap-1">
              <Download className="w-3 h-3 text-cyan-400" /> Marching Cubes:
            </span>
            <button
              onClick={() => handleExportMesh('obj')}
              disabled={isExporting}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded cursor-pointer transition text-[11px] font-mono"
            >
              OBJ
            </button>
            <button
              onClick={() => handleExportMesh('gltf')}
              disabled={isExporting}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 rounded cursor-pointer transition text-[11px] font-mono"
            >
              glTF 2.0
            </button>
          </div>
        </div>
      </div>

      {/* 10-Second Scrubbing Track & Keyframe Diamonds */}
      <div
        ref={timelineRef}
        onClick={handleTimelineScrub}
        className="relative h-10 w-full bg-slate-950/80 rounded border border-slate-800 cursor-pointer overflow-hidden flex items-center"
      >
        {/* 1-second interval grid tick lines */}
        {Array.from({ length: 11 }).map((_, idx) => (
          <div
            key={idx}
            style={{ left: `${(idx / 10) * 100}%` }}
            className="absolute top-0 bottom-0 w-px bg-slate-800/80 pointer-events-none"
          >
            <span className="absolute top-1 left-1 text-[9px] font-mono text-slate-600">
              {idx}s
            </span>
          </div>
        ))}

        {/* Interpolated Orbit Trail representation */}
        <div
          style={{ width: `${(currentTime / 10.0) * 100}%` }}
          className="absolute top-0 bottom-0 bg-cyan-500/10 border-r-2 border-cyan-400 pointer-events-none"
        />

        {/* Keyframe Markers */}
        {keyframes.map((kf, idx) => {
          const leftPercent = (kf.time / 10.0) * 100;
          const isSelected = selectedKeyframeIndex === idx;
          return (
            <div
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedKeyframeIndex(idx);
                setCurrentTime(kf.time);
              }}
              style={{ left: `${leftPercent}%` }}
              className={`absolute -translate-x-1/2 z-10 w-3.5 h-3.5 rotate-45 rounded-xs cursor-pointer transition shadow-md ${
                isSelected
                  ? 'bg-amber-400 ring-2 ring-amber-300 border border-white'
                  : 'bg-indigo-500 hover:bg-indigo-400 border border-indigo-300'
              }`}
              title={`${kf.label || 'Keyframe'} @ ${kf.time}s`}
            />
          );
        })}

        {/* Playhead Indicator */}
        <div
          style={{ left: `${(currentTime / 10.0) * 100}%` }}
          className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-20 pointer-events-none shadow-lg shadow-cyan-400/50"
        >
          <div className="w-2.5 h-2.5 -translate-x-1 -translate-y-0.5 bg-cyan-400 rounded-full" />
        </div>
      </div>

      {/* Orbit Interpolation Telemetry Bar */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-slate-800/80">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-300">
            <Camera className="w-3 h-3 text-cyan-400" /> Orbit Coordinates:
          </span>
          <span>Azimuth: <span className="text-cyan-300">{(activeInterpolated.azimuth).toFixed(2)} rad</span></span>
          <span>Elevation: <span className="text-cyan-300">{(activeInterpolated.elevation).toFixed(2)} rad</span></span>
          <span>Distance: <span className="text-cyan-300">{(activeInterpolated.distance).toFixed(2)}</span></span>
          <span>Target: <span className="text-slate-300">[{activeInterpolated.target.map((v) => v.toFixed(1)).join(', ')}]</span></span>
        </div>

        {selectedKeyframeIndex !== null && keyframes[selectedKeyframeIndex] && (
          <div className="flex items-center gap-2">
            <span className="text-amber-400">
              Selected: {keyframes[selectedKeyframeIndex].label || `Shot ${selectedKeyframeIndex + 1}`}
            </span>
            <button
              onClick={() => handleDeleteKeyframe(selectedKeyframeIndex)}
              className="text-slate-400 hover:text-rose-400 cursor-pointer p-0.5"
              title="Delete selected keyframe"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
