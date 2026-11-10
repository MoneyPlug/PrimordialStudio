import { describe, it, expect } from 'vitest';
import { computeParameterOffsets } from '../src/components/MultiModelInspector';
import { mapMetricsToCreatureSDF } from '../src/sdf/creatureSdf';

describe('Multi-Model Latency & Weight Telemetry Comparison', () => {
  it('correctly calculates morphological parameter offsets between two models', () => {
    const paramsA = mapMetricsToCreatureSDF({
      prompt: 'Model A',
      tokenCount: 30,
      tokensPerSecond: 20,
      latencyMs: 80,
      entropy: 0.3,
      weightsDistribution: [0.2, 0.4, 0.3, 0.5, 0.6, 0.2, 0.5, 0.7],
      timestamp: 1000,
      status: 'connected',
      rawOutput: 'output A',
    });

    const paramsB = mapMetricsToCreatureSDF({
      prompt: 'Model B',
      tokenCount: 45,
      tokensPerSecond: 35,
      latencyMs: 140,
      entropy: 0.8,
      weightsDistribution: [0.8, 0.9, 0.7, 0.8, 0.9, 0.8, 0.7, 0.3],
      timestamp: 2000,
      status: 'connected',
      rawOutput: 'output B',
    });

    const offsets = computeParameterOffsets(paramsA, paramsB);

    expect(typeof offsets.gyroidFreq).toBe('number');
    expect(typeof offsets.tentacleTwist).toBe('number');
    expect(typeof offsets.smoothBlend).toBe('number');
    expect(typeof offsets.tentacleCount).toBe('number');

    // Higher entropy and weights should result in higher gyroid frequency and tentacle twist
    expect(offsets.gyroidFreq).toBeGreaterThan(0);
    expect(offsets.tentacleTwist).toBeGreaterThan(0);
    expect(offsets.smoothBlend).toBeGreaterThan(0);
  });
});
