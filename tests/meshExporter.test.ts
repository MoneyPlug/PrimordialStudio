import { describe, it, expect } from 'vitest';
import { generateCreatureGeometry } from '../src/sdf/marchingCubes';
import { exportToOBJ, exportToGLTF } from '../src/sdf/meshExporter';
import type { CreatureSDFParams } from '../src/sdf/creatureSdf';

describe('Native Marching Cubes Mesh Exporters (OBJ & glTF)', () => {
  const sampleParams: CreatureSDFParams = {
    scale: 1.0,
    bodyRadius: 0.9,
    gyroidFreq: 6.0,
    gyroidAmp: 0.05,
    tentacleCount: 5,
    tentacleLength: 1.1,
    tentacleTwist: 2.5,
    smoothBlend: 0.35,
    pulseSpeed: 2.2,
    pulseAmp: 0.08,
    roughness: 0.45,
    bioluminescence: 0.9,
    glowColor: [0.1, 0.7, 0.9],
  };

  it('exports BufferGeometry to valid Wavefront OBJ format', () => {
    const geometry = generateCreatureGeometry(sampleParams, 10);
    const objText = exportToOBJ(geometry, {
      name: 'creature_test',
      includeNormals: true,
      includeColors: true,
    });

    expect(objText).toContain('# Procedural Creature Raymarching Studio Native OBJ Exporter');
    expect(objText).toContain('o creature_test');
    expect(objText).toContain('v ');
    expect(objText).toContain('vn ');
    expect(objText).toContain('f ');
  });

  it('exports BufferGeometry to valid self-contained glTF 2.0 JSON format', () => {
    const geometry = generateCreatureGeometry(sampleParams, 10);
    const gltfJson = exportToGLTF(geometry, {
      name: 'creature_test',
    });

    const parsed = JSON.parse(gltfJson);
    expect(parsed.asset.version).toBe('2.0');
    expect(parsed.meshes).toBeDefined();
    expect(parsed.meshes[0].primitives[0].attributes.POSITION).toBeDefined();
    expect(parsed.buffers[0].uri).toContain('data:application/octet-stream;base64,');
  });
});
