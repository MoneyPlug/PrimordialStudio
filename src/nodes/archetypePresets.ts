import type { ShaderGraph } from './nodeTypes';
import { graphToGlsl } from '../compiler/glslTranspiler';

export interface ArchetypePreset {
  id: string;
  name: string;
  category: 'Creature' | 'Fractal' | 'Cosmic' | 'Architectural';
  description: string;
  tags: string[];
  graph: ShaderGraph;
  glsl?: string;
}

export const ARCHETYPE_PRESETS: ArchetypePreset[] = [
  {
    id: 'abyssal_leviathan',
    name: 'Abyssal Leviathan',
    category: 'Creature',
    description: 'Bioluminescent deep-sea morphology with 6 tentacle articulators, dense gyroid core, and reactive smin blending.',
    tags: ['SDF Creature', 'Gyroid Core', 'Tentacles', 'Bioluminescent'],
    graph: {
      nodes: [
        {
          id: 'sphere_core',
          type: 'sdSphere',
          title: 'Abyssal Nucleus',
          x: 60,
          y: 70,
          inputs: { radius: 1.25 },
        },
        {
          id: 'gyroid_internal',
          type: 'sdGyroid',
          title: 'Internal Gyroid Ribs',
          x: 60,
          y: 220,
          inputs: { scale: 6.5, thickness: 0.045 },
        },
        {
          id: 'smin_fusion',
          type: 'smin',
          title: 'Organic Blend',
          x: 320,
          y: 130,
          inputs: { blendK: 0.42 },
        },
        {
          id: 'creature_bridge',
          type: 'creatureBridge',
          title: 'Neural Limbs & Tendrils',
          x: 60,
          y: 380,
          inputs: { active: true },
        },
        {
          id: 'light_abyssal',
          type: 'lightBlinnPhong',
          title: 'Deep Abyssal Shading',
          x: 560,
          y: 160,
          inputs: {
            diffuseColor: [0.15, 0.65, 0.95],
            specularPower: 48.0,
            ambient: 0.12,
          },
        },
        {
          id: 'output_master',
          type: 'outputShader',
          title: 'Raymarching Master Output',
          x: 820,
          y: 160,
          inputs: { maxSteps: 96, maxDist: 25.0 },
        },
      ],
      connections: [
        { id: 'c1', fromNode: 'sphere_core', fromPort: 'dist', toNode: 'smin_fusion', toPort: 'distA' },
        { id: 'c2', fromNode: 'gyroid_internal', fromPort: 'dist', toNode: 'smin_fusion', toPort: 'distB' },
        { id: 'c3', fromNode: 'smin_fusion', fromPort: 'outDist', toNode: 'light_abyssal', toPort: 'sceneSDF' },
        { id: 'c4', fromNode: 'light_abyssal', fromPort: 'fragColor', toNode: 'output_master', toPort: 'color' },
      ],
    },
  },
  {
    id: 'fractal_gyroid_crystal',
    name: 'Fractal Gyroid Crystal',
    category: 'Fractal',
    description: 'High-frequency mathematical minimal surface bounded by a spherical domain with iridescent Blinn-Phong specular highlighting.',
    tags: ['Minimal Surface', 'Gyroid', 'Mathematical', 'Iridescent'],
    graph: {
      nodes: [
        {
          id: 'sphere_bound',
          type: 'sdSphere',
          title: 'Crystal Bounding Sphere',
          x: 60,
          y: 70,
          inputs: { radius: 1.6 },
        },
        {
          id: 'gyroid_lattice',
          type: 'sdGyroid',
          title: 'Fractal Gyroid Lattice',
          x: 60,
          y: 220,
          inputs: { scale: 8.5, thickness: 0.08 },
        },
        {
          id: 'smin_crystal',
          type: 'smin',
          title: 'Lattice Fusion',
          x: 320,
          y: 130,
          inputs: { blendK: 0.2 },
        },
        {
          id: 'light_crystal',
          type: 'lightBlinnPhong',
          title: 'Prismatic Specular',
          x: 560,
          y: 160,
          inputs: {
            diffuseColor: [0.85, 0.35, 0.95],
            specularPower: 64.0,
            ambient: 0.2,
          },
        },
        {
          id: 'output_master',
          type: 'outputShader',
          title: 'Raymarching Master Output',
          x: 820,
          y: 160,
          inputs: { maxSteps: 96, maxDist: 25.0 },
        },
      ],
      connections: [
        { id: 'c1', fromNode: 'sphere_bound', fromPort: 'dist', toNode: 'smin_crystal', toPort: 'distA' },
        { id: 'c2', fromNode: 'gyroid_lattice', fromPort: 'dist', toNode: 'smin_crystal', toPort: 'distB' },
        { id: 'c3', fromNode: 'smin_crystal', fromPort: 'outDist', toNode: 'light_crystal', toPort: 'sceneSDF' },
        { id: 'c4', fromNode: 'light_crystal', fromPort: 'fragColor', toNode: 'output_master', toPort: 'color' },
      ],
    },
  },
  {
    id: 'solar_flare_torus',
    name: 'Solar Flare Torus',
    category: 'Cosmic',
    description: 'Accretion disk torus warped by periodic oscillation, gyroid turbulence, and glowing corona highlights.',
    tags: ['Torus', 'Accretion Disk', 'Cosmic', 'Turbulent'],
    graph: {
      nodes: [
        {
          id: 'sphere_star',
          type: 'sdSphere',
          title: 'Solar Core',
          x: 60,
          y: 70,
          inputs: { radius: 0.8 },
        },
        {
          id: 'torus_ring',
          type: 'sdTorus',
          title: 'Accretion Ring',
          x: 60,
          y: 220,
          inputs: { majorRadius: 1.5, minorRadius: 0.22 },
        },
        {
          id: 'gyroid_turbulence',
          type: 'sdGyroid',
          title: 'Solar Plasma Noise',
          x: 60,
          y: 370,
          inputs: { scale: 4.2, thickness: 0.06 },
        },
        {
          id: 'smin_plasma',
          type: 'smin',
          title: 'Corona Fusion',
          x: 340,
          y: 150,
          inputs: { blendK: 0.45 },
        },
        {
          id: 'light_solar',
          type: 'lightBlinnPhong',
          title: 'Incandescent Corona',
          x: 580,
          y: 170,
          inputs: {
            diffuseColor: [1.0, 0.45, 0.1],
            specularPower: 24.0,
            ambient: 0.25,
          },
        },
        {
          id: 'output_master',
          type: 'outputShader',
          title: 'Raymarching Master Output',
          x: 840,
          y: 170,
          inputs: { maxSteps: 96, maxDist: 30.0 },
        },
      ],
      connections: [
        { id: 'c1', fromNode: 'sphere_star', fromPort: 'dist', toNode: 'smin_plasma', toPort: 'distA' },
        { id: 'c2', fromNode: 'gyroid_turbulence', fromPort: 'dist', toNode: 'smin_plasma', toPort: 'distB' },
        { id: 'c3', fromNode: 'smin_plasma', fromPort: 'outDist', toNode: 'light_solar', toPort: 'sceneSDF' },
        { id: 'c4', fromNode: 'light_solar', fromPort: 'fragColor', toNode: 'output_master', toPort: 'color' },
      ],
    },
  },
  {
    id: 'cybernetic_lattice',
    name: 'Cybernetic Lattice Monolith',
    category: 'Architectural',
    description: 'Repeated 3D cellular matrix featuring cylinder columns and box foundation modulated by agent stress uniforms.',
    tags: ['Domain Repeat', 'Cylinder', 'Monolith', 'Brutalist'],
    graph: {
      nodes: [
        {
          id: 'sphere_pillar',
          type: 'sdSphere',
          title: 'Central Node',
          x: 60,
          y: 70,
          inputs: { radius: 0.9 },
        },
        {
          id: 'cylinder_column',
          type: 'sdCylinder',
          title: 'Structural Column',
          x: 60,
          y: 220,
          inputs: { radius: 0.4, height: 1.8 },
        },
        {
          id: 'domain_grid',
          type: 'opRepeat',
          title: '3D Domain Repeat',
          x: 320,
          y: 70,
          inputs: { period: 4.5 },
        },
        {
          id: 'gyroid_circuits',
          type: 'sdGyroid',
          title: 'Sub-surface Wiring',
          x: 60,
          y: 380,
          inputs: { scale: 7.0, thickness: 0.03 },
        },
        {
          id: 'smin_cyber',
          type: 'smin',
          title: 'Matrix Smin',
          x: 340,
          y: 220,
          inputs: { blendK: 0.3 },
        },
        {
          id: 'light_cyber',
          type: 'lightBlinnPhong',
          title: 'Neon Cyber Shading',
          x: 580,
          y: 180,
          inputs: {
            diffuseColor: [0.0, 0.9, 0.7],
            specularPower: 40.0,
            ambient: 0.1,
          },
        },
        {
          id: 'output_master',
          type: 'outputShader',
          title: 'Raymarching Master Output',
          x: 840,
          y: 180,
          inputs: { maxSteps: 96, maxDist: 35.0 },
        },
      ],
      connections: [
        { id: 'c1', fromNode: 'sphere_pillar', fromPort: 'dist', toNode: 'smin_cyber', toPort: 'distA' },
        { id: 'c2', fromNode: 'gyroid_circuits', fromPort: 'dist', toNode: 'smin_cyber', toPort: 'distB' },
        { id: 'c3', fromNode: 'smin_cyber', fromPort: 'outDist', toNode: 'light_cyber', toPort: 'sceneSDF' },
        { id: 'c4', fromNode: 'light_cyber', fromPort: 'fragColor', toNode: 'output_master', toPort: 'color' },
      ],
    },
  },
];

// Populate pre-transpiled GLSL
ARCHETYPE_PRESETS.forEach((preset) => {
  preset.glsl = graphToGlsl(preset.graph);
});
