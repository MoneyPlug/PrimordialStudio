import type { ShaderGraph } from '../nodes/nodeTypes';
import type { CreatureSDFParams } from '../sdf/creatureSdf';
import { graphToGlsl } from '../compiler/glslTranspiler';

export interface ShaderPresetTemplate {
  id: string;
  name: string;
  category: 'Abyssal' | 'Cybernetic' | 'Neural' | 'Cosmic';
  description: string;
  prompt: string;
  tags: string[];
  graph: ShaderGraph;
  glslSnippet: string;
  creatureParams: CreatureSDFParams;
}

export const PRESET_LIBRARY: ShaderPresetTemplate[] = [
  {
    id: 'bioluminescent-deep-sea',
    name: 'Bioluminescent Deep-Sea Entity',
    category: 'Abyssal',
    description:
      'Hydrothermal abyssal leviathan featuring undulating appendages, soft organic smin blending, and luminous cyan-blue oceanic radiance.',
    prompt: 'Bioluminescent deep sea cephalopod creature with soft ethereal glow and undulating tentacles',
    tags: ['smin', 'organic', 'abyssal', 'tentacles'],
    creatureParams: {
      scale: 1.0,
      bodyRadius: 0.95,
      gyroidFreq: 3.2,
      gyroidAmp: 0.08,
      tentacleCount: 8,
      tentacleLength: 1.85,
      tentacleTwist: 2.4,
      smoothBlend: 0.52,
      pulseSpeed: 1.6,
      pulseAmp: 0.12,
      roughness: 0.28,
      bioluminescence: 0.95,
      glowColor: [0.12, 0.85, 0.92],
    },
    graph: {
      nodes: [
        {
          id: 'sphere_1',
          type: 'sdSphere',
          title: 'Sphere SDF',
          x: 80,
          y: 80,
          inputs: { radius: 1.15 },
        },
        {
          id: 'gyroid_1',
          type: 'sdGyroid',
          title: 'Gyroid SDF',
          x: 80,
          y: 240,
          inputs: { scale: 3.2, thickness: 0.06 },
        },
        {
          id: 'blend_1',
          type: 'smin',
          title: 'Smooth Min (smin)',
          x: 340,
          y: 140,
          inputs: { blendK: 0.52 },
        },
        {
          id: 'creature_bridge',
          type: 'creatureBridge',
          title: 'Ollama Creature Node',
          x: 80,
          y: 400,
          inputs: { active: true },
        },
        {
          id: 'lighting_1',
          type: 'lightBlinnPhong',
          title: 'Blinn-Phong Lighting',
          x: 580,
          y: 180,
          inputs: {
            diffuseColor: [0.12, 0.65, 0.95],
            specularPower: 48.0,
            ambient: 0.2,
          },
        },
        {
          id: 'output_1',
          type: 'outputShader',
          title: 'Raymarching Master Output',
          x: 840,
          y: 180,
          inputs: { maxSteps: 96, maxDist: 35.0 },
        },
      ],
      connections: [
        { id: 'c1', fromNode: 'sphere_1', fromPort: 'dist', toNode: 'blend_1', toPort: 'distA' },
        { id: 'c2', fromNode: 'gyroid_1', fromPort: 'dist', toNode: 'blend_1', toPort: 'distB' },
        { id: 'c3', fromNode: 'blend_1', fromPort: 'outDist', toNode: 'lighting_1', toPort: 'sceneSDF' },
        { id: 'c4', fromNode: 'lighting_1', fromPort: 'fragColor', toNode: 'output_1', toPort: 'color' },
      ],
    },
    get glslSnippet() {
      return graphToGlsl(this.graph);
    },
  },
  {
    id: 'cybernetic-gyroid-lattice',
    name: 'Cybernetic Gyroid Lattice',
    category: 'Cybernetic',
    description:
      'Rigid synthetic lattice structure with dense gyroid internal frequencies, cylindrical structural beams, and high specular reflection.',
    prompt: 'Complex cybernetic gyroid scaffold matrix with high-frequency microstructures and metallic chrome sheen',
    tags: ['gyroid', 'cylinder', 'lattice', 'metallic'],
    creatureParams: {
      scale: 1.0,
      bodyRadius: 0.7,
      gyroidFreq: 9.8,
      gyroidAmp: 0.32,
      tentacleCount: 4,
      tentacleLength: 1.1,
      tentacleTwist: 6.5,
      smoothBlend: 0.18,
      pulseSpeed: 3.2,
      pulseAmp: 0.05,
      roughness: 0.15,
      bioluminescence: 0.4,
      glowColor: [0.4, 0.75, 1.0],
    },
    graph: {
      nodes: [
        {
          id: 'sphere_1',
          type: 'sdSphere',
          title: 'Sphere SDF',
          x: 80,
          y: 80,
          inputs: { radius: 0.8 },
        },
        {
          id: 'gyroid_1',
          type: 'sdGyroid',
          title: 'Gyroid SDF',
          x: 80,
          y: 240,
          inputs: { scale: 9.8, thickness: 0.035 },
        },
        {
          id: 'cylinder_1',
          type: 'sdCylinder',
          title: 'Cylinder SDF',
          x: 80,
          y: 400,
          inputs: { radius: 0.35, height: 1.6 },
        },
        {
          id: 'blend_1',
          type: 'smin',
          title: 'Smooth Min (smin)',
          x: 340,
          y: 140,
          inputs: { blendK: 0.18 },
        },
        {
          id: 'lighting_1',
          type: 'lightBlinnPhong',
          title: 'Blinn-Phong Lighting',
          x: 580,
          y: 180,
          inputs: {
            diffuseColor: [0.55, 0.65, 0.8],
            specularPower: 96.0,
            ambient: 0.1,
          },
        },
        {
          id: 'output_1',
          type: 'outputShader',
          title: 'Raymarching Master Output',
          x: 840,
          y: 180,
          inputs: { maxSteps: 96, maxDist: 30.0 },
        },
      ],
      connections: [
        { id: 'c1', fromNode: 'sphere_1', fromPort: 'dist', toNode: 'blend_1', toPort: 'distA' },
        { id: 'c2', fromNode: 'gyroid_1', fromPort: 'dist', toNode: 'blend_1', toPort: 'distB' },
        { id: 'c3', fromNode: 'blend_1', fromPort: 'outDist', toNode: 'lighting_1', toPort: 'sceneSDF' },
        { id: 'c4', fromNode: 'lighting_1', fromPort: 'fragColor', toNode: 'output_1', toPort: 'color' },
      ],
    },
    get glslSnippet() {
      return graphToGlsl(this.graph);
    },
  },
  {
    id: 'reactive-neural-pulse',
    name: 'Reactive Neural Pulse',
    category: 'Neural',
    description:
      'Highly dynamic neuromuscular topology sensitive to token entropy and latency variations, triggering rapid chaotic pulsations.',
    prompt: 'Pulsating neural bio-core firing synaptic tendrils with intense violet and magenta electromagnetic discharge',
    tags: ['neural', 'entropy', 'pulse', 'synaptic'],
    creatureParams: {
      scale: 1.0,
      bodyRadius: 0.85,
      gyroidFreq: 6.4,
      gyroidAmp: 0.22,
      tentacleCount: 10,
      tentacleLength: 2.1,
      tentacleTwist: 4.8,
      smoothBlend: 0.38,
      pulseSpeed: 4.2,
      pulseAmp: 0.28,
      roughness: 0.78,
      bioluminescence: 0.88,
      glowColor: [0.88, 0.22, 0.98],
    },
    graph: {
      nodes: [
        {
          id: 'sphere_1',
          type: 'sdSphere',
          title: 'Sphere SDF',
          x: 80,
          y: 80,
          inputs: { radius: 0.9 },
        },
        {
          id: 'gyroid_1',
          type: 'sdGyroid',
          title: 'Gyroid SDF',
          x: 80,
          y: 240,
          inputs: { scale: 6.4, thickness: 0.05 },
        },
        {
          id: 'blend_1',
          type: 'smin',
          title: 'Smooth Min (smin)',
          x: 340,
          y: 140,
          inputs: { blendK: 0.38 },
        },
        {
          id: 'creature_bridge',
          type: 'creatureBridge',
          title: 'Ollama Creature Node',
          x: 80,
          y: 400,
          inputs: { active: true },
        },
        {
          id: 'lighting_1',
          type: 'lightBlinnPhong',
          title: 'Blinn-Phong Lighting',
          x: 580,
          y: 180,
          inputs: {
            diffuseColor: [0.85, 0.2, 0.95],
            specularPower: 32.0,
            ambient: 0.25,
          },
        },
        {
          id: 'output_1',
          type: 'outputShader',
          title: 'Raymarching Master Output',
          x: 840,
          y: 180,
          inputs: { maxSteps: 96, maxDist: 35.0 },
        },
      ],
      connections: [
        { id: 'c1', fromNode: 'sphere_1', fromPort: 'dist', toNode: 'blend_1', toPort: 'distA' },
        { id: 'c2', fromNode: 'gyroid_1', fromPort: 'dist', toNode: 'blend_1', toPort: 'distB' },
        { id: 'c3', fromNode: 'blend_1', fromPort: 'outDist', toNode: 'lighting_1', toPort: 'sceneSDF' },
        { id: 'c4', fromNode: 'lighting_1', fromPort: 'fragColor', toNode: 'output_1', toPort: 'color' },
      ],
    },
    get glslSnippet() {
      return graphToGlsl(this.graph);
    },
  },
  {
    id: 'abyssal-spire-leviathan',
    name: 'Abyssal Spire Leviathan',
    category: 'Cosmic',
    description:
      'Colossal infinite domain repetition lattice creating towering alien monoliths with deep emerald bioluminescence.',
    prompt: 'Infinite cosmic monolith field with ancient geometric spires emerging from deep void',
    tags: ['opRepeat', 'spire', 'monolith', 'cosmic'],
    creatureParams: {
      scale: 1.0,
      bodyRadius: 1.1,
      gyroidFreq: 4.5,
      gyroidAmp: 0.15,
      tentacleCount: 6,
      tentacleLength: 1.4,
      tentacleTwist: 1.8,
      smoothBlend: 0.42,
      pulseSpeed: 1.2,
      pulseAmp: 0.08,
      roughness: 0.45,
      bioluminescence: 0.75,
      glowColor: [0.15, 0.92, 0.55],
    },
    graph: {
      nodes: [
        {
          id: 'sphere_1',
          type: 'sdSphere',
          title: 'Sphere SDF',
          x: 80,
          y: 80,
          inputs: { radius: 1.1 },
        },
        {
          id: 'gyroid_1',
          type: 'sdGyroid',
          title: 'Gyroid SDF',
          x: 80,
          y: 240,
          inputs: { scale: 4.5, thickness: 0.05 },
        },
        {
          id: 'repeat_1',
          type: 'opRepeat',
          title: 'Domain Repeat',
          x: 340,
          y: 300,
          inputs: { period: 5.0 },
        },
        {
          id: 'blend_1',
          type: 'smin',
          title: 'Smooth Min (smin)',
          x: 340,
          y: 140,
          inputs: { blendK: 0.42 },
        },
        {
          id: 'lighting_1',
          type: 'lightBlinnPhong',
          title: 'Blinn-Phong Lighting',
          x: 580,
          y: 180,
          inputs: {
            diffuseColor: [0.1, 0.8, 0.5],
            specularPower: 64.0,
            ambient: 0.18,
          },
        },
        {
          id: 'output_1',
          type: 'outputShader',
          title: 'Raymarching Master Output',
          x: 840,
          y: 180,
          inputs: { maxSteps: 96, maxDist: 40.0 },
        },
      ],
      connections: [
        { id: 'c1', fromNode: 'sphere_1', fromPort: 'dist', toNode: 'blend_1', toPort: 'distA' },
        { id: 'c2', fromNode: 'gyroid_1', fromPort: 'dist', toNode: 'blend_1', toPort: 'distB' },
        { id: 'c3', fromNode: 'blend_1', fromPort: 'outDist', toNode: 'lighting_1', toPort: 'sceneSDF' },
        { id: 'c4', fromNode: 'lighting_1', fromPort: 'fragColor', toNode: 'output_1', toPort: 'color' },
      ],
    },
    get glslSnippet() {
      return graphToGlsl(this.graph);
    },
  },
];
