import { describe, it, expect } from 'vitest';
import { graphToGlsl, glslToGraph } from '../src/compiler/glslTranspiler';
import { DEFAULT_NODES, DEFAULT_CONNECTIONS, ShaderGraph } from '../src/nodes/nodeTypes';

describe('GLSL Raymarching Transpiler & Node Parser', () => {
  it('should transpile default node graph into valid GLSL fragment shader', () => {
    const graph: ShaderGraph = {
      nodes: DEFAULT_NODES,
      connections: DEFAULT_CONNECTIONS,
    };

    const glsl = graphToGlsl(graph);

    expect(glsl).toContain('float mapScene(vec3 p)');
    expect(glsl).toContain('float sdSphere');
    expect(glsl).toContain('float sdGyroid');
    expect(glsl).toContain('float smin(');
    expect(glsl).toContain('calcNormal');
    expect(glsl).toContain('mainImage');
  });

  it('should parse GLSL code back into a structured ShaderGraph', () => {
    const initialGraph: ShaderGraph = {
      nodes: DEFAULT_NODES,
      connections: DEFAULT_CONNECTIONS,
    };
    const glsl = graphToGlsl(initialGraph);

    const parsedGraph = glslToGraph(glsl);

    expect(parsedGraph.nodes.length).toBeGreaterThan(0);
    const sphere = parsedGraph.nodes.find((n) => n.type === 'sdSphere');
    expect(sphere).toBeDefined();
    expect(sphere?.inputs.radius).toBeCloseTo(1.0);

    const gyroid = parsedGraph.nodes.find((n) => n.type === 'sdGyroid');
    expect(gyroid).toBeDefined();
    expect(gyroid?.inputs.scale).toBeCloseTo(5.0);

    const smin = parsedGraph.nodes.find((n) => n.type === 'smin');
    expect(smin).toBeDefined();
    expect(smin?.inputs.blendK).toBeCloseTo(0.35);
  });

  it('should update compiled GLSL when graph parameters change', () => {
    const modifiedNodes = DEFAULT_NODES.map((node) => {
      if (node.type === 'sdSphere') {
        return { ...node, inputs: { ...node.inputs, radius: 2.25 } };
      }
      return node;
    });

    const glsl = graphToGlsl({ nodes: modifiedNodes, connections: DEFAULT_CONNECTIONS });
    expect(glsl).toContain('2.250');
  });
});
