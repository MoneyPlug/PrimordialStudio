export type NodeType =
  // Primitives
  | 'sdSphere'
  | 'sdBox'
  | 'sdTorus'
  | 'sdGyroid'
  | 'sdCylinder'
  // Operators
  | 'smin'
  | 'opUnion'
  | 'opSubtract'
  | 'opIntersect'
  | 'opTwist'
  | 'opRepeat'
  // Lighting
  | 'lightBlinnPhong'
  | 'lightFresnel'
  | 'lightAO'
  // Inputs / Output
  | 'creatureBridge'
  | 'outputShader';

export interface NodePort {
  id: string;
  name: string;
  type: 'float' | 'vec3' | 'vec4' | 'sdf';
  direction: 'in' | 'out';
}

export interface GraphNode {
  id: string;
  type: NodeType;
  title: string;
  x: number;
  y: number;
  inputs: Record<string, any>;
  outputs?: string[];
}

export interface GraphConnection {
  id: string;
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
}

export interface ShaderGraph {
  nodes: GraphNode[];
  connections: GraphConnection[];
}

export const DEFAULT_NODES: GraphNode[] = [
  {
    id: 'sphere_1',
    type: 'sdSphere',
    title: 'Sphere SDF',
    x: 80,
    y: 80,
    inputs: { radius: 1.0, offset: [0, 0, 0] },
  },
  {
    id: 'gyroid_1',
    type: 'sdGyroid',
    title: 'Gyroid SDF',
    x: 80,
    y: 240,
    inputs: { scale: 5.0, thickness: 0.05, bias: 0.0 },
  },
  {
    id: 'blend_1',
    type: 'smin',
    title: 'Smooth Min (smin)',
    x: 340,
    y: 140,
    inputs: { blendK: 0.35 },
  },
  {
    id: 'creature_bridge',
    type: 'creatureBridge',
    title: 'Ollama Creature Node',
    x: 80,
    y: 400,
    inputs: { active: true, scale: 1.0 },
  },
  {
    id: 'lighting_1',
    type: 'lightBlinnPhong',
    title: 'Blinn-Phong Lighting',
    x: 580,
    y: 180,
    inputs: {
      diffuseColor: [0.3, 0.7, 1.0],
      specularPower: 32.0,
      ambient: 0.15,
      enableAO: true,
      enableShadows: true,
    },
  },
  {
    id: 'output_1',
    type: 'outputShader',
    title: 'Raymarching Master Output',
    x: 840,
    y: 180,
    inputs: { maxSteps: 96, maxDist: 40.0, epsilon: 0.001 },
  },
];

export const DEFAULT_CONNECTIONS: GraphConnection[] = [
  {
    id: 'c1',
    fromNode: 'sphere_1',
    fromPort: 'dist',
    toNode: 'blend_1',
    toPort: 'distA',
  },
  {
    id: 'c2',
    fromNode: 'gyroid_1',
    fromPort: 'dist',
    toNode: 'blend_1',
    toPort: 'distB',
  },
  {
    id: 'c3',
    fromNode: 'blend_1',
    fromPort: 'outDist',
    toNode: 'lighting_1',
    toPort: 'sceneSDF',
  },
  {
    id: 'c4',
    fromNode: 'lighting_1',
    fromPort: 'fragColor',
    toNode: 'output_1',
    toPort: 'color',
  },
];
