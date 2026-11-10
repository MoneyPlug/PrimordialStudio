export interface OrbitCameraKeyframe {
  time: number; // 0.0 to 10.0 seconds
  azimuth: number; // radians around Y
  elevation: number; // radians pitch
  distance: number; // distance from target
  target: [number, number, number];
  fov?: number;
  label?: string;
}

export const DEFAULT_KEYFRAMES: OrbitCameraKeyframe[] = [
  {
    time: 0.0,
    azimuth: 0.0,
    elevation: 0.2,
    distance: 4.2,
    target: [0, 0, 0],
    fov: 45,
    label: 'Establishing Shot',
  },
  {
    time: 3.5,
    azimuth: Math.PI * 0.65,
    elevation: 0.45,
    distance: 3.2,
    target: [0, 0.2, 0],
    fov: 40,
    label: 'Gyroid Interior Close-up',
  },
  {
    time: 7.0,
    azimuth: Math.PI * 1.4,
    elevation: -0.15,
    distance: 3.8,
    target: [0, -0.1, 0],
    fov: 50,
    label: 'Tentacle Sweeping Arc',
  },
  {
    time: 10.0,
    azimuth: Math.PI * 2.0,
    elevation: 0.2,
    distance: 4.2,
    target: [0, 0, 0],
    fov: 45,
    label: 'Orbit Complete',
  },
];

/**
 * Linear orbit interpolation between keyframes across a 10-second timeline
 */
export function interpolateOrbit(
  keyframes: OrbitCameraKeyframe[],
  time: number
): OrbitCameraKeyframe {
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (sorted.length === 0) {
    return {
      time,
      azimuth: 0,
      elevation: 0.2,
      distance: 4.0,
      target: [0, 0, 0],
      fov: 45,
    };
  }

  const clampedTime = Math.max(0, Math.min(10.0, time));

  if (clampedTime <= sorted[0].time) return { ...sorted[0], time: clampedTime };
  if (clampedTime >= sorted[sorted.length - 1].time) return { ...sorted[sorted.length - 1], time: clampedTime };

  // Find surrounding keyframes
  let prev = sorted[0];
  let next = sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (clampedTime >= sorted[i].time && clampedTime <= sorted[i + 1].time) {
      prev = sorted[i];
      next = sorted[i + 1];
      break;
    }
  }

  const duration = next.time - prev.time;
  const factor = duration > 0 ? (clampedTime - prev.time) / duration : 0;

  const azimuth = prev.azimuth + (next.azimuth - prev.azimuth) * factor;
  const elevation = prev.elevation + (next.elevation - prev.elevation) * factor;
  const distance = prev.distance + (next.distance - prev.distance) * factor;
  const target: [number, number, number] = [
    prev.target[0] + (next.target[0] - prev.target[0]) * factor,
    prev.target[1] + (next.target[1] - prev.target[1]) * factor,
    prev.target[2] + (next.target[2] - prev.target[2]) * factor,
  ];
  const fov = (prev.fov || 45) + ((next.fov || 45) - (prev.fov || 45)) * factor;

  return {
    time: Math.round(clampedTime * 100) / 100,
    azimuth,
    elevation,
    distance,
    target,
    fov,
  };
}
