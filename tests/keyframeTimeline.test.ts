import { describe, it, expect } from 'vitest';
import {
  DEFAULT_KEYFRAMES,
  interpolateOrbit,
  type OrbitCameraKeyframe,
} from '../src/services/cinematicOrbit';

describe('10-Second Cinematic Keyframe Orbit Interpolation', () => {
  it('interpolates exact values at keyframe times', () => {
    const kf0 = interpolateOrbit(DEFAULT_KEYFRAMES, 0.0);
    expect(kf0.azimuth).toBeCloseTo(DEFAULT_KEYFRAMES[0].azimuth, 2);
    expect(kf0.elevation).toBeCloseTo(DEFAULT_KEYFRAMES[0].elevation, 2);
    expect(kf0.distance).toBeCloseTo(DEFAULT_KEYFRAMES[0].distance, 2);

    const kf10 = interpolateOrbit(DEFAULT_KEYFRAMES, 10.0);
    expect(kf10.azimuth).toBeCloseTo(DEFAULT_KEYFRAMES[DEFAULT_KEYFRAMES.length - 1].azimuth, 2);
  });

  it('performs smooth linear orbit interpolation midway between keyframes', () => {
    // Between 0.0s (azimuth 0) and 3.5s (azimuth Math.PI * 0.65)
    const mid = interpolateOrbit(DEFAULT_KEYFRAMES, 1.75);
    expect(mid.azimuth).toBeGreaterThan(0);
    expect(mid.azimuth).toBeLessThan(Math.PI * 0.65);
    expect(mid.time).toBe(1.75);
  });

  it('clamps timestamps beyond [0, 10] range safely', () => {
    const neg = interpolateOrbit(DEFAULT_KEYFRAMES, -2.5);
    expect(neg.time).toBe(0.0);

    const excess = interpolateOrbit(DEFAULT_KEYFRAMES, 15.0);
    expect(excess.time).toBe(10.0);
  });
});
