import type * as THREE from 'three';

export interface MeshExportOptions {
  name?: string;
  precision?: number;
  includeNormals?: boolean;
  includeColors?: boolean;
}

/**
 * Native procedural OBJ exporter for Marching Cubes BufferGeometry
 */
export function exportToOBJ(geometry: THREE.BufferGeometry, options: MeshExportOptions = {}): string {
  const { name = 'procedural_creature', precision = 4, includeNormals = true } = options;

  const positions = geometry.getAttribute('position');
  if (!positions || positions.count === 0) {
    throw new Error('Geometry contains no vertex positions');
  }

  const normals = geometry.getAttribute('normal');
  const colors = geometry.getAttribute('color');

  const lines: string[] = [];
  lines.push(`# Procedural Creature Raymarching Studio Native OBJ Exporter`);
  lines.push(`# Object: ${name}`);
  lines.push(`# Vertices: ${positions.count}`);
  lines.push(`o ${name}`);

  // Write Vertices
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i).toFixed(precision);
    const y = positions.getY(i).toFixed(precision);
    const z = positions.getZ(i).toFixed(precision);
    if (colors && options.includeColors) {
      const r = colors.getX(i).toFixed(precision);
      const g = colors.getY(i).toFixed(precision);
      const b = colors.getZ(i).toFixed(precision);
      lines.push(`v ${x} ${y} ${z} ${r} ${g} ${b}`);
    } else {
      lines.push(`v ${x} ${y} ${z}`);
    }
  }

  // Write Vertex Normals
  if (normals && includeNormals) {
    for (let i = 0; i < normals.count; i++) {
      const nx = normals.getX(i).toFixed(precision);
      const ny = normals.getY(i).toFixed(precision);
      const nz = normals.getZ(i).toFixed(precision);
      lines.push(`vn ${nx} ${ny} ${nz}`);
    }
  }

  lines.push(`s 1`);

  // Write Faces (triangles)
  const index = geometry.getIndex();
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i) + 1;
      const b = index.getX(i + 1) + 1;
      const c = index.getX(i + 2) + 1;
      if (normals && includeNormals) {
        lines.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
      } else {
        lines.push(`f ${a} ${b} ${c}`);
      }
    }
  } else {
    for (let i = 1; i <= positions.count; i += 3) {
      if (normals && includeNormals) {
        lines.push(`f ${i}//${i} ${i + 1}//${i + 1} ${i + 2}//${i + 2}`);
      } else {
        lines.push(`f ${i} ${i + 1} ${i + 2}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Native glTF 2.0 JSON format exporter with self-contained embedded buffer
 */
export function exportToGLTF(geometry: THREE.BufferGeometry, options: MeshExportOptions = {}): string {
  const { name = 'procedural_creature' } = options;

  const posAttr = geometry.getAttribute('position');
  if (!posAttr || posAttr.count === 0) {
    throw new Error('Geometry contains no vertex positions');
  }

  const normAttr = geometry.getAttribute('normal');
  const colAttr = geometry.getAttribute('color');

  const vertexCount = posAttr.count;

  // Flatten Float32 arrays
  const posArray = new Float32Array(posAttr.array);
  const normArray = normAttr ? new Float32Array(normAttr.array) : new Float32Array(vertexCount * 3);
  const colArray = colAttr ? new Float32Array(colAttr.array) : null;

  // Compute bounding box for glTF min/max
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < vertexCount; i++) {
    const x = posArray[i * 3];
    const y = posArray[i * 3 + 1];
    const z = posArray[i * 3 + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  // Pack binary buffers into single Uint8Array
  const posByteLength = posArray.byteLength;
  const normByteLength = normArray.byteLength;
  const colByteLength = colArray ? colArray.byteLength : 0;
  const totalByteLength = posByteLength + normByteLength + colByteLength;

  const combinedBuffer = new Uint8Array(totalByteLength);
  combinedBuffer.set(new Uint8Array(posArray.buffer, posArray.byteOffset, posByteLength), 0);
  combinedBuffer.set(new Uint8Array(normArray.buffer, normArray.byteOffset, normByteLength), posByteLength);
  if (colArray) {
    combinedBuffer.set(new Uint8Array(colArray.buffer, colArray.byteOffset, colByteLength), posByteLength + normByteLength);
  }

  // Base64 encode the combined buffer
  let binaryString = '';
  const bytes = combinedBuffer;
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  const base64Buffer = btoa(binaryString);
  const dataUri = `data:application/octet-stream;base64,${base64Buffer}`;

  const bufferViews = [
    {
      buffer: 0,
      byteOffset: 0,
      byteLength: posByteLength,
      target: 34962, // ARRAY_BUFFER
    },
    {
      buffer: 0,
      byteOffset: posByteLength,
      byteLength: normByteLength,
      target: 34962,
    },
  ];

  const accessors = [
    {
      bufferView: 0,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: vertexCount,
      type: 'VEC3',
      max: [maxX, maxY, maxZ],
      min: [minX, minY, minZ],
    },
    {
      bufferView: 1,
      byteOffset: 0,
      componentType: 5126,
      count: vertexCount,
      type: 'VEC3',
    },
  ];

  const attributes: Record<string, number> = {
    POSITION: 0,
    NORMAL: 1,
  };

  if (colArray) {
    bufferViews.push({
      buffer: 0,
      byteOffset: posByteLength + normByteLength,
      byteLength: colByteLength,
      target: 34962,
    });
    accessors.push({
      bufferView: 2,
      byteOffset: 0,
      componentType: 5126,
      count: vertexCount,
      type: 'VEC3',
    });
    attributes.COLOR_0 = 2;
  }

  const gltfObject = {
    asset: {
      version: '2.0',
      generator: 'Procedural Creature Raymarching Studio Native Exporter',
    },
    scene: 0,
    scenes: [
      {
        name: `${name}_Scene`,
        nodes: [0],
      },
    ],
    nodes: [
      {
        name,
        mesh: 0,
      },
    ],
    meshes: [
      {
        name: `${name}_Mesh`,
        primitives: [
          {
            attributes,
            mode: 4, // TRIANGLES
          },
        ],
      },
    ],
    buffers: [
      {
        uri: dataUri,
        byteLength: totalByteLength,
      },
    ],
    bufferViews,
    accessors,
  };

  return JSON.stringify(gltfObject, null, 2);
}

/**
 * Client-side browser download helper
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
