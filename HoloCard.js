/**
 * HoloCard – Vanilla JS port of the official React Bits HoloCard component
 * Source: https://reactbits.dev/r/HoloCard-JS-CSS.json
 * Ported to plain JS/CSS for use in a non-React project.
 * All WebGL shaders, spring physics, and preset logic are preserved exactly.
 */

(function (global) {
  'use strict';

  // ── Constants (from official source) ─────────────────────────────────────
  const PRESETS = ['bursts', 'stars', 'shards', 'cosmos', 'rainbow', 'swirl', 'glitter', 'gold'];
  const PERSPECTIVE = 1100;
  const CARD_RATIO = 63 / 88;

  // ── Official VERTEX shader (unchanged) ───────────────────────────────────
  const VERTEX = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

  // ── Official FRAGMENT shader (unchanged) ─────────────────────────────────
  const FRAGMENT = `#version 300 es
precision highp float;

uniform sampler2D uArt;
uniform vec2 uSize;
uniform float uAspect;
uniform vec2 uTilt;
uniform vec2 uLight;
uniform float uDistance;
uniform int uPreset;
uniform float uIntensity;
uniform float uScale;
uniform float uEdge;
uniform float uFrame;
uniform float uRadius;
uniform float uGlare;
uniform vec3 uFoil;
uniform float uReady;

out vec4 outColor;

const float TAU = 6.28318530718;

struct Foil {
  float mask;
  float angle;
  float jitter;
  vec2 facet;
};

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

vec2 hash2(vec2 p) {
  return vec2(hash(p), hash(p + 17.31));
}

vec3 hue(float t) {
  t = abs(fract(t * 0.5) * 2.0 - 1.0);
  vec3 c = mix(vec3(0.1, 0.25, 1.0), vec3(0.0, 0.85, 1.0), smoothstep(0.0, 0.25, t));
  c = mix(c, vec3(0.25, 1.0, 0.2), smoothstep(0.25, 0.45, t));
  c = mix(c, vec3(1.0, 0.92, 0.05), smoothstep(0.45, 0.65, t));
  c = mix(c, vec3(1.0, 0.45, 0.05), smoothstep(0.65, 0.85, t));
  return mix(c, vec3(0.95, 0.12, 0.3), smoothstep(0.85, 1.0, t));
}

Foil bursts(vec2 p) {
  vec2 q = mat2(0.7071068, 0.7071068, -0.7071068, 0.7071068) * (p - vec2(0.5, 0.5 * uAspect)) / (0.283 / uScale);
  vec2 d = fract(q) - 0.5;
  float u = length(d) / 0.49;
  float angle = atan(d.y, d.x);
  if (u < 0.12) {
    float ring = min(floor(u / 0.045 + 0.5), 2.0);
    float count = max(1.0, ring * 6.0);
    float spot = (floor(angle / TAU * count) + 0.5) / count * TAU;
    vec2 dot = vec2(cos(spot), sin(spot)) * ring * 0.045;
    float m = smoothstep(0.024, 0.012, length(d / 0.49 - dot));
    return Foil(m, angle, 0.5, vec2(0.0));
  }
  bool inner = u < 0.66;
  float slot = angle / TAU * (inner ? 56.0 : 72.0);
  bool shifted = mod(floor(slot), 2.0) > 0.5;
  vec2 band = inner ? (shifted ? vec2(0.45, 0.61) : vec2(0.33, 0.49)) : (shifted ? vec2(0.84, 0.99) : vec2(0.7, 0.85));
  float across = abs(u - (band.x + band.y) * 0.5) / ((band.y - band.x) * 0.5);
  float along = abs(fract(slot) - 0.5) * 2.0;
  float width = inner ? 0.72 : 0.6;
  float m = smoothstep(1.0, 0.78, across) * smoothstep(width, width - 0.2, along);
  return Foil(m, angle, 0.5, vec2(0.0));
}

Foil stars(vec2 p) {
  Foil best = Foil(0.0, 0.0, 0.0, vec2(0.0));
  vec2 g = p / (0.08 / uScale);
  vec2 base = floor(g);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = base + vec2(float(i), float(j));
      float pick = hash(id + 1.3);
      vec2 d = g - (id + 0.5 + (hash2(id) - 0.5) * 0.55);
      float m = smoothstep(0.07, 0.035, length(d));
      if (pick < 0.62) {
        float size = mix(0.16, 0.5, pow(hash(id + 9.0), 1.8));
        float sector = TAU / (pick < 0.3 ? 4.0 : 5.0);
        float k = abs(fract((atan(d.y, d.x) + hash(id + 4.0) * TAU) / sector) - 0.5) * 2.0;
        float edge = size * mix(1.0, 0.36, pow(k, 0.6));
        m = smoothstep(edge, edge * 0.8, length(d));
      }
      if (m > best.mask) best = Foil(m, hash(id + 6.0) * TAU, hash(id + 8.0), (hash2(id + 2.0) - 0.5) * 0.6);
    }
  }
  return best;
}

Foil shards(vec2 p) {
  vec2 g = p * 19.0 * uScale;
  vec2 base = floor(g);
  float best = 9.0;
  float second = 9.0;
  vec2 id = base;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 cell = base + vec2(float(i), float(j));
      float d = length(cell + 0.08 + hash2(cell) * 0.84 - g);
      if (d < best) {
        second = best;
        best = d;
        id = cell;
      } else if (d < second) {
        second = d;
      }
    }
  }
  float crack = smoothstep(0.015, 0.07, second - best);
  float shine = 0.25 + 0.75 * pow(hash(id + 7.7), 2.0);
  return Foil((0.2 + 0.8 * crack) * shine, hash(id + 3.17) * TAU, hash(id + 11.73), (hash2(id + 5.0) - 0.5) * 0.5);
}

Foil cosmos(vec2 p) {
  Foil best = Foil(0.0, 0.0, 0.0, vec2(0.0));
  vec2 g = p / (0.16 / uScale);
  vec2 base = floor(g);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = base + vec2(float(i), float(j));
      vec2 d = g - (id + 0.5 + (hash2(id) - 0.5) * 0.7);
      float size = mix(0.16, 0.52, hash(id + 2.0));
      float r = length(d);
      float m = max(smoothstep(0.05, 0.0, abs(r - size)), smoothstep(size, size - 0.04, r) * 0.22);
      if (m > best.mask) best = Foil(m, hash(id + 6.0) * TAU + atan(d.y, d.x) * 0.5, hash(id + 1.0), (hash2(id + 4.0) - 0.5) * 0.5);
    }
  }
  vec2 fine = p / (0.035 / uScale);
  vec2 cell = floor(fine);
  float dots = smoothstep(0.2, 0.1, length(fine - cell - 0.5 - (hash2(cell + 9.0) - 0.5) * 0.6)) * step(0.55, hash(cell + 2.0));
  if (dots > best.mask) best = Foil(dots, hash(cell) * TAU, hash(cell + 3.0), (hash2(cell + 7.0) - 0.5) * 0.6);
  return best;
}

Foil rainbow(vec2 p) {
  return Foil(0.86 + 0.14 * hash(floor(p * 700.0 * uScale)), 0.2, 0.5, vec2(0.0));
}

Foil swirl(vec2 p) {
  vec2 d = p - vec2(0.5, 0.42 * uAspect);
  float angle = atan(d.y, d.x);
  float rays = 0.55 + 0.45 * smoothstep(0.3, 0.7, abs(fract(angle / TAU * 60.0 * uScale) - 0.5) * 2.0);
  return Foil(rays, angle, length(d), vec2(0.0));
}

Foil glitter(vec2 p) {
  vec2 g = p * 72.0 * uScale;
  vec2 cell = floor(g);
  float size = mix(0.18, 0.4, hash(cell + 3.0));
  float m = smoothstep(size, size * 0.55, length(fract(g) - 0.5 - (hash2(cell) - 0.5) * 0.5)) * step(0.25, hash(cell + 5.0));
  return Foil(m, hash(cell + 7.0) * TAU, hash(cell + 9.0), (hash2(cell + 11.0) - 0.5) * 0.9);
}

Foil gold(vec2 p) {
  Foil flake = glitter(p * 0.8);
  if (flake.mask > 0.5) return flake;
  float etch = 0.55 + 0.45 * smoothstep(0.2, 0.8, abs(fract((p.x * 0.6 + p.y) * 140.0 * uScale) - 0.5) * 2.0);
  return Foil(etch, 0.9, 0.4, vec2(0.0));
}

vec3 sparkles(vec2 p, vec3 halfway, vec2 sweep, float awake) {
  vec2 g = p * 62.0;
  vec2 cell = floor(g);
  vec2 d = fract(g) - 0.5 - (hash2(cell) - 0.5) * 0.36;
  float spin = hash(cell + 3.0) * TAU;
  d = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * d;
  vec2 a = abs(d);
  float hexagon = max(a.x * 0.866 + a.y * 0.5, a.y);
  float size = mix(0.22, 0.38, hash(cell + 2.0));
  float piece = smoothstep(size, size - 0.07, hexagon) * step(0.42, hash(cell + 4.0));
  vec3 facet = normalize(vec3((hash2(cell + 6.0) - 0.5) * 0.9, 1.0));
  float flash = pow(max(dot(facet, halfway), 0.0), 6.0);
  vec3 tint = hue(dot(sweep, vec2(cos(spin), sin(spin))) * 1.2 + dot(sweep, vec2(0.8, 0.6)) * 0.8 + hash(cell + 8.0) * 0.5);
  vec3 color = piece * tint * (0.3 + 1.6 * flash) * awake;
  vec2 fine = p * 210.0;
  vec2 speckCell = floor(fine);
  float speck = smoothstep(0.24, 0.0, length(fract(fine) - 0.5 - (hash2(speckCell) - 0.5) * 0.5)) * step(0.72, hash(speckCell + 1.0));
  float speckFlash = pow(max(dot(normalize(vec3((hash2(speckCell + 2.0) - 0.5) * 0.9, 1.0)), halfway), 0.0), 10.0);
  return color + vec3(1.2) * speck * speckFlash * (1.0 - piece);
}

void main() {
  vec2 uv = vec2(gl_FragCoord.x / uSize.x, 1.0 - gl_FragCoord.y / uSize.y);
  vec2 p = vec2(uv.x, uv.y * uAspect);
  vec2 center = vec2(0.5, 0.5 * uAspect);
  vec2 q = abs(p - center) - center + uRadius;
  float outside = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
  float pixel = 1.0 / uSize.x;
  float alpha = clamp(0.5 - outside / pixel, 0.0, 1.0);
  vec4 sampled = texture(uArt, uv);
  if (uReady > 0.5) alpha *= sampled.a;
  if (alpha <= 0.0) {
    outColor = vec4(0.0);
    return;
  }
  vec3 art = uReady > 0.5 ? pow(sampled.rgb, vec3(2.2)) : vec3(0.12);

  mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cos(uTilt.x), sin(uTilt.x), 0.0, -sin(uTilt.x), cos(uTilt.x));
  mat3 ry = mat3(cos(uTilt.y), 0.0, -sin(uTilt.y), 0.0, 1.0, 0.0, sin(uTilt.y), 0.0, cos(uTilt.y));
  mat3 turn = rx * ry;
  vec3 world = turn * vec3(p - center, 0.0);
  vec3 view = normalize(transpose(turn) * (vec3(0.0, 0.0, uDistance) - world));
  vec3 lamp = vec3((uLight - 0.5) * vec2(1.1, 1.1 * uAspect), 0.9);
  vec3 light = normalize(transpose(turn) * (lamp - world));
  vec3 halfway = normalize(light + view);
  vec2 sweep = light.xy + view.xy;
  float sheen = pow(max(halfway.z, 0.0), 10.0);
  float shine = pow(max(halfway.z, 0.0), 80.0);
  float frame = 1.0 - smoothstep(uFrame - pixel, uFrame + pixel, -outside);

  Foil f;
  if (uPreset == 0) f = bursts(p);
  else if (uPreset == 1) f = stars(p);
  else if (uPreset == 2) f = shards(p);
  else if (uPreset == 3) f = cosmos(p);
  else if (uPreset == 4) f = rainbow(p);
  else if (uPreset == 5) f = swirl(p);
  else if (uPreset == 6) f = glitter(p);
  else f = gold(p);

  vec3 metal = uPreset == 7 ? vec3(1.0, 0.74, 0.38) * dot(uFoil, vec3(0.3333)) * 1.15 : uFoil;
  vec4 look = uPreset == 0 ? vec4(0.25, 1.9, 0.12, 1.0)
    : uPreset == 1 ? vec4(0.6, 1.4, 0.3, 1.0)
    : uPreset == 2 ? vec4(0.9, 0.9, 0.6, 0.5)
    : uPreset == 3 ? vec4(0.7, 1.2, 0.35, 0.85)
    : uPreset == 4 ? vec4(0.0, 2.2, 0.0, 0.45)
    : uPreset == 5 ? vec4(1.6, 0.3, 0.0, 0.4)
    : uPreset == 6 ? vec4(0.9, 1.0, 0.6, 1.0)
    : vec4(0.3, 1.0, 0.2, 0.95);
  vec2 dir = vec2(cos(f.angle), sin(f.angle));
  float phase = dot(sweep, dir) * look.x + dot(sweep, vec2(0.8, 0.6)) * look.y + f.jitter * look.z;
  float spoke = 1.0;
  if (uPreset == 5) {
    float facing = dot(normalize(sweep + 0.0001), dir);
    phase = f.jitter * 2.4 + facing * 0.6 + length(sweep) * 0.8;
    spoke = 0.3 + 0.7 * smoothstep(0.25, 0.95, abs(facing));
  }
  vec3 tint = hue(phase);
  if (uPreset == 7) tint = mix(tint, metal, 0.65);
  float glint = pow(max(dot(normalize(vec3(f.facet, 1.0)), halfway), 0.0), 24.0) * step(0.001, length(f.facet));
  bool layered = uPreset == 2 || uPreset == 4 || uPreset == 5 || uPreset == 7;
  vec3 foil = (layered ? tint : mix(tint, vec3(1.0), 0.12)) * (1.15 + 0.3 * sheen) + metal * glint * 1.2;
  float tilted = smoothstep(0.02, 0.21, length(sin(uTilt)));
  float awake = mix(0.2, 1.0, tilted);
  float strength = uIntensity * f.mask * (1.0 - frame) * awake;
  float band = uPreset == 5 ? spoke : layered ? 0.25 + 0.75 * smoothstep(0.3, 0.95, 0.5 + 0.5 * cos(phase * TAU * 0.5 + 1.3)) : 1.0;
  vec3 color = layered
    ? 1.0 - (1.0 - art) * (1.0 - clamp(foil * look.w * band * strength, 0.0, 1.0))
    : mix(art, foil, clamp(strength * look.w, 0.0, 1.0));
  color += sparkles(p, halfway, sweep, mix(0.55, 1.0, tilted)) * uEdge * frame;
  color += uFoil * sheen * 0.12 * frame;
  color += vec3(sheen * 0.07 + shine * 0.3) * uGlare;
  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));
  outColor = vec4(color * alpha, alpha);
}
`;

  // ── Helpers (from official source) ───────────────────────────────────────
  const clampV = (v, mn, mx) => Math.min(mx, Math.max(mn, v));

  function parseColor(value) {
    const fallback = [0.78, 0.8, 0.84];
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return fallback;
    ctx.fillStyle = '#000000';
    ctx.fillStyle = value;
    const resolved = ctx.fillStyle;
    if (!resolved.startsWith('#') || resolved.length !== 7) return fallback;
    return [1, 3, 5].map(i => Math.pow(parseInt(resolved.slice(i, i + 2), 16) / 255, 2.2));
  }

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    console.error('Shader error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  // ── HoloCard class – vanilla JS equivalent of the React component ─────
  class HoloCard {
    constructor(opts = {}) {
      this.opts = {
        image: opts.image || '',
        alt: opts.alt || '',
        preset: opts.preset || 'bursts',
        intensity: opts.intensity !== undefined ? opts.intensity : 0.85,
        scale: opts.scale !== undefined ? opts.scale : 1,
        edgeSparkle: opts.edgeSparkle !== undefined ? opts.edgeSparkle : 0.8,
        frame: opts.frame !== undefined ? opts.frame : 4,
        glare: opts.glare !== undefined ? opts.glare : 0.5,
        foilColor: opts.foilColor || '#e2e6ec',
        width: opts.width || 320,
        radius: opts.radius !== undefined ? opts.radius : 14,
        tiltMax: opts.tiltMax !== undefined ? opts.tiltMax : 14,
        hoverScale: opts.hoverScale !== undefined ? opts.hoverScale : 1.04,
        idle: opts.idle !== false,
        shadow: opts.shadow !== false,
      };

      this._alive = true;
      this._raf = 0;
      this._last = 0;
      this._calm = 0;
      this._visible = true;
      this._textureReady = false;
      this._pointer = { x: 0.5, y: 0.5, inside: false };
      this._state = {
        tiltX: 0, tiltY: 0, tiltVX: 0, tiltVY: 0,
        lightX: 0.36, lightY: 0.26, lightVX: 0, lightVY: 0,
        lift: 1, liftV: 0, turn: 0, turnV: 0,
        clock: Math.random() * 40
      };
      this._reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

      this._buildDOM();
      this._initGL();
      this._bindEvents();
      this._wake();
    }

    _buildDOM() {
      const o = this.opts;
      this.root = document.createElement('div');
      this.root.className = 'holo-card';
      this.root.setAttribute('role', 'img');
      this.root.setAttribute('aria-label', o.alt || 'Holographic card');
      this.root.style.setProperty('--hc-w', `${o.width}px`);
      this.root.style.setProperty('--hc-ratio', String(CARD_RATIO));
      this.root.style.setProperty('--hc-radius', `${o.radius}px`);

      if (o.shadow) {
        this.shadowEl = document.createElement('span');
        this.shadowEl.className = 'holo-card__shadow';
        this.shadowEl.setAttribute('aria-hidden', 'true');
        this.root.appendChild(this.shadowEl);
      }

      this.rotor = document.createElement('div');
      this.rotor.className = 'holo-card__rotor';
      this.root.appendChild(this.rotor);

      this.face = document.createElement('div');
      this.face.className = 'holo-card__face holo-card__face--front';
      this.rotor.appendChild(this.face);

      if (o.image) {
        this.img = document.createElement('img');
        this.img.src = o.image;
        this.img.alt = '';
        this.img.draggable = false;
        this.face.appendChild(this.img);
      }

      this.canvas = document.createElement('canvas');
      this.face.appendChild(this.canvas);
    }

    _initGL() {
      const canvas = this.canvas;
      const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
      this._gl = gl;
      this._program = null;
      this._texture = null;
      this._buffer = null;
      this._uniforms = {};

      if (!gl) return;

      const vert = compile(gl, gl.VERTEX_SHADER, VERTEX);
      const frag = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
      if (!vert || !frag) return;

      const prog = gl.createProgram();
      gl.attachShader(prog, vert);
      gl.attachShader(prog, frag);
      gl.bindAttribLocation(prog, 0, 'position');
      gl.linkProgram(prog);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        gl.deleteProgram(prog);
        return;
      }
      this._program = prog;

      this._buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      this._texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this._texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

      for (const name of [
        'uArt', 'uSize', 'uAspect', 'uTilt', 'uLight', 'uDistance',
        'uPreset', 'uIntensity', 'uScale', 'uEdge', 'uFrame',
        'uRadius', 'uGlare', 'uFoil', 'uReady'
      ]) {
        this._uniforms[name] = gl.getUniformLocation(prog, name);
      }

      this._loadImage(this.opts.image);
      this._resizeObserver = new ResizeObserver(() => this._resize());
      this._resizeObserver.observe(canvas);
      this._visibilityObserver = new IntersectionObserver(entries => {
        this._visible = entries.some(e => e.isIntersecting);
        if (this._visible) this._wake();
      });
      this._visibilityObserver.observe(this.root);
      this._resize();
    }

    _loadImage(src) {
      this._textureReady = false;
      this.root.removeAttribute('data-ready');
      if (!src) return;
      const img = new Image();
      // Only set crossOrigin if loading from remote http/https domain to avoid local origin taint
      if (src.startsWith('http://') || src.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }
      img.decoding = 'async';
      img.onload = () => {
        if (!this._alive) return;
        const gl = this._gl;
        if (!gl || !this._program) return;
        try {
          gl.bindTexture(gl.TEXTURE_2D, this._texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          gl.generateMipmap(gl.TEXTURE_2D);
          this._textureReady = true;
          this.root.setAttribute('data-ready', '');
          this._draw();
          this._wake();
        } catch (e) {
          console.warn('HoloCard texture error, falling back to CSS img display:', e);
          // If WebGL texture loading fails (e.g. strict local file URI CORS),
          // ensure the base image remains visible with 3D tilt interaction
          this.canvas.style.opacity = '0';
          this.root.setAttribute('data-ready', '');
        }
      };
      img.onerror = () => {
        console.warn('HoloCard image failed to load:', src);
      };
      img.src = src;
    }

    _resize() {
      const canvas = this.canvas;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      this._draw();
      this._wake();
    }

    _draw() {
      const gl = this._gl;
      const prog = this._program;
      if (!gl || !prog) return;
      const canvas = this.canvas;
      const w = canvas.width, h = canvas.height;
      if (!w || !h) return;
      const o = this.opts;
      const s = this._state;

      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      const u = this._uniforms;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this._texture);
      gl.uniform1i(u.uArt, 0);
      gl.uniform2f(u.uSize, w, h);
      gl.uniform1f(u.uAspect, h / w);
      gl.uniform2f(u.uTilt, (s.tiltX * Math.PI) / 180, (s.tiltY * Math.PI) / 180);
      gl.uniform2f(u.uLight, s.lightX, s.lightY);
      gl.uniform1f(u.uDistance, PERSPECTIVE / Math.max(1, canvas.clientWidth));
      gl.uniform1i(u.uPreset, Math.max(0, PRESETS.indexOf(o.preset)));
      gl.uniform1f(u.uIntensity, clampV(o.intensity, 0, 1));
      gl.uniform1f(u.uScale, clampV(o.scale, 0.25, 4));
      gl.uniform1f(u.uEdge, clampV(o.edgeSparkle, 0, 1));
      gl.uniform1f(u.uFrame, clampV(o.frame, 0, 20) / 100);
      gl.uniform1f(u.uRadius, Math.max(0, o.radius) / Math.max(1, canvas.clientWidth));
      gl.uniform1f(u.uGlare, clampV(o.glare, 0, 1));
      const foil = parseColor(o.foilColor);
      gl.uniform3f(u.uFoil, foil[0], foil[1], foil[2]);
      gl.uniform1f(u.uReady, this._textureReady ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    _spring(value, velocity, target, stiffness, damping, dt) {
      const next = velocity + ((target - value) * stiffness - velocity * damping) * dt;
      return [value + next * dt, next];
    }

    _tick(now) {
      this._raf = 0;
      if (!this._alive) return;
      const dt = Math.min(1 / 30, Math.max(1 / 240, (now - this._last) / 1000));
      this._last = now;
      const o = this.opts;
      const s = this._state;
      const pointer = this._pointer;
      const reduce = this._reduce;

      let targetX = 0, targetY = 0, lightX = 0.36, lightY = 0.26, lift = 1;
      const drifting = o.idle && !reduce && !pointer.inside;

      if (pointer.inside && !reduce) {
        targetX = (0.5 - pointer.y) * 2 * o.tiltMax;
        targetY = (pointer.x - 0.5) * 2 * o.tiltMax;
        lightX = pointer.x;
        lightY = pointer.y;
        lift = o.hoverScale;
      } else if (drifting) {
        s.clock += dt;
        const t = s.clock;
        targetX = Math.sin(t * 0.7) * o.tiltMax * 0.28;
        targetY = Math.sin(t * 0.53 + 1.2) * o.tiltMax * 0.4;
        lightX = 0.5 + Math.sin(t * 0.41) * 0.42;
        lightY = 0.38 + Math.sin(t * 0.33 + 0.6) * 0.3;
      }

      const steps = Math.ceil(dt / (1 / 240));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        [s.tiltX, s.tiltVX] = this._spring(s.tiltX, s.tiltVX, targetX, 150, 16, h);
        [s.tiltY, s.tiltVY] = this._spring(s.tiltY, s.tiltVY, targetY, 150, 16, h);
        [s.lightX, s.lightVX] = this._spring(s.lightX, s.lightVX, lightX, 220, 30, h);
        [s.lightY, s.lightVY] = this._spring(s.lightY, s.lightVY, lightY, 220, 30, h);
        [s.lift, s.liftV] = this._spring(s.lift, s.liftV, lift, 320, 30, h);
      }

      this.rotor.style.transform =
        `perspective(${PERSPECTIVE}px) scale(${s.lift}) rotateX(${s.tiltX}deg) rotateY(${s.tiltY}deg)`;
      if (this.shadowEl) {
        this.shadowEl.style.transform =
          `translate(${-s.tiltY * 0.7}px, ${s.tiltX * 0.7}px) scale(${0.9 + (s.lift - 1) * 1.5})`;
      }

      this._draw();

      const motion =
        Math.abs(s.tiltVX) + Math.abs(s.tiltVY) +
        Math.abs(s.liftV) * 40 +
        (Math.abs(s.lightVX) + Math.abs(s.lightVY)) * 60 +
        Math.abs(s.tiltX - targetX) + Math.abs(s.tiltY - targetY);
      this._calm = motion > 0.02 ? 0 : this._calm + dt;
      if (!this._visible || (!drifting && !pointer.inside && this._calm > 0.3)) return;
      this._raf = requestAnimationFrame(ts => this._tick(ts));
    }

    _wake() {
      if (this._raf || !this._alive) return;
      this._calm = 0;
      this._last = performance.now();
      this._raf = requestAnimationFrame(ts => this._tick(ts));
    }

    _bindEvents() {
      const track = e => {
        if (e.pointerType === 'touch' && e.type === 'pointermove' && !e.buttons) return;
        const rect = this.root.getBoundingClientRect();
        this._pointer = {
          x: clampV((e.clientX - rect.left) / rect.width, 0, 1),
          y: clampV((e.clientY - rect.top) / rect.height, 0, 1),
          inside: true
        };
        this._wake();
      };
      const leave = () => {
        this._pointer = { ...this._pointer, inside: false };
        this._wake();
      };

      this.root.addEventListener('pointerenter', track);
      this.root.addEventListener('pointermove', track);
      this.root.addEventListener('pointerdown', track);
      this.root.addEventListener('pointerleave', leave);
      this.root.addEventListener('pointercancel', leave);
    }

    destroy() {
      this._alive = false;
      cancelAnimationFrame(this._raf);
      if (this._resizeObserver) this._resizeObserver.disconnect();
      if (this._visibilityObserver) this._visibilityObserver.disconnect();
      const gl = this._gl;
      if (gl) {
        if (this._texture) gl.deleteTexture(this._texture);
        if (this._buffer) gl.deleteBuffer(this._buffer);
        if (this._program) gl.deleteProgram(this._program);
      }
    }

    /** Mount into a DOM container */
    mount(container) {
      container.appendChild(this.root);
      return this;
    }
  }

  global.HoloCard = HoloCard;
})(window);

