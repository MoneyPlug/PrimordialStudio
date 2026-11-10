import type { ShaderGraph, GraphNode, GraphConnection } from '../nodes/nodeTypes';

export function graphToGlsl(graph: ShaderGraph): string {
  const sphereNode = graph.nodes.find((n) => n.type === 'sdSphere');
  const gyroidNode = graph.nodes.find((n) => n.type === 'sdGyroid');
  const torusNode = graph.nodes.find((n) => n.type === 'sdTorus');
  const boxNode = graph.nodes.find((n) => n.type === 'sdBox');
  const sminNode = graph.nodes.find((n) => n.type === 'smin');
  const creatureNode = graph.nodes.find((n) => n.type === 'creatureBridge');
  const lightNode = graph.nodes.find((n) => n.type === 'lightBlinnPhong');

  const sphereRadius = sphereNode?.inputs.radius ?? 1.0;
  const gyroidScale = gyroidNode?.inputs.scale ?? 5.0;
  const gyroidThick = gyroidNode?.inputs.thickness ?? 0.05;
  const sminBlend = sminNode?.inputs.blendK ?? 0.35;

  const diffuse = lightNode?.inputs.diffuseColor || [0.2, 0.6, 1.0];
  const specPower = lightNode?.inputs.specularPower || 32.0;
  const ambient = lightNode?.inputs.ambient || 0.15;

  return `// === Procedural Raymarching Shader Generated from Visual Node Graph ===
#ifdef GL_ES
precision highp float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_entropy;
uniform float u_latency;
uniform float u_creatureBlend;
uniform vec3 u_glowColor;

// Primitive Distance Functions
float sdSphere(vec3 p, float s) {
    return length(p) - s;
}

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

float sdGyroid(vec3 p, float scale, float thickness, float bias) {
    vec3 v = p * scale;
    return (abs(dot(sin(v), cos(v.zxy)) + bias) - thickness) / scale;
}

// Operators
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

vec3 opTwist(vec3 p, float k) {
    float c = cos(k * p.y);
    float s = sin(k * p.y);
    mat2 m = mat2(c, -s, s, c);
    return vec3(m * p.xz, p.y).xzy;
}

// Main Scene Distance Field
float mapScene(vec3 p) {
    // Dynamic creature topology pulsation
    float pulse = sin(u_time * 2.0) * (0.05 + u_entropy * 0.1);

    // Sphere primitive
    float dSphere = sdSphere(p, ${sphereRadius.toFixed(3)} + pulse);

    // Gyroid internal topology
    float dGyroid = sdGyroid(p, ${gyroidScale.toFixed(2)}, ${gyroidThick.toFixed(3)}, 0.0);

    // Smooth Min combination
    float d = smin(dSphere, dGyroid * 0.35, ${sminBlend.toFixed(3)});

    ${creatureNode ? `
    // Connected Ollama Creature Bridge Morphological Limbs
    float angle = atan(p.z, p.x);
    float sector = 6.2831853 / 6.0;
    float a = mod(angle + sector * 0.5, sector) - sector * 0.5;
    float r = length(p.xz);
    vec3 q = vec3(cos(a) * r, p.y, sin(a) * r) - vec3(0.9, -0.1, 0.0);
    float dTentacle = length(max(abs(vec2(length(q.xz), q.y)) - vec2(0.08, 0.8), 0.0));
    d = smin(d, dTentacle, 0.25);
    ` : ''}

    ${torusNode ? `
    float dTorus = sdTorus(p, vec2(${torusNode.inputs.majorRadius || 1.4}, ${torusNode.inputs.minorRadius || 0.15}));
    d = smin(d, dTorus, 0.2);
    ` : ''}

    ${boxNode ? `
    float dBox = sdBox(p - vec3(0.0, -1.2, 0.0), vec3(1.5, 0.1, 1.5));
    d = min(d, dBox);
    ` : ''}

    return d;
}

// Surface Normal via Tetrahedron Technique
vec3 calcNormal(vec3 p) {
    const float eps = 0.001;
    const vec2 h = vec2(eps, -eps);
    return normalize(
        h.xyy * mapScene(p + h.xyy) +
        h.yyx * mapScene(p + h.yyx) +
        h.yxy * mapScene(p + h.yxy) +
        h.xxx * mapScene(p + h.xxx)
    );
}

// Ambient Occlusion
float calcAO(vec3 pos, vec3 nor) {
    float occ = 0.0;
    float sca = 1.0;
    for (int i = 0; i < 4; i++) {
        float h = 0.01 + 0.12 * float(i) / 3.0;
        float d = mapScene(pos + h * nor);
        occ += (h - d) * sca;
        sca *= 0.85;
    }
    return clamp(1.0 - 2.5 * occ, 0.0, 1.0);
}

// Raymarching Loop
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    // Camera setup
    float camDist = 3.8;
    float rotY = u_mouse.x * 3.14159 * 2.0 + u_time * 0.15;
    float rotX = (u_mouse.y - 0.5) * 1.5;

    vec3 ro = vec3(camDist * sin(rotY), 1.2 + rotX * 2.0, camDist * cos(rotY));
    vec3 ta = vec3(0.0, 0.0, 0.0);
    vec3 ww = normalize(ta - ro);
    vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
    vec3 vv = normalize(cross(uu, ww));
    vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.6 * ww);

    // Raymarch
    float t = 0.0;
    float tmax = 25.0;
    float d = 0.0;
    for (int i = 0; i < 96; i++) {
        vec3 p = ro + rd * t;
        d = mapScene(p);
        if (d < 0.001 || t > tmax) break;
        t += d * 0.85;
    }

    vec3 col = vec3(0.04, 0.05, 0.09); // Background

    if (t < tmax) {
        vec3 p = ro + rd * t;
        vec3 n = calcNormal(p);
        vec3 lightDir = normalize(vec3(1.5, 2.5, 2.0));
        vec3 viewDir = -rd;
        vec3 halfDir = normalize(lightDir + viewDir);

        // Blinn-Phong Shading
        float diff = max(dot(n, lightDir), 0.0);
        float spec = pow(max(dot(n, halfDir), 0.0), ${specPower.toFixed(1)});
        float ao = calcAO(p, n);
        float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);

        vec3 diffuseColor = vec3(${diffuse[0].toFixed(2)}, ${diffuse[1].toFixed(2)}, ${diffuse[2].toFixed(2)});
        diffuseColor = mix(diffuseColor, u_glowColor, 0.45);

        col = diffuseColor * (${ambient.toFixed(2)} + diff * 0.85) * ao;
        col += vec3(1.0) * spec * 0.6;
        col += u_glowColor * fresnel * 0.8;
    }

    // Gamma correction
    col = pow(col, vec3(1.0 / 2.2));
    fragColor = vec4(col, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;
}

export function glslToGraph(glsl: string): ShaderGraph {
  const nodes: GraphNode[] = [];
  const connections: GraphConnection[] = [];

  const sphereMatch = glsl.match(/sdSphere\(\s*p\s*,\s*([\d\.]+)/);
  const sphereRadius = sphereMatch ? parseFloat(sphereMatch[1]) : 1.0;
  nodes.push({
    id: 'sphere_1',
    type: 'sdSphere',
    title: 'Sphere SDF',
    x: 80,
    y: 80,
    inputs: { radius: sphereRadius },
  });

  const gyroidMatch = glsl.match(/sdGyroid\(\s*p\s*,\s*([\d\.]+)\s*,\s*([\d\.]+)/);
  const gyroidScale = gyroidMatch ? parseFloat(gyroidMatch[1]) : 5.0;
  const gyroidThick = gyroidMatch ? parseFloat(gyroidMatch[2]) : 0.05;
  nodes.push({
    id: 'gyroid_1',
    type: 'sdGyroid',
    title: 'Gyroid SDF',
    x: 80,
    y: 240,
    inputs: { scale: gyroidScale, thickness: gyroidThick },
  });

  const sminMatch = glsl.match(/smin\(dSphere,\s*dGyroid[^,]*,\s*([\d\.]+)\)/);
  const sminBlend = sminMatch ? parseFloat(sminMatch[1]) : 0.35;
  nodes.push({
    id: 'blend_1',
    type: 'smin',
    title: 'Smooth Min (smin)',
    x: 340,
    y: 140,
    inputs: { blendK: sminBlend },
  });

  const hasCreature = glsl.includes('dTentacle') || glsl.includes('Ollama Creature');
  if (hasCreature) {
    nodes.push({
      id: 'creature_bridge',
      type: 'creatureBridge',
      title: 'Ollama Creature Node',
      x: 80,
      y: 400,
      inputs: { active: true },
    });
  }

  const specMatch = glsl.match(/pow\(max\(dot\(n,\s*halfDir\),\s*0\.0\),\s*([\d\.]+)\)/);
  const specPower = specMatch ? parseFloat(specMatch[1]) : 32.0;

  const diffMatch = glsl.match(/vec3\(([\d\.]+),\s*([\d\.]+),\s*([\d\.]+)\)/);
  const diffuseColor = diffMatch
    ? [parseFloat(diffMatch[1]), parseFloat(diffMatch[2]), parseFloat(diffMatch[3])]
    : [0.2, 0.6, 1.0];

  nodes.push({
    id: 'lighting_1',
    type: 'lightBlinnPhong',
    title: 'Blinn-Phong Lighting',
    x: 580,
    y: 180,
    inputs: {
      diffuseColor,
      specularPower: specPower,
      ambient: 0.15,
    },
  });

  nodes.push({
    id: 'output_1',
    type: 'outputShader',
    title: 'Raymarching Master Output',
    x: 840,
    y: 180,
    inputs: { maxSteps: 96, maxDist: 25.0 },
  });

  connections.push(
    { id: 'c1', fromNode: 'sphere_1', fromPort: 'dist', toNode: 'blend_1', toPort: 'distA' },
    { id: 'c2', fromNode: 'gyroid_1', fromPort: 'dist', toNode: 'blend_1', toPort: 'distB' },
    { id: 'c3', fromNode: 'blend_1', fromPort: 'outDist', toNode: 'lighting_1', toPort: 'sceneSDF' },
    { id: 'c4', fromNode: 'lighting_1', fromPort: 'fragColor', toNode: 'output_1', toPort: 'color' }
  );

  return { nodes, connections };
}
