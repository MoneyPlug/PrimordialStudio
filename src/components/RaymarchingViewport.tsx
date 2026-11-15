import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CreatureSDFParams } from '../sdf/creatureSdf';
import { generateCreatureGeometry } from '../sdf/marchingCubes';
import type { Vector3D } from '../xr/webxrTelemetry';
import { StudioTelemetryBinder, type CreatureCoordinate } from '../services/studioTelemetryBinder';
import type { CivilianAgent, PredatorAgent, CivilizationStructure } from '../simulation/predatorSwarm';

interface RaymarchingViewportProps {
  glslCode: string;
  creatureParams: CreatureSDFParams;
  creaturePosition: Vector3D;
  entropy: number;
  latencyMs: number;
  showMeshOverlay?: boolean;
  isCrisis?: boolean;
  predatorActors?: PredatorAgent[];
  civilianAgents?: CivilianAgent[];
  structures?: CivilizationStructure[];
  onCreatureTelemetry?: (coords: CreatureCoordinate[]) => void;
  onError?: (err: string | null) => void;
}

export const RaymarchingViewport: React.FC<RaymarchingViewportProps> = ({
  glslCode,
  creatureParams,
  creaturePosition,
  entropy,
  latencyMs,
  showMeshOverlay = true,
  isCrisis = false,
  predatorActors = [],
  civilianAgents = [],
  structures = [],
  onCreatureTelemetry,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const predatorMeshGroupRef = useRef<THREE.Group | null>(null);
  const civilianMeshGroupRef = useRef<THREE.Group | null>(null);
  const structureMeshGroupRef = useRef<THREE.Group | null>(null);
  const binderRef = useRef<StudioTelemetryBinder | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const [fps, setFps] = useState(60);

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

    // Initial 4 predator coordinate slots [x, y, z, state]
    const predatorUniforms = [
      new THREE.Vector4(creaturePosition.x, creaturePosition.y - 1.5, creaturePosition.z, 0),
      new THREE.Vector4(2.0, 0.0, -1.0, 1),
      new THREE.Vector4(-2.5, 0.0, 1.5, 2),
      new THREE.Vector4(0.0, 0.0, 2.5, 1),
    ];

    const uniforms = {
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_time: { value: 0 },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_entropy: { value: entropy },
      u_latency: { value: latencyMs / 1000 },
      u_glowColor: { value: new THREE.Vector3(...creatureParams.glowColor) },
      u_creatureBlend: { value: creatureParams.smoothBlend },
      // Simulation telemetry uniforms
      u_density: { value: 1.0 },
      u_stress: { value: isCrisis ? 1.0 : 0.0 },
      u_center: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
      // Mobile Creature Actors Uniforms
      u_predatorCoords: { value: predatorUniforms },
      u_predatorCount: { value: 3 },
      u_crisisActive: { value: isCrisis ? 1.0 : 0.0 },
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
    scene.add(mesh);

    // Groups for procedural 3D overlay entities
    const predGroup = new THREE.Group();
    predatorMeshGroupRef.current = predGroup;
    scene.add(predGroup);

    const civGroup = new THREE.Group();
    civilianMeshGroupRef.current = civGroup;
    scene.add(civGroup);

    const structGroup = new THREE.Group();
    structureMeshGroupRef.current = structGroup;
    scene.add(structGroup);

    // Initialize Studio Telemetry WebSocket Binder
    binderRef.current = new StudioTelemetryBinder(material, 'ws://localhost:8080', (telemetry) => {
      if (telemetry.creatures) {
        onCreatureTelemetry?.(telemetry.creatures);
      }
    });

    let animationId: number;
    let frameCount = 0;
    let fpsTimer = performance.now();

    const animate = (time: number) => {
      animationId = requestAnimationFrame(animate);

      if (materialRef.current) {
        materialRef.current.uniforms.u_time.value = time * 0.001;
        materialRef.current.uniforms.u_mouse.value.set(mouseRef.current.x, mouseRef.current.y);
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

  // Sync basic metrics & crisis uniforms
  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.u_entropy.value = entropy;
    materialRef.current.uniforms.u_latency.value = latencyMs / 1000;
    materialRef.current.uniforms.u_glowColor.value.set(...creatureParams.glowColor);
    materialRef.current.uniforms.u_creatureBlend.value = creatureParams.smoothBlend;
    materialRef.current.uniforms.u_crisisActive.value = isCrisis ? 1.0 : 0.0;
    materialRef.current.uniforms.u_stress.value = isCrisis ? 1.0 : 0.0;
  }, [entropy, latencyMs, creatureParams, isCrisis]);

  // Sync Predator Actor Entities into shader uniforms & 3D mesh overlay
  useEffect(() => {
    if (!materialRef.current) return;

    if (predatorActors.length > 0) {
      const uniformArr: THREE.Vector4[] = materialRef.current.uniforms.u_predatorCoords?.value;
      if (uniformArr) {
        predatorActors.slice(0, 4).forEach((pred, i) => {
          if (uniformArr[i]) {
            const stateCode = pred.state === 'dormant' ? 0 : pred.state === 'docile' ? 1 : pred.state === 'hunting' ? 2 : 3;
            uniformArr[i].set(pred.position.x, pred.position.y, pred.position.z, stateCode);
          }
        });
      }
      if (materialRef.current.uniforms.u_predatorCount) {
        materialRef.current.uniforms.u_predatorCount.value = Math.min(4, predatorActors.length);
      }
    }

    // Update Marching Cubes procedural meshes for active predators
    if (predatorMeshGroupRef.current) {
      const group = predatorMeshGroupRef.current;
      group.visible = showMeshOverlay;

      if (showMeshOverlay) {
        // Clear old meshes
        while (group.children.length > 0) {
          const child = group.children[0] as THREE.Mesh;
          child.geometry?.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material?.dispose();
          group.remove(child);
        }

        // Generate procedural geometry for each mobile predator
        predatorActors.slice(0, 3).forEach((pred) => {
          const scaledParams: CreatureSDFParams = {
            ...creatureParams,
            bodyRadius: pred.bodyRadius,
            tentacleCount: pred.tentacleCount,
            glowColor: pred.glowColor,
          };
          const geom = generateCreatureGeometry(scaledParams, 14);
          const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(...pred.glowColor),
            wireframe: true,
            roughness: 0.3,
            metalness: 0.8,
          });
          const mesh = new THREE.Mesh(geom, mat);
          mesh.scale.set(0.6, 0.6, 0.6);
          mesh.position.set(pred.position.x, pred.position.y, pred.position.z);
          group.add(mesh);
        });
      }
    }
  }, [predatorActors, creatureParams, showMeshOverlay]);

  // Sync Civilian & Structure 3D mesh overlays
  useEffect(() => {
    if (!civilianMeshGroupRef.current || !structureMeshGroupRef.current) return;
    const civGroup = civilianMeshGroupRef.current;
    const structGroup = structureMeshGroupRef.current;

    civGroup.visible = showMeshOverlay;
    structGroup.visible = showMeshOverlay;

    if (!showMeshOverlay) return;

    // Clear old children
    while (civGroup.children.length > 0) {
      const c = civGroup.children[0] as THREE.Mesh;
      c.geometry?.dispose();
      civGroup.remove(c);
    }
    while (structGroup.children.length > 0) {
      const s = structGroup.children[0] as THREE.Mesh;
      s.geometry?.dispose();
      structGroup.remove(s);
    }

    // Add civilian boid visual indicators
    const boidGeom = new THREE.ConeGeometry(0.1, 0.25, 4);
    const boidMatForaging = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
    const boidMatEvading = new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true });

    civilianAgents.forEach((civ) => {
      const boid = new THREE.Mesh(boidGeom, civ.state === 'evading' ? boidMatEvading : boidMatForaging);
      boid.position.set(civ.position.x, civ.position.y, civ.position.z);
      civGroup.add(boid);
    });

    // Add civilization safe zone barrier structures
    structures.forEach((st) => {
      const structGeom = st.type === 'citadel_core'
        ? new THREE.OctahedronGeometry(st.radius * 0.6)
        : new THREE.BoxGeometry(st.radius, 1.2, st.radius);
      const structMat = new THREE.MeshBasicMaterial({
        color: st.health < 40 ? 0xef4444 : 0x10b981,
        wireframe: true,
      });
      const sMesh = new THREE.Mesh(structGeom, structMat);
      sMesh.position.set(st.position.x, st.position.y, st.position.z);
      structGroup.add(sMesh);
    });
  }, [civilianAgents, structures, showMeshOverlay]);

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
        <span className={`w-2 h-2 rounded-full ${isCrisis ? 'bg-red-500 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
        <span>Raymarching GLSL ({predatorActors.length} Mobile SDF Entities)</span>
        <span className="text-slate-500">|</span>
        <span className="text-cyan-400">{fps} FPS</span>
      </div>

      <div className="absolute bottom-2.5 right-3 text-[11px] font-mono bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded border border-white/10 text-slate-400">
        Entropy: <span className={entropy > 0.6 ? 'text-red-400 font-bold' : 'text-amber-400'}>{entropy.toFixed(2)}</span> | Latency: <span className="text-cyan-400">{latencyMs}ms</span>
        {isCrisis && <span className="ml-2 px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-700 font-bold">APEX CRISIS</span>}
      </div>
    </div>
  );
};
