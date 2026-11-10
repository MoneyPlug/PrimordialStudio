import * as THREE from 'three';
import type { CreatureSDFParams } from './creatureSdf';

export function generateCreatureGeometry(params: CreatureSDFParams, resolution = 24): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];

  const size = 2.5;
  const step = (size * 2) / resolution;
  const half = size;

  function evalSdf(x: number, y: number, z: number): number {
    const pLen = Math.sqrt(x * x + y * y + z * z);
    const body = pLen - params.bodyRadius;

    const r = Math.sqrt(x * x + z * z);
    const angle = Math.atan2(z, x);
    const sector = (2 * Math.PI) / params.tentacleCount;
    const a = ((angle % sector) + sector) % sector - sector / 2;
    const qx = Math.cos(a) * r - params.bodyRadius * 0.7;
    const qy = y + 0.2;
    const qz = Math.sin(a) * r;

    const limbDist = Math.sqrt(qx * qx + qz * qz) - 0.08;
    const limb = Math.max(limbDist, Math.abs(qy) - params.tentacleLength);

    const k = params.smoothBlend;
    const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (limb - body) / k));
    return (limb * (1 - h) + body * h) - k * h * (1 - h);
  }

  for (let xi = 0; xi < resolution; xi++) {
    for (let yi = 0; yi < resolution; yi++) {
      for (let zi = 0; zi < resolution; zi++) {
        const x = -half + xi * step;
        const y = -half + yi * step;
        const z = -half + zi * step;

        const val = evalSdf(x, y, z);
        if (Math.abs(val) < step * 0.75) {
          const eps = 0.01;
          const nx = evalSdf(x + eps, y, z) - evalSdf(x - eps, y, z);
          const ny = evalSdf(x, y + eps, z) - evalSdf(x, y - eps, z);
          const nz = evalSdf(x, y, z + eps) - evalSdf(x, y, z - eps);
          const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

          const halfStep = step * 0.45;
          positions.push(
            x - halfStep, y - halfStep, z,
            x + halfStep, y - halfStep, z,
            x + halfStep, y + halfStep, z,

            x - halfStep, y - halfStep, z,
            x + halfStep, y + halfStep, z,
            x - halfStep, y + halfStep, z
          );

          const norm = [nx / len, ny / len, nz / len];
          for (let i = 0; i < 6; i++) {
            normals.push(norm[0], norm[1], norm[2]);
            uvs.push((x + half) / (2 * half), (y + half) / (2 * half));
            colors.push(params.glowColor[0], params.glowColor[1], params.glowColor[2]);
          }
        }
      }
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return geometry;
}
