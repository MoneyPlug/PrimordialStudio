# Procedural Creature Raymarching & WebXR Telemetry Studio

An advanced real-time 3D studio integrating local LLM inference metrics, signed distance field (SDF) procedural creature topologies, native WebXR 6DoF telemetry with Unreal Engine 5 UDP streaming, and a bi-directional GLSL raymarching Monaco IDE node graph.

---

## Architecture Overview

### 1. Procedural Creature Topologies from Model Weights
- **Ollama / llama.cpp Bridge (`src/services/ollamaBridge.ts`)**:
  - Connects to local Ollama endpoints (`http://localhost:11434/api/generate`) with token streaming.
  - Computes real-time latency, generation speed (tokens/sec), logit variance / character entropy, and latent weight vectors.
  - Includes high-fidelity simulated fallback inference when local daemons are offline.
- **SDF Parameter Mapping (`src/sdf/creatureSdf.ts`)**:
  - Maps entropy to surface chaos, gyroid internal frequencies, and tentacle twisting.
  - Maps token weight distribution vectors to morphological limb count, length, smooth min union (`smin`), and bioluminescent RGB hues.
- **Procedural Mesh Extraction (`src/sdf/marchingCubes.ts`)**:
  - Generates procedural Three.js `BufferGeometry` meshes directly from creature signed distance fields for hybrid wireframe and surface overlays.

### 2. Native WebXR Telemetry & 3D Spatial Audio Node
- **WebXR 6DoF Telemetry Manager (`src/xr/webxrTelemetry.ts`)**:
  - Captures immersive VR viewer and controller poses (head position, orientation, linear velocity, left/right hand grip & trigger states).
  - Includes high-fidelity 6DoF simulation loop with realistic head sway and hand movement when VR hardware is unavailable.
- **Unreal Engine 5 UDP Bridge (`server/udpBridge.ts`)**:
  - Serializes WebXR telemetry frames into low-latency binary OSC packets (`/webxr/telemetry`, `,fffffffff`).
  - Converts coordinates to UE5 left-handed centimeter convention (Z-Up) and transmits via Node `dgram` UDP socket to UE5 LiveLink/OSC targets.
- **HRTF 3D Spatial Audio Engine (`src/audio/hrtfSpatialAudio.ts`)**:
  - Web Audio API graph utilizing `PannerNode` with `panningModel = 'HRTF'`.
  - Object audio emitter position dynamically locked to the 3D visual coordinates of the procedural creature.
  - Listener orientation and position continuously driven by real-time WebXR head poses.
  - Modulates lowpass filter resonance and fundamental frequencies based on creature bioluminescence and gyroid parameters.

### 3. Real-Time GLSL Raymarching Shader Node System with Monaco IDE
- **Visual Node Graph (`src/components/VisualNodeGraph.tsx`, `src/nodes/nodeTypes.ts`)**:
  - Interactive DAG node canvas with draggable nodes, parameter sliders, and bezier connection lines.
  - Exposes SDF primitives (`sdSphere`, `sdBox`, `sdTorus`, `sdGyroid`), operators (`smin`, `opTwist`), and lighting models (Blinn-Phong, ambient occlusion, fresnel).
- **Bi-Directional Compiler (`src/compiler/glslTranspiler.ts`)**:
  - `graphToGlsl`: Transpiles the visual node graph into an optimized GLSL fragment shader with a 96-step raymarching loop, normal tetrahedron calculation, and Blinn-Phong shading.
  - `glslToGraph`: Parses raw GLSL raymarching code back into editable visual graph nodes and parameters.
- **Monaco IDE Editor (`src/components/MonacoGlslEditor.tsx`)**:
  - Full-featured code editor with syntax highlighting, live error markers, and keyboard shortcuts (`Cmd/Ctrl + S` to sync back to the node graph).
- **Raymarching Viewport (`src/components/RaymarchingViewport.tsx`)**:
  - Three.js WebGL fullscreen quad rendering the live compiled fragment shader with dynamic uniforms (`u_time`, `u_mouse`, `u_resolution`, `u_entropy`, `u_latency`, `u_glowColor`).

---

## Getting Started

### Development
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```

### Unreal Engine 5 UDP Bridge Server
```bash
# Launch the UDP telemetry bridge
npx tsx -e "
import { UE5TelemetryUdpBridge } from './server/udpBridge';
const bridge = new UE5TelemetryUdpBridge({ targetIp: '127.0.0.1', targetPort: 8000, wsPort: 8080 });
bridge.start();
"
```

### Running Tests
```bash
# Run unit and integration test suites
npx vitest run
```

### Production Build
```bash
# Build production bundle
npm run build
```
