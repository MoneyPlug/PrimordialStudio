import { describe, it, expect } from 'vitest';
import { PRESET_LIBRARY } from '../src/presets/shaderPresets';
import { graphToGlsl } from '../src/compiler/glslTranspiler';

describe('Preset & Shader Node Template Library', () => {
  it('contains all required visual node template archetypes', () => {
    const ids = PRESET_LIBRARY.map((p) => p.id);
    expect(ids).toContain('bioluminescent-deep-sea');
    expect(ids).toContain('cybernetic-gyroid-lattice');
    expect(ids).toContain('reactive-neural-pulse');
    expect(ids).toContain('abyssal-spire-leviathan');
  });

  it('validates each preset has complete metadata, creatureParams, and tags', () => {
    for (const preset of PRESET_LIBRARY) {
      expect(preset.name).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.prompt).toBeTruthy();
      expect(preset.tags.length).toBeGreaterThan(0);
      expect(preset.creatureParams.gyroidFreq).toBeGreaterThan(0);
      expect(preset.creatureParams.tentacleCount).toBeGreaterThan(0);
      expect(preset.creatureParams.glowColor).toHaveLength(3);
    }
  });

  it('transpiles each preset ShaderGraph into valid GLSL code', () => {
    for (const preset of PRESET_LIBRARY) {
      const glsl = graphToGlsl(preset.graph);
      expect(glsl).toContain('float mapScene(vec3 p)');
      expect(glsl).toContain('void mainImage');
      expect(glsl).toContain('smin');
      expect(glsl.length).toBeGreaterThan(200);
    }
  });
});
