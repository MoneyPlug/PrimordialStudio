import { describe, it, expect } from 'vitest';
import { ARCHETYPE_PRESETS } from '../src/nodes/archetypePresets';
import { graphToGlsl, glslToGraph } from '../src/compiler/glslTranspiler';

describe('Modular Archetype Presets & Bi-directional Transpilation', () => {
  it('loads standard modular archetype presets', () => {
    expect(ARCHETYPE_PRESETS.length).toBeGreaterThanOrEqual(4);
    const names = ARCHETYPE_PRESETS.map((p) => p.name);
    expect(names).toContain('Abyssal Leviathan');
    expect(names).toContain('Fractal Gyroid Crystal');
    expect(names).toContain('Solar Flare Torus');
    expect(names).toContain('Cybernetic Lattice Monolith');
  });

  it('transpiles each archetype preset graph to valid GLSL code', () => {
    for (const preset of ARCHETYPE_PRESETS) {
      const glsl = graphToGlsl(preset.graph);
      expect(glsl).toContain('float mapScene(vec3 p)');
      expect(glsl).toContain('void mainImage');
    }
  });

  it('supports roundtrip parsing of archetype GLSL back into structured node graphs', () => {
    for (const preset of ARCHETYPE_PRESETS) {
      const glsl = preset.glsl || graphToGlsl(preset.graph);
      const parsedGraph = glslToGraph(glsl);
      expect(parsedGraph.nodes.length).toBeGreaterThan(0);
      expect(parsedGraph.connections.length).toBeGreaterThan(0);
    }
  });
});
