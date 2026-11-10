import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CreatureSDFParams } from '../sdf/creatureSdf';
import { generateCreatureGeometry } from '../sdf/marchingCubes';
import type { Vector3D } from '../xr/webxrTelemetry';
import { StudioTelemetryBinder } from '../services/studioTelemetryBinder';

interface RaymarchingViewportProps {
  glslCode: string;
  creatureParams: CreatureSDFParams;
  creaturePosition: Vector3D;
  entropy: number;
  latencyMs: number;
  showMeshOverlay?: boolean;
  timelineOverrideTime?: number | null;
  camOrbitOverride?: { rotY: number; rotX: number; dist: number } | null;
  onError?: (err: string | null) => void;
}

export const RaymarchingViewport: React.FC<RaymarchingViewportProps> = ({
  glslCode,
  creatureParams,
  creaturePosition,
  entropy,
  latencyMs,
  showMeshOverlay = true,
  timelineOverrideTime = null,
  camOrbitOverride = null,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const creatureMeshRef = useRef<THREE.Mesh | null>(null);
  const binderRef = useRef<StudioTelemetryBinder | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const timelineOverrideRef = useRef<number | null>(timelineOverrideTime);
  const camOrbitOverrideRef = useRef<{ rotY: number; rotX: number; dist: number } | null>(camOrbitOverride);
  const [fps, setFps] = useState(60);

  timelineOverrideRef.current = timelineOverrideTime;
  camOrbitOverrideRef.current = camOrbitOverride;

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    cameraRef.current = camera;

    const quadGeom = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_time: { value: 0 },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_entropy: { value: entropy },
      u_latency: { value: latencyMs / 1000 },
      u_glowColor: { value: new THREE.Vector3(...creatureParams.glowColor) },
      u_creatureBlend: { value: creatureParams.smoothBlend },
      // Simulation / Atlas Earth telemetry uniforms
      u_density: { value: 1.0 },
      u_stress: { value: 0.0 },
      u_center: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
    };

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    let material: THREE.ShaderMaterial;
    try {
      material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: glslCode,
        uniforms,
        depthWrite: false,
        depthTest: false,
      });
      onError?.(null);
    } catch (e: any) {
      console.error(e);
      onError?.(e.message);
      return;
    }

    materialRef.current = material;
    const mesh = new THREE.Mesh(quadGeom, material);
    meshRef.current = mesh;
    scene.add(mesh);

    // Initialize Studio Telemetry WebSocket Binder
    binderRef.current = new StudioTelemetryBinder(material);

    const creatureGeom = generateCreatureGeometry(creatureParams, 18);
    const creatureMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(...creatureParams.glowColor),
      wireframe: true,
      roughness: creatureParams.roughness,
      metalness: 0.8,
    });
    const cMesh = new THREE.Mesh(creatureGeom, creatureMat);
    cMesh.visible = showMeshOverlay;
    cMesh.position.set(creaturePosition.x, creaturePosition.y - 1.5, creaturePosition.z);
    creatureMeshRef.current = cMesh;
    scene.add(cMesh);

    let animationId: number;
    let frameCount = 0;
    let fpsTimer = performance.now();

    const animate = (time: number) => {
      animationId = requestAnimationFrame(animate);

      if (materialRef.current) {
        // If keyframe timeline is driving time, use timeline time, else live performance time
        const effectiveTime =
          timelineOverrideRef.current !== null
            ? timelineOverrideRef.current
            : time * 0.001;

        materialRef.current.uniforms.u_time.value = effectiveTime;

        if (camOrbitOverrideRef.current) {
          const orbit = camOrbitOverrideRef.current;
          materialRef.current.uniforms.u_mouse.value.set(
            orbit.rotY / (Math.PI * 2),
            orbit.rotX / 1.5 + 0.5
          );
        } else {
          materialRef.current.uniforms.u_mouse.value.set(mouseRef.current.x, mouseRef.current.y);
        }
      }

      if (creatureMeshRef.current) {
        creatureMeshRef.current.rotation.y += 0.01;
      }

      renderer.render(scene, camera);

      frameCount++;
      if (performance.now() - fpsTimer >= 500) {
        setFps(Math.round((frameCount * 1000) / (performance.now() - fpsTimer)));
        frameCount = 0;
        fpsTimer = performance.now();
      }
    };

    animationId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      if (materialRef.current) {
        materialRef.current.uniforms.u_resolution.value.set(w, h);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      binderRef.current?.dispose();
      renderer.dispose();
      quadGeom.dispose();
    };
  }, []);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.u_entropy.value = entropy;
    materialRef.current.uniforms.u_latency.value = latencyMs / 1000;
    materialRef.current.uniforms.u_glowColor.value.set(...creatureParams.glowColor);
    materialRef.current.uniforms.u_creatureBlend.value = creatureParams.smoothBlend;
  }, [entropy, latencyMs, creatureParams]);

  useEffect(() => {
    if (!materialRef.current) return;
    try {
      materialRef.current.fragmentShader = glslCode;
      materialRef.current.needsUpdate = true;
      onError?.(null);
    } catch (e: any) {
      onError?.(e.message);
    }
  }, [glslCode]);

  useEffect(() => {
    if (!creatureMeshRef.current) return;
    creatureMeshRef.current.visible = showMeshOverlay;
    if (showMeshOverlay) {
      const newGeom = generateCreatureGeometry(creatureParams, 16);
      creatureMeshRef.current.geometry.dispose();
      creatureMeshRef.current.geometry = newGeom;
      (creatureMeshRef.current.material as THREE.MeshStandardMaterial).color.setRGB(...creatureParams.glowColor);
    }
  }, [creatureParams, showMeshOverlay]);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border border-slate-800">
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        className="w-full h-full cursor-crosshair"
      />

      <div className="absolute top-2.5 left-3 flex items-center gap-2 text-xs font-mono bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded border border-white/10 text-slate-300">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Raymarching GLSL (96 steps)</span>
        <span className="text-slate-500">|</span>
        <span className="text-cyan-400">{fps} FPS</span>
      </div>

      <div className="absolute bottom-2.5 right-3 text-[11px] font-mono bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded border border-white/10 text-slate-400">
        Entropy: <span className="text-amber-400">{entropy.toFixed(2)}</span> | Latency: <span className="text-cyan-400">{latencyMs}ms</span>
      </div>
    </div>
  );
};
