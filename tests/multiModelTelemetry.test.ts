import { describe, it, expect } from 'vitest';
import {
  computeProceduralSdfOffsets,
  applySdfOffsets,
} from '../src/services/multiModelTelemetry';
import type { ModelInferenceMetrics } from '../src/services/ollamaBridge';
import type { CreatureSDFParams } from '../src/sdf/creatureSdf';

describe('Dual-Model Comparative Telemetry & SDF Offsets', () => {
  const modelA: ModelInferenceMetrics = {
    prompt: 'Base entity',
    tokenCount: 40,
    tokensPerSecond: 25,
    latencyMs: 80,
    entropy: 0.35,
    weightsDistribution: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.5],
    timestamp: Date.now(),
    status: 'idle',
    rawOutput: 'Output A',
  };

  const modelB: ModelInferenceMetrics = {
    prompt: 'Chaotic entity',
    tokenCount: 75,
    tokensPerSecond: 35,
    latencyMs: 160,
    entropy: 0.85,
    weightsDistribution: [0.7, 0.2, 0.9, 0.3, 0.6, 0.4, 0.5, 0.8],
    timestamp: Date.now(),
    status: 'idle',
    rawOutput: 'Output B',
  };

  it('calculates differential entropy and latency straight into procedural SDF offsets', () => {
    const offsets = computeProceduralSdfOffsets(modelA, modelB);

    expect(offsets.deltaEntropy).toBeCloseTo(0.5, 2);
    expect(offsets.deltaLatencyMs).toBe(80);
    expect(offsets.offsetGyroidFreq).toBeGreaterThan(0);
    expect(offsets.offsetTwist).toBeGreaterThan(0);
    expect(offsets.offsetRoughness).toBeGreaterThan(0);
    expect(offsets.spectralShift).toHaveLength(3);
  });

  it('correctly applies procedural SDF parameter offsets to CreatureSDFParams', () => {
    const baseParams: CreatureSDFParams = {
      scale: 1.0,
      bodyRadius: 1.0,
      gyroidFreq: 5.0,
      gyroidAmp: 0.05,
      tentacleCount: 6,
      tentacleLength: 1.2,
      tentacleTwist: 2.0,
      smoothBlend: 0.3,
      pulseSpeed: 2.0,
      pulseAmp: 0.1,
      roughness: 0.3,
      bioluminescence: 0.8,
      glowColor: [0.2, 0.5, 0.8],
    };

    const offsets = computeProceduralSdfOffsets(modelA, modelB);
    const modified = applySdfOffsets(baseParams, offsets, 1.0);

    expect(modified.bodyRadius).not.toBe(baseParams.bodyRadius);
    expect(modified.gyroidFreq).toBeGreaterThan(baseParams.gyroidFreq);
    expect(modified.roughness).toBeGreaterThan(baseParams.roughness);
    expect(modified.glowColor).toHaveLength(3);
  });
});
