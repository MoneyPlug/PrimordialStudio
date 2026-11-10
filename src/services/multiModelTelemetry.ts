import type { ModelInferenceMetrics } from './ollamaBridge';
import type { CreatureSDFParams } from '../sdf/creatureSdf';

export interface ModelTelemetrySlot {
  id: string;
  name: string;
  endpoint: string;
  metrics: ModelInferenceMetrics;
  isStreaming: boolean;
  history: {
    entropy: number[];
    latency: number[];
  };
}

export interface DualModelComparativeOffset {
  deltaEntropy: number;       // modelB.entropy - modelA.entropy
  deltaLatencyMs: number;     // modelB.latency - modelA.latency
  offsetBodyRadius: number;   // procedural radius scale offset
  offsetGyroidFreq: number;   // gyroid interior frequency offset
  offsetGyroidAmp: number;    // gyroid amplitude offset
  offsetTentacles: number;    // tentacle count delta
  offsetTwist: number;        // tentacle twist factor offset
  offsetRoughness: number;    // surface roughness offset
  offsetBioluminescence: number; // glow intensity offset
  spectralShift: [number, number, number]; // RGB chromatic shift vector
}

export function computeProceduralSdfOffsets(
  metricsA: ModelInferenceMetrics,
  metricsB: ModelInferenceMetrics
): DualModelComparativeOffset {
  const deltaEntropy = metricsB.entropy - metricsA.entropy;
  const deltaLatencyMs = metricsB.latencyMs - metricsA.latencyMs;

  // Normalizations
  const normDeltaEntropy = Math.max(-1.0, Math.min(1.0, deltaEntropy));
  const normDeltaLatency = Math.max(-1.0, Math.min(1.0, deltaLatencyMs / 500));

  // Weight differential comparison
  const wA = metricsA.weightsDistribution.length >= 4 ? metricsA.weightsDistribution : [0.5, 0.5, 0.5, 0.5];
  const wB = metricsB.weightsDistribution.length >= 4 ? metricsB.weightsDistribution : [0.5, 0.5, 0.5, 0.5];
  const weightDiff0 = (wB[0] ?? 0.5) - (wA[0] ?? 0.5);
  const weightDiff1 = (wB[1] ?? 0.5) - (wA[1] ?? 0.5);

  // Map entropy & latency straight into procedural SDF parameter offsets
  const offsetBodyRadius = Math.round((normDeltaLatency * 0.35 + weightDiff0 * 0.2) * 1000) / 1000;
  const offsetGyroidFreq = Math.round((normDeltaEntropy * 4.5 + weightDiff1 * 2.0) * 100) / 100;
  const offsetGyroidAmp = Math.round((normDeltaEntropy * 0.15) * 1000) / 1000;
  const offsetTentacles = Math.round(normDeltaEntropy * 4 + (normDeltaLatency > 0 ? 1 : -1));
  const offsetTwist = Math.round((normDeltaEntropy * 3.0 + normDeltaLatency * 1.5) * 100) / 100;
  const offsetRoughness = Math.round(normDeltaEntropy * 0.4 * 1000) / 1000;
  const offsetBioluminescence = Math.round((normDeltaEntropy * 0.3 + normDeltaLatency * 0.2) * 1000) / 1000;

  // Spectral shift RGB offset
  const shiftR = Math.round(Math.max(-0.5, Math.min(0.5, deltaEntropy * 0.8)) * 100) / 100;
  const shiftG = Math.round(Math.max(-0.5, Math.min(0.5, -normDeltaLatency * 0.6)) * 100) / 100;
  const shiftB = Math.round(Math.max(-0.5, Math.min(0.5, normDeltaLatency * 0.8)) * 100) / 100;

  return {
    deltaEntropy: Math.round(deltaEntropy * 1000) / 1000,
    deltaLatencyMs: Math.round(deltaLatencyMs),
    offsetBodyRadius,
    offsetGyroidFreq,
    offsetGyroidAmp,
    offsetTentacles,
    offsetTwist,
    offsetRoughness,
    offsetBioluminescence,
    spectralShift: [shiftR, shiftG, shiftB],
  };
}

export function applySdfOffsets(
  base: CreatureSDFParams,
  offsets: DualModelComparativeOffset,
  weight = 1.0
): CreatureSDFParams {
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const bodyRadius = clamp(base.bodyRadius + offsets.offsetBodyRadius * weight, 0.2, 2.5);
  const gyroidFreq = clamp(base.gyroidFreq + offsets.offsetGyroidFreq * weight, 0.5, 20.0);
  const gyroidAmp = clamp(base.gyroidAmp + offsets.offsetGyroidAmp * weight, 0.0, 0.8);
  const tentacleCount = Math.round(clamp(base.tentacleCount + offsets.offsetTentacles * weight, 2, 16));
  const tentacleTwist = clamp(base.tentacleTwist + offsets.offsetTwist * weight, 0.0, 10.0);
  const roughness = clamp(base.roughness + offsets.offsetRoughness * weight, 0.0, 1.0);
  const bioluminescence = clamp(base.bioluminescence + offsets.offsetBioluminescence * weight, 0.1, 2.0);

  const glowColor: [number, number, number] = [
    clamp(base.glowColor[0] + offsets.spectralShift[0] * weight, 0.0, 1.0),
    clamp(base.glowColor[1] + offsets.spectralShift[1] * weight, 0.0, 1.0),
    clamp(base.glowColor[2] + offsets.spectralShift[2] * weight, 0.0, 1.0),
  ];

  return {
    ...base,
    bodyRadius: Math.round(bodyRadius * 100) / 100,
    gyroidFreq: Math.round(gyroidFreq * 100) / 100,
    gyroidAmp: Math.round(gyroidAmp * 1000) / 1000,
    tentacleCount,
    tentacleTwist: Math.round(tentacleTwist * 100) / 100,
    roughness: Math.round(roughness * 100) / 100,
    bioluminescence: Math.round(bioluminescence * 100) / 100,
    glowColor: [
      Math.round(glowColor[0] * 100) / 100,
      Math.round(glowColor[1] * 100) / 100,
      Math.round(glowColor[2] * 100) / 100,
    ],
  };
}
