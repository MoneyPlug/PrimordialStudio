import type { ModelInferenceMetrics } from '../services/ollamaBridge';

export interface CreatureSDFParams {
  scale: number;
  bodyRadius: number;
  gyroidFreq: number;
  gyroidAmp: number;
  tentacleCount: number;
  tentacleLength: number;
  tentacleTwist: number;
  smoothBlend: number;
  pulseSpeed: number;
  pulseAmp: number;
  roughness: number;
  bioluminescence: number;
  glowColor: [number, number, number];
}

export function mapMetricsToCreatureSDF(metrics: ModelInferenceMetrics): CreatureSDFParams {
  const w = metrics.weightsDistribution.length >= 8
    ? metrics.weightsDistribution
    : [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];

  const normLatency = Math.min(1.0, Math.max(0.0, metrics.latencyMs / 1000));
  const pulseSpeed = 1.0 + (1.0 - normLatency) * 3.5;
  const pulseAmp = 0.05 + metrics.entropy * 0.2;

  const gyroidFreq = 2.0 + metrics.entropy * 7.0 + w[0] * 3.0;
  const gyroidAmp = 0.05 + metrics.entropy * 0.35 * w[1];
  const tentacleTwist = 1.0 + metrics.entropy * 5.0 + w[2] * 2.0;

  const tentacleCount = Math.max(3, Math.min(12, Math.round(3 + w[3] * 8)));
  const tentacleLength = 0.8 + w[4] * 1.5;
  const smoothBlend = 0.15 + w[5] * 0.55;
  const bodyRadius = 0.6 + w[6] * 0.5;

  const hue = (w[7] * 0.6 + metrics.entropy * 0.4) % 1.0;
  const [r, g, b] = hslToRgb(hue, 0.85, 0.65);

  return {
    scale: 1.0,
    bodyRadius: Math.round(bodyRadius * 100) / 100,
    gyroidFreq: Math.round(gyroidFreq * 100) / 100,
    gyroidAmp: Math.round(gyroidAmp * 100) / 100,
    tentacleCount,
    tentacleLength: Math.round(tentacleLength * 100) / 100,
    tentacleTwist: Math.round(tentacleTwist * 100) / 100,
    smoothBlend: Math.round(smoothBlend * 100) / 100,
    pulseSpeed: Math.round(pulseSpeed * 100) / 100,
    pulseAmp: Math.round(pulseAmp * 100) / 100,
    roughness: Math.round(metrics.entropy * 100) / 100,
    bioluminescence: Math.round((0.5 + w[0] * 0.5) * 100) / 100,
    glowColor: [r, g, b],
  };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 100) / 100, Math.round(g * 100) / 100, Math.round(b * 100) / 100];
}

function hueToRgb(p: number, q: number, t: number) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export function generateCreatureGLSL(params: CreatureSDFParams): string {
  return `
// --- Dynamic Creature SDF Generated from Model State ---
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float sdSphere(vec3 p, float s) {
    return length(p) - s;
}

float sdGyroid(vec3 p, float scale, float thickness, float bias) {
    vec3 v = p * scale;
    return (abs(dot(sin(v), cos(v.zxy)) + bias) - thickness) / scale;
}

float sdLimb(vec3 p, float r, float h) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float mapCreature(vec3 p, float time) {
    float pulse = sin(time * ${params.pulseSpeed.toFixed(2)}) * ${params.pulseAmp.toFixed(2)};
    float core = sdSphere(p, (${params.bodyRadius.toFixed(2)} + pulse));
    float internalGyroid = sdGyroid(p, ${params.gyroidFreq.toFixed(2)}, 0.05, 0.0) * ${params.gyroidAmp.toFixed(2)};
    float d = core + internalGyroid;

    float count = ${params.tentacleCount.toFixed(1)};
    float angle = atan(p.z, p.x);
    float sector = 6.2831853 / count;
    float a = mod(angle + sector * 0.5, sector) - sector * 0.5;
    float r = length(p.xz);
    vec3 q = vec3(cos(a) * r, p.y, sin(a) * r);

    float twist = sin(q.y * ${params.tentacleTwist.toFixed(2)} + time * 2.0) * 0.25;
    q.x += twist;
    q -= vec3(${params.bodyRadius.toFixed(2)} * 0.7, -0.2, 0.0);

    float limb = sdLimb(q, 0.08, ${params.tentacleLength.toFixed(2)});
    d = smin(d, limb, ${params.smoothBlend.toFixed(2)});

    return d;
}
`;
}
