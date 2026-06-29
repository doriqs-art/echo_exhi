'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import LogoBlur from '@/components/LogoBlur';
import { MEMORIES, type MemoryEntry } from '@/lib/memories';

const BG = 0x131313;
const RING_RX = 3.9;
const RING_RY = 2.05;
const RING_SPEED = 0.08;

// Model path for each memory id — drop GLB files in public/models/
const MODEL_MAP: Record<string, string> = {
  tokyo:           '/models/orange+payphone+3d+model.glb',
  poppy:           '/models/dog_head_simple_model.glb',
  graduation:      '/models/disco_ball.glb',
  'beach-day':     '/models/old_tv_usssr.glb',
  'first-apartment': '/models/monalisa.glb',
  riverside:       '/models/pancake.glb',
};

// Per-model scale tuning so they all feel roughly the same size in the ring
const SCALE_MAP: Record<string, number> = {
  tokyo:             1.40,
  poppy:             1.60,
  graduation:        1.50,
  'beach-day':       1.45,
  'first-apartment': 1.35,
  riverside:         1.45,
};

// Small spinning 3D preview used inside the popup
function ModelPreview({ memoryId }: { memoryId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = canvas.clientWidth  || 420;
    const H = canvas.clientHeight || 300;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 3.5);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xbfd0ff, 0.45);
    fill.position.set(-4, -2, 2);
    scene.add(fill);

    let pivot = new THREE.Group();
    scene.add(pivot);

    const loader = new GLTFLoader();
    const modelPath = MODEL_MAP[memoryId] ?? '/models/dog_head_simple_model.glb';
    loader.load(modelPath, (gltf) => {
      const obj = gltf.scene;
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const targetScale = 1.6;
      obj.scale.setScalar(targetScale / maxDim);
      const center = box.getCenter(new THREE.Vector3());
      obj.position.sub(center.multiplyScalar(targetScale / maxDim));
      pivot.add(obj);
    });

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      pivot.rotation.y += 0.012;
      pivot.rotation.x = Math.sin(Date.now() / 3000) * 0.18;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      renderer.dispose();
    };
  }, [memoryId]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '260px' }}
    />
  );
}

export default function MemoriesScreen({
  onBack,
  onOpen,
  onLogoClick,
}: {
  onBack?: () => void;
  onOpen?: (memory: MemoryEntry) => void;
  onLogoClick?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState<MemoryEntry | null>(null);
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = opened !== null;
  }, [opened]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);

    let W = window.innerWidth;
    let H = window.innerHeight;
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 0, 7);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting — warm key, cool fill, ambient
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xbfd0ff, 0.45);
    fill.position.set(-4, -2, 2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffeedd, 0.3);
    rim.position.set(0, -3, -4);
    scene.add(rim);

    type ModelData = {
      memory: MemoryEntry;
      baseAngle: number;
      baseZ: number;
      bobAmp: number;
      bobSpeed: number;
      bobPhase: number;
      spin: THREE.Vector3;
      hoverEase: number;
      // root group that moves/scales; inner group is the loaded GLB
      root: THREE.Group;
    };

    const models: ModelData[] = [];
    // Invisible sphere hitboxes — cheap to raycast against
    const hitboxes: THREE.Mesh[] = [];
    const hitboxGeo = new THREE.SphereGeometry(0.8, 8, 8);
    const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });

    const items = MEMORIES.slice(0, 6);
    const n = items.length;
    const loader = new GLTFLoader();

    items.forEach((m, i) => {
      const baseAngle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const baseZ = ((i * 37) % 10) / 10 - 0.5;

      // Root group — this is what we move each frame
      const root = new THREE.Group();
      root.position.set(
        Math.cos(baseAngle) * RING_RX,
        Math.sin(baseAngle) * RING_RY,
        baseZ
      );
      scene.add(root);

      // Invisible hitbox sphere — raycasting only, no geometry traversal
      const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
      root.add(hitbox);
      hitboxes.push(hitbox);

      const data: ModelData = {
        memory: m,
        baseAngle,
        baseZ,
        bobAmp: 0.1 + ((i * 13) % 7) / 50,
        bobSpeed: 0.5 + ((i * 7) % 5) / 12,
        bobPhase: (i * 1.7) % (Math.PI * 2),
        spin: new THREE.Vector3(0.06 + (i % 3) * 0.02, 0.09 + (i % 4) * 0.015, 0.04),
        hoverEase: 0,
        root,
      };
      models.push(data);

      // Store memory on hitbox for raycaster lookup
      hitbox.userData.modelData = data;

      // Load GLB
      const modelPath = MODEL_MAP[m.id] ?? '/models/dog_head_simple_model.glb';
      loader.load(modelPath, (gltf) => {
        const obj = gltf.scene;

        // Auto-center and scale to unit size
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = SCALE_MAP[m.id] ?? 0.65;
        obj.scale.setScalar(targetScale / maxDim);

        // Center pivot
        const center = box.getCenter(new THREE.Vector3());
        obj.position.sub(center.multiplyScalar(targetScale / maxDim));

        // Start facing the camera (no initial tilt)
        obj.rotation.set(0, 0, 0);

        root.add(obj);
      });
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(-2, -2);
    let hoveredData: ModelData | null = null;
    const tmp = new THREE.Vector3();

    let frame = 0;
    let last = performance.now();
    const t0 = last;
    let ringRot = 0;

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = (now - t0) / 1000;

      ringRot += RING_SPEED * dt;

      // Raycast against cheap invisible spheres — not the full GLB geometry
      hoveredData = null;
      if (!openRef.current) {
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(hitboxes, false);
        if (hits.length) {
          hoveredData = hits[0].object.userData.modelData as ModelData;
        }
      }

      for (const d of models) {
        const isHover = d === hoveredData;
        d.hoverEase += ((isHover ? 1 : 0) - d.hoverEase) * Math.min(1, dt * 8);

        const a = d.baseAngle + ringRot;
        d.root.position.x = Math.cos(a) * RING_RX;
        d.root.position.y = Math.sin(a) * RING_RY + Math.sin(t * d.bobSpeed + d.bobPhase) * d.bobAmp;
        d.root.position.z = d.baseZ + d.hoverEase * 0.6;

        // Spin the GLB (children[1] — children[0] is the hitbox)
        const inner = d.root.children[1];
        if (inner) {
          const spinScale = 1 - d.hoverEase * 0.85;
          inner.rotation.x += d.spin.x * dt * spinScale;
          inner.rotation.y += d.spin.y * dt * spinScale;
          inner.rotation.z += d.spin.z * dt * spinScale;
        }

        // Scale root on hover
        const baseScl = 1 + d.hoverEase * 0.14;
        d.root.scale.setScalar(baseScl);
      }

      // Hover label
      const lbl = labelRef.current;
      if (lbl) {
        if (hoveredData) {
          hoveredData.root.getWorldPosition(tmp).project(camera);
          const sx = (tmp.x * 0.5 + 0.5) * W;
          const sy = (-tmp.y * 0.5 + 0.5) * H;
          lbl.textContent = hoveredData.memory.name;
          lbl.style.opacity = hoveredData.hoverEase.toFixed(3);
          lbl.style.transform = `translate(${sx}px, ${sy + 64}px) translate(-50%, 0)`;
        } else {
          lbl.style.opacity = '0';
        }
      }

      const wantCursor = hoveredData && !openRef.current ? 'pointer' : 'default';
      if (canvas.style.cursor !== wantCursor) canvas.style.cursor = wantCursor;

      renderer.render(scene, camera);
    };
    animate();

    let downX = 0;
    let downY = 0;
    const onPointerMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      const isTap = Math.hypot(e.clientX - downX, e.clientY - downY) < 6;
      downX = 0;
      downY = 0;
      if (!isTap || openRef.current) return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitboxes, false);
      if (hits.length) {
        setOpened((hits[0].object.userData.modelData as ModelData).memory);
      }
    };
    window.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpened(null);
    };
    window.addEventListener('keydown', onKey);

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="absolute inset-0 z-50 overflow-hidden" style={{ background: '#131313' }}>
      <canvas ref={canvasRef} className="block h-full w-full" />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, rgba(19,19,19,0) 45%), radial-gradient(ellipse at center, rgba(19,19,19,0) 60%, rgba(19,19,19,0.6) 100%)',
        }}
      />

      <div className="absolute left-1/2 top-[5%] z-20" style={{ transform: 'translateX(-50%)' }}>
        <button
          type="button"
          onClick={onLogoClick}
          aria-label="Back to start"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <LogoBlur text="ECHO" fontMin={28.8} fontVw={0.045} fontMax={57.6} blur={6} circleSize={0.7} />
        </button>
      </div>

      <p
        className="pointer-events-none absolute left-1/2 bottom-[8%] z-20 select-none text-center"
        style={{
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-body), sans-serif',
          fontSize: 'clamp(0.9rem, 1.6vw, 1.25rem)',
          letterSpacing: '0.12em',
          color: '#ffffff',
        }}
      >
        My Memories
      </p>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="echo-cta"
          style={{
            position: 'absolute',
            right: 'clamp(1.25rem, 4vw, 2.5rem)',
            bottom: 'clamp(1.25rem, 4vh, 2.5rem)',
            zIndex: 30,
            padding: '10px 22px',
            borderRadius: '999px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.35)',
            color: 'rgba(255,255,255,0.85)',
            fontFamily: 'var(--font-body), sans-serif',
            fontSize: '0.75rem',
            letterSpacing: '0.12em',
            cursor: 'pointer',
          }}
        >
          <span>Back</span>
        </button>
      )}

      <div
        ref={labelRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-30 select-none whitespace-nowrap"
        style={{
          opacity: 0,
          fontFamily: 'var(--font-body), sans-serif',
          fontSize: '0.95rem',
          letterSpacing: '0.06em',
          color: '#ffffff',
          textShadow: '0 1px 10px rgba(0,0,0,0.7)',
          willChange: 'transform, opacity',
        }}
      />

      {opened && (
        <div
          className="echo-lightbox fixed inset-0 z-70 grid place-items-center"
          style={{ background: 'rgba(8,8,8,0.62)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
          onClick={() => setOpened(null)}
        >
          <div
            className="echo-lightbox-img relative"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(92vw, 420px)',
              borderRadius: '28px',
              overflow: 'hidden',
              background: 'rgba(20,20,20,0.85)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
            }}
          >
            <div style={{ background: '#0e0e0e', borderRadius: '28px 28px 0 0', overflow: 'hidden' }}>
              <ModelPreview memoryId={opened.id} />
            </div>
            <button
              type="button"
              onClick={() => setOpened(null)}
              aria-label="Close"
              className="absolute right-3 top-3 grid place-items-center"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease',
              }}
            >
              ✕
            </button>

            <div style={{ padding: '20px 22px 24px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-body), sans-serif',
                  fontWeight: 700,
                  fontSize: '1.35rem',
                  letterSpacing: '-0.01em',
                  color: '#ffffff',
                }}
              >
                {opened.name}
              </div>
              <div
                style={{
                  marginTop: '6px',
                  display: 'flex',
                  gap: '12px',
                  fontFamily: 'var(--font-body), sans-serif',
                  fontSize: '0.7rem',
                  letterSpacing: '0.08em',
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                <span>{opened.date}</span>
                <span>·</span>
                <span>{opened.mediaCount} echoes</span>
              </div>
              <p
                style={{
                  marginTop: '14px',
                  fontFamily: 'var(--font-body), sans-serif',
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                  color: 'rgba(255,255,255,0.7)',
                  fontStyle: 'italic',
                }}
              >
                &ldquo;{opened.prompt}&rdquo;
              </p>

              <button
                type="button"
                onClick={() => {
                  const m = opened;
                  setOpened(null);
                  onOpen?.(m);
                }}
                className="echo-primary"
                style={{
                  marginTop: '20px',
                  width: '100%',
                  padding: '14px 0',
                  borderRadius: '999px',
                  background: 'transparent',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.7)',
                  fontFamily: 'var(--font-body), sans-serif',
                  fontSize: '0.8rem',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                }}
              >
                <span>Enter memory →</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
