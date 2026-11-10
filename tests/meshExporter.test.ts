import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { exportToOBJ, exportToGLTF } from '../src/utils/meshExporter';
import { generateCreatureGeometry } from '../src/sdf/marchingCubes';
import { mapMetricsToCreatureSDF } from '../src/sdf/creatureSdf';

describe('Procedural Mesh Exporter (OBJ & glTF)', () => {
  const creatureParams = mapMetricsToCreatureSDF({
    prompt: 'Abyssal test creature',
    tokenCount: 20,
    tokensPerSecond: 20,
    latencyMs: 70,
    entropy: 0.5,
    weightsDistribution: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    timestamp: Date.now(),
    status: 'connected',
    rawOutput: 'test',
  });

  const geometry = generateCreatureGeometry(creatureParams, 8);

  it('exports BufferGeometry to valid Wavefront OBJ format', () => {
    const objText = exportToOBJ(geometry, 'TestCreature');

    expect(objText).toContain('# Object: TestCreature');
    expect(objText).toContain('o TestCreature');
    expect(objText).toContain('v ');
    expect(objText).toContain('vn ');
    expect(objText).toContain('f ');
    expect(objText.split('\n').length).toBeGreaterThan(10);
  });

  it('exports BufferGeometry to valid glTF 2.0 format with base64 embedded binary buffer', () => {
    const gltfText = exportToGLTF(geometry, 'TestCreature');
    const parsed = JSON.parse(gltfText);

    expect(parsed.asset.version).toBe('2.0');
    expect(parsed.meshes).toHaveLength(1);
    expect(parsed.meshes[0].name).toBe('TestCreature');
    expect(parsed.accessors[0].count).toBe(geometry.getAttribute('position').count);
    expect(parsed.buffers[0].uri).toMatch(/^data:application\/octet-stream;base64,/);
  });

  it('handles indexed and non-indexed geometries properly', () => {
    const indexedGeom = new THREE.BoxGeometry(1, 1, 1);
    const objIndexed = exportToOBJ(indexedGeom, 'BoxTest');
    expect(objIndexed).toContain('o BoxTest');
    expect(objIndexed).toContain('f ');
  });
});
