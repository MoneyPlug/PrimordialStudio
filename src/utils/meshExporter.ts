import * as THREE from 'three';

/**
 * Procedural Wavefront OBJ file exporter from Three.js BufferGeometry
 */
export function exportToOBJ(geometry: THREE.BufferGeometry, objectName = 'ProceduralCreature'): string {
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const uvs = geometry.getAttribute('uv');

  if (!positions) {
    throw new Error('Geometry has no position attribute');
  }

  let output = `# Primordia Studio Procedural Mesh Exporter\n# Object: ${objectName}\n# Vertices: ${positions.count}\no ${objectName}\n`;

  // Vertices
  for (let i = 0; i < positions.count; i++) {
    output += `v ${positions.getX(i).toFixed(4)} ${positions.getY(i).toFixed(4)} ${positions.getZ(i).toFixed(4)}\n`;
  }

  // Normals
  if (normals) {
    for (let i = 0; i < normals.count; i++) {
      output += `vn ${normals.getX(i).toFixed(4)} ${normals.getY(i).toFixed(4)} ${normals.getZ(i).toFixed(4)}\n`;
    }
  }

  // UVs
  if (uvs) {
    for (let i = 0; i < uvs.count; i++) {
      output += `vt ${uvs.getX(i).toFixed(4)} ${uvs.getY(i).toFixed(4)}\n`;
    }
  }

  // Faces
  output += `s 1\n`;
  const index = geometry.getIndex();
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i) + 1;
      const b = index.getX(i + 1) + 1;
      const c = index.getX(i + 2) + 1;
      if (normals && uvs) {
        output += `f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}\n`;
      } else if (normals) {
        output += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
      } else {
        output += `f ${a} ${b} ${c}\n`;
      }
    }
  } else {
    // Non-indexed triangles
    for (let i = 1; i <= positions.count; i += 3) {
      if (normals && uvs) {
        output += `f ${i}/${i}/${i} ${i + 1}/${i + 1}/${i + 1} ${i + 2}/${i + 2}/${i + 2}\n`;
      } else if (normals) {
        output += `f ${i}//${i} ${i + 1}//${i + 1} ${i + 2}//${i + 2}\n`;
      } else {
        output += `f ${i} ${i + 1} ${i + 2}\n`;
      }
    }
  }

  return output;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa !== 'undefined') {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  for (i = 0; i < bytes.length - 2; i += 3) {
    result += base64chars[bytes[i] >> 2];
    result += base64chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    result += base64chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    result += base64chars[bytes[i + 2] & 63];
  }
  if (i < bytes.length) {
    result += base64chars[bytes[i] >> 2];
    if (i === bytes.length - 1) {
      result += base64chars[(bytes[i] & 3) << 4];
      result += '==';
    } else {
      result += base64chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
      result += base64chars[(bytes[i + 1] & 15) << 2];
      result += '=';
    }
  }
  return result;
}

/**
 * Procedural glTF 2.0 JSON asset exporter from Three.js BufferGeometry
 * Encodes vertex data in base64 data URIs for single-file zero-dependency export.
 */
export function exportToGLTF(geometry: THREE.BufferGeometry, meshName = 'ProceduralCreature'): string {
  const positions = geometry.getAttribute('position');

  if (!positions) {
    throw new Error('Geometry has no position attribute');
  }

  const vertexCount = positions.count;
  const posArray = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    posArray[i * 3] = positions.getX(i);
    posArray[i * 3 + 1] = positions.getY(i);
    posArray[i * 3 + 2] = positions.getZ(i);
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < vertexCount; i++) {
    const x = posArray[i * 3];
    const y = posArray[i * 3 + 1];
    const z = posArray[i * 3 + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }

  const posBytes = new Uint8Array(posArray.buffer);
  const base64Buffer = bytesToBase64(posBytes);

  const gltf = {
    asset: {
      version: '2.0',
      generator: 'Primordia Studio Procedural Raymarching glTF Exporter',
    },
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: meshName }],
    meshes: [
      {
        name: meshName,
        primitives: [
          {
            attributes: {
              POSITION: 0,
            },
            mode: 4, // TRIANGLES
          },
        ],
      },
    ],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: vertexCount,
        type: 'VEC3',
        max: [maxX, maxY, maxZ],
        min: [minX, minY, minZ],
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: posBytes.byteLength,
        target: 34962, // ARRAY_BUFFER
      },
    ],
    buffers: [
      {
        byteLength: posBytes.byteLength,
        uri: `data:application/octet-stream;base64,${base64Buffer}`,
      },
    ],
  };

  return JSON.stringify(gltf, null, 2);
}

/**
 * Triggers a client-side file download
 */
export function downloadFile(filename: string, content: string, mimeType = 'text/plain') {
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
