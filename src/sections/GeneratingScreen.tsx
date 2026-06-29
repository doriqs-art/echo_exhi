'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import LogoBlur from '@/components/LogoBlur';

const BODY_FONT = 'var(--font-body), sans-serif';

const DEFAULT_BEATS: Array<{ title: string; sub: string }> = [
  { title: 'Creating your memory…', sub: 'THIS WILL TAKE A MINUTE. COME BACK LATER' },
  { title: 'Gathering your echoes…', sub: 'THIS WILL TAKE A MINUTE. COME BACK LATER' },
  { title: 'Your memory is complete', sub: 'YOUR ECHOES ARE READY' },
];
const beatFor = (p: number) => (p < 0.4 ? 0 : p < 0.8 ? 1 : 2);

const MODEL = '/models/dog_head_simple_model.glb';
const MODEL_SIZE = 1.2;

const SHARD_COUNT = 64;
const SHARD_RADIUS = 2.2;
const SHARD_W = 0.46;
const SHARD_H = 0.28;
const SHARD_OPACITY = 0.6;

const TRACK = 285;
const GEN_BLUR = 18;

export default function GeneratingScreen({
  onDone,
  durationMs = 9000,
  beats = DEFAULT_BEATS,
  showModel = true,
}: {
  onDone?: () => void;
  durationMs?: number;
  beats?: Array<{ title: string; sub: string }>;
  showModel?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shardCanvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const titleRef = useRef<HTMLParagraphElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const shardCanvas = shardCanvasRef.current;
    if (!shardCanvas) return;

    const modelScene = new THREE.Scene();
    const shardScene = new THREE.Scene();
    let W = shardCanvas.clientWidth || 410;
    let H = shardCanvas.clientHeight || 410;
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 9);

    const disposables: Array<{ dispose: () => void }> = [];

    // — Model renderer + scene (only when showModel) —
    let renderer: THREE.WebGLRenderer | null = null;
    let group: THREE.Group | null = null;

    if (showModel) {
      const canvas = canvasRef.current;
      if (canvas) {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W, H, false);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;

        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        const envScene = new THREE.Scene();
        envScene.background = new THREE.Color(0x131313);
        const eLight1 = new THREE.PointLight(0xe85d35, 4, 20);
        eLight1.position.set(5, 3, 5);
        envScene.add(eLight1);
        const eLight2 = new THREE.PointLight(0x4488ff, 3, 20);
        eLight2.position.set(-5, -2, -5);
        envScene.add(eLight2);
        const eLight3 = new THREE.PointLight(0xffffff, 2, 20);
        eLight3.position.set(0, 6, 0);
        envScene.add(eLight3);
        const envMap = pmrem.fromScene(new RoomEnvironment()).texture;
        modelScene.environment = envMap;
        modelScene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
        keyLight.position.set(3, 5, 4);
        modelScene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0xe85d35, 0.9);
        rimLight.position.set(-4, 1, -3);
        modelScene.add(rimLight);
        disposables.push({ dispose: () => pmrem.dispose() });
        disposables.push({ dispose: () => envMap.dispose() });

        group = new THREE.Group();
        modelScene.add(group);

        const loader = new GLTFLoader();
        loader.load(
          MODEL,
          (gltf) => {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const ctr = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            const s = MODEL_SIZE / maxDim;
            model.scale.setScalar(s);
            model.position.set(-ctr.x * s, -ctr.y * s, -ctr.z * s);
            model.traverse((obj) => {
              const mesh = obj as THREE.Mesh;
              if (mesh.isMesh) {
                disposables.push(mesh.geometry);
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                mats.forEach((mat) => {
                  if (mat) {
                    disposables.push(mat);
                    const newMat = new THREE.MeshStandardMaterial({
                      color: 0xcccccc,
                      metalness: 1.0,
                      roughness: 0.08,
                      envMap,
                      envMapIntensity: 2.5,
                    });
                    mesh.material = newMat;
                    disposables.push(newMat);
                  }
                });
              }
            });
            group!.add(model);
          },
          undefined,
          (err) => console.error('Failed to load generating model', err),
        );
      }
    }

    // — Shard renderer —
    const shardRenderer = new THREE.WebGLRenderer({ canvas: shardCanvas, antialias: true, alpha: true });
    shardRenderer.setClearColor(0x000000, 0);
    shardRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    shardRenderer.setSize(W, H, false);

    const shardGroup = new THREE.Group();
    shardGroup.rotation.x = 0.35;
    shardScene.add(shardGroup);
    const shardGeos = [
      new THREE.PlaneGeometry(0.34, 0.34),
      new THREE.PlaneGeometry(SHARD_W, SHARD_H),
      new THREE.CircleGeometry(0.2, 32),
    ];
    const shardMat = new THREE.MeshBasicMaterial({
      color: 0xeaeaf2,
      transparent: true,
      opacity: SHARD_OPACITY,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    disposables.push(...shardGeos, shardMat);
    const shards: THREE.Mesh[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < SHARD_COUNT; i++) {
      const t = SHARD_COUNT <= 1 ? 0.5 : i / (SHARD_COUNT - 1);
      const y = 1 - t * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i;
      const shard = new THREE.Mesh(shardGeos[i % shardGeos.length], shardMat);
      shard.position.set(Math.cos(th) * r * SHARD_RADIUS, y * SHARD_RADIUS, Math.sin(th) * r * SHARD_RADIUS);
      shard.lookAt(0, 0, 0);
      shard.scale.setScalar(0);
      shard.userData.revealAt = i / SHARD_COUNT;
      shardGroup.add(shard);
      shards.push(shard);
    }

    // — Animate —
    let frame = 0;
    const start = performance.now();
    let last = start;
    let lastBeat = -1;
    let done = false;

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const p = Math.min(1, (now - start) / durationMs);

      if (group) group.rotation.y += dt * 0.6;
      shardGroup.rotation.y += dt * 0.3;

      for (const s of shards) {
        const target = p >= (s.userData.revealAt as number) ? 1 : 0;
        const cur = s.scale.x + (target - s.scale.x) * Math.min(1, dt * 9);
        s.scale.setScalar(cur);
      }

      const op = Math.min(1, p / 0.1).toFixed(3);
      const blur = GEN_BLUR * (1 - Math.min(1, p / 0.95));
      const blurStr = blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : 'none';
      const modelCanvas = canvasRef.current;
      if (modelCanvas) {
        modelCanvas.style.opacity = op;
        modelCanvas.style.filter = blurStr;
      }
      shardCanvas.style.opacity = op;
      shardCanvas.style.filter = blurStr;

      if (barRef.current) barRef.current.style.width = `${(p * 100).toFixed(2)}%`;

      const idx = beatFor(p);
      if (idx !== lastBeat) {
        lastBeat = idx;
        const apply = (el: HTMLElement | null, text: string) => {
          if (!el) return;
          el.textContent = text;
          el.style.animation = 'none';
          void el.offsetWidth;
          el.style.animation = '';
        };
        apply(titleRef.current, beats[idx].title);
        apply(subRef.current, beats[idx].sub);
      }

      if (p >= 1 && !done) {
        done = true;
        onDoneRef.current?.();
      }

      if (renderer) renderer.render(modelScene, camera);
      shardRenderer.render(shardScene, camera);
    };
    animate();

    const onResize = () => {
      W = shardCanvas.clientWidth || 410;
      H = shardCanvas.clientHeight || 410;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      if (renderer) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W, H, false);
      }
      shardRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      shardRenderer.setSize(W, H, false);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      for (const d of disposables) d.dispose();
      if (renderer) renderer.dispose();
      shardRenderer.dispose();
    };
  }, [durationMs, showModel]);

  return (
    <div
      className="absolute inset-0 z-50 overflow-hidden"
      style={{ background: 'rgba(19,19,19,0.35)' }}
    >
      {showModel && (
        <canvas
          ref={canvasRef}
          aria-hidden
          className="pointer-events-none absolute left-1/2"
          style={{
            top: '38%',
            width: 'min(480px, 70vw)',
            height: 'min(480px, 70vw)',
            transform: 'translate(-50%, -50%)',
            opacity: 0,
            zIndex: 20,
          }}
        />
      )}

      <canvas
        ref={shardCanvasRef}
        aria-hidden
        className="pointer-events-none absolute left-1/2"
        style={{
          top: '38%',
          width: 'min(480px, 70vw)',
          height: 'min(480px, 70vw)',
          transform: 'translate(-50%, -50%)',
          opacity: 0,
          zIndex: 21,
        }}
      />

      <div className="absolute left-1/2 top-[5%] z-40" style={{ transform: 'translateX(-50%)' }}>
        <LogoBlur text="ECHO" fontMin={28.8} fontVw={0.045} fontMax={57.6} blur={6} circleSize={0.7} />
      </div>

      <div
        className="absolute left-1/2 z-40 flex flex-col items-center px-6"
        style={{ top: '62%', transform: 'translateX(-50%)', width: 'min(640px, 90vw)' }}
      >
        <p
          ref={titleRef}
          className="echo-rise select-none text-center"
          style={{
            fontFamily: BODY_FONT,
            fontSize: 'clamp(1.05rem, 1.85vw, 25px)',
            lineHeight: 1.45,
            color: 'rgba(255,255,255,0.72)',
            margin: 0,
          }}
        >
          {beats[0].title}
        </p>
        <p
          ref={subRef}
          className="echo-rise select-none text-center"
          style={{
            marginTop: '10px',
            fontFamily: 'var(--font-body), sans-serif',
            fontSize: '14px',
            lineHeight: '17px',
            letterSpacing: '0.13em',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          {beats[0].sub}
        </p>

        <div
          style={{
            position: 'relative',
            width: `min(${TRACK}px, 80vw)`,
            height: '2px',
            marginTop: 'clamp(2rem, 5vh, 3.5rem)',
            background: 'rgba(255,255,255,0.14)',
          }}
        >
          <div
            ref={barRef}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: '0%',
              background: 'rgba(255,255,255,0.8)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
