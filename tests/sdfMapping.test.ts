import { describe, it, expect } from 'vitest';
import { mapMetricsToCreatureSDF, generateCreatureGLSL } from '../src/sdf/creatureSdf';
import { generateCreatureGeometry } from '../src/sdf/marchingCubes';
import { ModelInferenceMetrics } from '../src/services/ollamaBridge';

describe('Model Weights to Creature SDF Topology', () => {
  const mockMetrics: ModelInferenceMetrics = {
    prompt: 'Fractal abyssal entity',
    tokenCount: 64,
    tokensPerSecond: 28.5,
    latencyMs: 120,
    entropy: 0.72,
    weightsDistribution: [0.8, 0.4, 0.6, 0.9, 0.5, 0.3, 0.7, 0.85],
    timestamp: Date.now(),
    status: 'connected',
    rawOutput: 'The creature pulsates...',
  };

  it('maps latency and entropy to creature morphological parameters', () => {
    const params = mapMetricsToCreatureSDF(mockMetrics);

    expect(params.roughness).toBe(0.72);
    expect(params.gyroidFreq).toBeGreaterThan(5.0);
    expect(params.tentacleCount).toBeGreaterThanOrEqual(3);
    expect(params.glowColor).toHaveLength(3);
    expect(params.smoothBlend).toBeGreaterThan(0.15);
  });

  it('generates injectable creature GLSL functions', () => {
    const params = mapMetricsToCreatureSDF(mockMetrics);
    const glsl = generateCreatureGLSL(params);

    expect(glsl).toContain('float mapCreature(vec3 p, float time)');
    expect(glsl).toContain('sdGyroid');
    expect(glsl).toContain('smin(');
    expect(glsl).toContain('sdLimb');
  });

  it('extracts procedural 3D BufferGeometry mesh from creature SDF parameters', () => {
    const params = mapMetricsToCreatureSDF(mockMetrics);
    const geometry = generateCreatureGeometry(params, 8); // coarse for fast test

    expect(geometry).toBeDefined();
    expect(geometry.getAttribute('position')).toBeDefined();
    expect(geometry.getAttribute('normal')).toBeDefined();
    expect(geometry.getAttribute('color')).toBeDefined();
    expect(geometry.getAttribute('position').count).toBeGreaterThan(0);
  });
});
