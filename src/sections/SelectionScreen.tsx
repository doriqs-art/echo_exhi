'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type ModelDef = {
  id: string;
  name: string;
  path: string;
};

const MODELS: ModelDef[] = [
  { id: 'riverside',        name: 'Pancake',    path: '/models/pancake.glb' },
  { id: 'beach-day',        name: 'Old TV',     path: '/models/old_tv_usssr.glb' },
  { id: 'tokyo',            name: 'Payphone',   path: '/models/orange+payphone+3d+model.glb' },
  { id: 'first-apartment',  name: 'Mona Lisa',  path: '/models/monalisa.glb' },
  { id: 'graduation',       name: 'Disco Ball', path: '/models/disco_ball.glb' },
];

type Props = {
  onSelect: (id: string, name: string) => void;
};

type CanvasEntry = {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  group: THREE.Group | null;
  floatOffset: number;
  floatSpeed: number;
  rotSpeed: THREE.Vector3;
  hovered: boolean;
};

export default function SelectionScreen({ onSelect }: Props) {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState<boolean[]>(MODELS.map(() => false));
  const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const entriesRef = useRef<(CanvasEntry | null)[]>(MODELS.map(() => null));
  const frameRef = useRef<number>(0);

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Set up one Three.js renderer per model slot
  useEffect(() => {
    const loader = new GLTFLoader();
    const TARGET_SIZE = 2.2;

    MODELS.forEach((model, i) => {
      const container = containerRefs.current[i];
      if (!container) return;

      const W = container.clientWidth;
      const H = container.clientHeight;

      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      container.appendChild(canvas);

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
      camera.position.z = 5;

      // Lighting
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const key = new THREE.DirectionalLight(0xffffff, 1.4);
      key.position.set(4, 6, 5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xbfd0ff, 0.5);
      fill.position.set(-4, -2, 3);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0xffeedd, 0.3);
      rim.position.set(0, -4, -3);
      scene.add(rim);

      const entry: CanvasEntry = {
        canvas,
        renderer,
        scene,
        camera,
        group: null,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.6 + Math.random() * 0.3,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.004,
          0.006 + Math.random() * 0.004,
          (Math.random() - 0.5) * 0.002,
        ),
        hovered: false,
      };
      entriesRef.current[i] = entry;

      loader.load(model.path, (gltf) => {
        const obj = gltf.scene;
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const s = TARGET_SIZE / maxDim;
        obj.scale.setScalar(s);
        const center = box.getCenter(new THREE.Vector3());
        obj.position.sub(center.multiplyScalar(s));

        const group = new THREE.Group();
        group.add(obj);
        scene.add(group);
        entry.group = group;

        setLoaded((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      });

      // Mouse interaction — tilt on hover
      const onMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        if (entry.group) {
          entry.group.rotation.y = nx * 0.5;
          entry.group.rotation.x = -ny * 0.3;
        }
      };
      const onMouseEnter = () => { entry.hovered = true; };
      const onMouseLeave = () => {
        entry.hovered = false;
        // smoothly return to auto-rotation — handled in animate loop
      };

      canvas.addEventListener('mousemove', onMouseMove);
      canvas.addEventListener('mouseenter', onMouseEnter);
      canvas.addEventListener('mouseleave', onMouseLeave);
    });

    // Single shared animation loop
    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.016;

      entriesRef.current.forEach((entry) => {
        if (!entry) return;

        if (entry.group) {
          if (!entry.hovered) {
            // Idle: gentle float + slow auto-rotation
            const floatY = Math.sin(t * entry.floatSpeed + entry.floatOffset) * 0.12;
            entry.group.position.y = floatY;
            entry.group.rotation.y += entry.rotSpeed.y;
            entry.group.rotation.x += entry.rotSpeed.x;
            entry.group.rotation.z += entry.rotSpeed.z;
          } else {
            // Hovered: just float, no auto-rotation (mouse controls tilt)
            const floatY = Math.sin(t * entry.floatSpeed + entry.floatOffset) * 0.06;
            entry.group.position.y = floatY;
          }
        }

        entry.renderer.render(entry.scene, entry.camera);
      });
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      entriesRef.current.forEach((entry) => {
        if (!entry) return;
        entry.renderer.dispose();
        if (entry.canvas.parentNode) entry.canvas.parentNode.removeChild(entry.canvas);
      });
    };
  }, []);

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center"
      style={{
        background: '#131313',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Noise overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.16'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
          mixBlendMode: 'overlay',
          opacity: 0.5,
          zIndex: 1,
        }}
      />

      {/* Radial vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(30,30,35,0.0) 0%, rgba(10,10,12,0.55) 70%, rgba(0,0,0,0.75) 100%)',
          zIndex: 1,
        }}
      />

      {/* Title */}
      <h1
        style={{
          fontFamily: 'var(--font-body), sans-serif',
          fontSize: 'clamp(0.85rem, 1.6vw, 1.1rem)',
          letterSpacing: '0.18em',
          color: 'rgba(255,255,255,0.9)',
          textTransform: 'uppercase',
          marginBottom: 'clamp(2rem, 6vh, 4rem)',
          fontWeight: 400,
          position: 'relative',
          zIndex: 2,
        }}
      >
        Choose Your Echo
      </h1>

      {/* Models row */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(1rem, 3vw, 2.5rem)',
          width: '100%',
          padding: '0 clamp(1rem, 4vw, 3rem)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {MODELS.map((model, i) => (
          <div
            key={model.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
              flex: '1 1 0',
              maxWidth: '220px',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(24px)',
              transition: `opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${100 + i * 80}ms, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${100 + i * 80}ms`,
            }}
          >
            {/* Canvas container */}
            <div
              ref={(el) => { containerRefs.current[i] = el; }}
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                position: 'relative',
                cursor: 'pointer',
                opacity: loaded[i] ? 1 : 0,
                transition: 'opacity 0.6s ease',
              }}
              onClick={() => onSelect(model.id, model.name)}
            />

            {/* Remember button */}
            <button
              type="button"
              onClick={() => onSelect(model.id, model.name)}
              className="echo-cta"
              style={{
                height: '38px',
                padding: '0 22px',
                borderRadius: '999px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.35)',
                color: 'rgba(255,255,255,0.85)',
                fontFamily: 'var(--font-body), sans-serif',
                fontSize: 'clamp(0.7rem, 1vw, 0.82rem)',
                letterSpacing: '0.06em',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <span>remember {model.name.toLowerCase()}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
