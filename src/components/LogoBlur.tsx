'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const vertexShader =  `
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader =  `
precision highp float;
varying vec2 v_uv;

uniform sampler2D u_texture;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_circleSize;
uniform float u_circleEdge;
uniform vec2 u_blur;
uniform float u_amount;
uniform vec3 u_color;

float glyph(vec2 uv) { return texture2D(u_texture, uv).a; }

void main() {
  vec2 uv = v_uv;

  vec2 m = (u_mouse * u_pixelRatio) / u_resolution;
  m.y = 1.0 - m.y;

  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = vec2((uv.x - m.x) * aspect, uv.y - m.y);
  float dist = length(p) * 2.0;
  float c = (1.0 - smoothstep(u_circleSize - u_circleEdge, u_circleSize + u_circleEdge, dist)) * u_amount;

  float sharp = glyph(uv);
  float b = 0.0;
  float wsum = 0.0;
  const int R = 6;
  for (int i = -R; i <= R; i++) {
    for (int j = -R; j <= R; j++) {
      float w = exp(-float(i * i + j * j) / 18.0);
      b += glyph(uv + vec2(float(i), float(j)) * u_blur) * w;
      wsum += w;
    }
  }
  b /= wsum;
  float bloom = clamp(b * 1.9, 0.0, 1.0);

  float a = clamp(sharp * (1.0 - 0.35 * c) + bloom * c, 0.0, 1.0);
  gl_FragColor = vec4(u_color, a);
}
`;

type LogoBlurProps = {
  text?: string;
  className?: string;
  color?: string;

  circleSize?: number;

  circleEdge?: number;

  blur?: number;

  fontMin?: number;
  fontVw?: number;
  fontMax?: number;
};

export default function LogoBlur({
  text = 'ECHO',
  className = '',
  color = '#ffffff',
  circleSize = 0.7,
  circleEdge = 0.5,
  blur = 12,
  fontMin = 56,
  fontVw = 0.12,
  fontMax = 160,
}: LogoBlurProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let active = true;
    let raf = 0;
    let lastTime = performance.now() * 0.001;

    const vMouse = new THREE.Vector2(-1e4, -1e4);
    const vMouseDamp = new THREE.Vector2(-1e4, -1e4);
    const vResolution = new THREE.Vector2();
    let targetAmount = 0;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera();
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    const gl = renderer.domElement;
    gl.style.display = 'block';
    mount.appendChild(gl);

    const textCanvas = document.createElement('canvas');
    const ctx = textCanvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(textCanvas);

    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 4;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const family =
      getComputedStyle(document.documentElement).getPropertyValue('--font-syncopate').trim() ||
      'sans-serif';

    let cssW = 10;
    let cssH = 10;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const texScale = Math.min(Math.max(window.devicePixelRatio, 2) * 1.5, 4);
      const vw = window.innerWidth;
      const fontPx = Math.max(fontMin, Math.min(vw * fontVw, fontMax));
      const tracking = -0.02 * fontPx;

      const pad = Math.ceil(blur + 8);

      const font = `700 ${fontPx}px ${family}`;
      ctx.font = font;

      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${tracking}px`;
      const upper = text.toUpperCase();
      const m = ctx.measureText(upper);
      const ascent = m.actualBoundingBoxAscent || fontPx * 0.72;
      const descent = m.actualBoundingBoxDescent || fontPx * 0.05;
      const textW = m.width;
      const textH = ascent + descent;

      cssW = Math.ceil(textW + pad * 2);
      cssH = Math.ceil(textH + pad * 2);

      textCanvas.width = Math.ceil(cssW * texScale);
      textCanvas.height = Math.ceil(cssH * texScale);

      ctx.setTransform(texScale, 0, 0, texScale, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.font = font;
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${tracking}px`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(upper, cssW / 2, pad + ascent);
      texture.needsUpdate = true;

      renderer.setPixelRatio(dpr);
      renderer.setSize(cssW, cssH);
      gl.style.width = `${cssW}px`;
      gl.style.height = `${cssH}px`;
      camera.left = -cssW / 2;
      camera.right = cssW / 2;
      camera.top = cssH / 2;
      camera.bottom = -cssH / 2;
      camera.updateProjectionMatrix();
      quad.scale.set(cssW, cssH, 1);
      vResolution.set(cssW, cssH).multiplyScalar(dpr);
      material.uniforms.u_pixelRatio.value = dpr;

      const perTap = blur / 6;
      material.uniforms.u_blur.value.set(perTap / cssW, perTap / cssH);
    };

    const geo = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_texture: { value: texture },
        u_mouse: { value: vMouseDamp },
        u_resolution: { value: vResolution },
        u_pixelRatio: { value: 1 },
        u_circleSize: { value: circleSize },
        u_circleEdge: { value: circleEdge },
        u_blur: { value: new THREE.Vector2(0.004, 0.004) },
        u_amount: { value: 0 },
        u_color: { value: new THREE.Color(color) },
      },
      transparent: true,
    });
    const quad = new THREE.Mesh(geo, material);
    scene.add(quad);

    draw();

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (active) draw();
      });
    }

    const onPointerMove = (e: PointerEvent) => {
      const rect = gl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      vMouse.set(x, y);
      const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
      targetAmount = inside ? 1 : 0;
    };
    document.addEventListener('pointermove', onPointerMove);

    const onResize = () => {
      if (active) draw();
    };
    window.addEventListener('resize', onResize);

    const update = () => {
      if (!active) return;
      raf = requestAnimationFrame(update);
      const now = performance.now() * 0.001;
      const dt = now - lastTime;
      lastTime = now;

      vMouseDamp.x = THREE.MathUtils.damp(vMouseDamp.x, vMouse.x, 8, dt);
      vMouseDamp.y = THREE.MathUtils.damp(vMouseDamp.y, vMouse.y, 8, dt);
      material.uniforms.u_amount.value = THREE.MathUtils.damp(
        material.uniforms.u_amount.value,
        targetAmount,
        6,
        dt,
      );

      renderer.render(scene, camera);
    };
    update();

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointermove', onPointerMove);
      if (mount.contains(gl)) mount.removeChild(gl);
      geo.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, [text, color, circleSize, circleEdge, blur, fontMin, fontVw, fontMax]);

  return <div ref={mountRef} aria-label={text} className={className} style={{ pointerEvents: 'none' }} />;
}
