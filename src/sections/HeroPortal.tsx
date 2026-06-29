'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import MemoryScreen from '@/sections/MemoryScreen';
import GeneratingScreen from '@/sections/GeneratingScreen';
import GalleryScreen from '@/sections/GalleryScreen';
import MemoriesScreen from '@/sections/MemoriesScreen';
import SelectionScreen from '@/sections/SelectionScreen';
import MemoriesRing from '@/components/MemoriesRing';
import LogoBlur from '@/components/LogoBlur';
import SoundToggle from '@/components/SoundToggle';
import * as sound from '@/lib/sound';

type Phase = 'intro' | 'warp' | 'selection' | 'prompt' | 'loading' | 'memory' | 'generating' | 'gallery' | 'memories';
type Memory = { name: string; photoUrl: string | null; id?: string };

const BOOST_MS = 1200;
const BG = 0x131313;
const SHAPE_SPEED = 2.4;
const MODEL_SPEED = 1.8; // visible, atmospheric drift

// Unique GLBs — each loaded once, then cloned for extra instances
const BG_MODEL_UNIQUE = [
  '/models/orange+payphone+3d+model.glb',
  '/models/disco_ball.glb',
  '/models/old_tv_usssr.glb',
  '/models/monalisa.glb',
  '/models/pancake.glb',
];

// Sequence of 10 — no two identical adjacent, all 5 appear twice
const BG_MODEL_PATHS = [
  '/models/orange+payphone+3d+model.glb',
  '/models/disco_ball.glb',
  '/models/old_tv_usssr.glb',
  '/models/monalisa.glb',
  '/models/pancake.glb',
  '/models/disco_ball.glb',
  '/models/orange+payphone+3d+model.glb',
  '/models/pancake.glb',
  '/models/old_tv_usssr.glb',
  '/models/monalisa.glb',
];

const DEMO_PROMPT =
  "Create a memory of my dog who passed away. She was a mixed breed — brown and fluffy, a Belgian Shepherd and Corgi mix. She had a purple ball she loved. One day we ran through the trees in the park and lost the ball. We spent the whole day walking through the park searching for it. In the end, we found it under a picnic table where we had been sitting all along.";

export default function HeroPortal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [promptText, setPromptText] = useState('');
  const [memory, setMemory] = useState<Memory | null>(null);
  const [revealed, setRevealed] = useState(false);
  const phaseRef = useRef<Phase>('intro');
  const warpRef = useRef(false);
  const warpTimeout = useRef<number | null>(null);
  const loadTimeout = useRef<number | null>(null);
  const genTimeouts = useRef<number[]>([]);
  const typingRef = useRef(false);
  const typingTimer = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Trigger intro reveal sequence shortly after mount
  useEffect(() => {
    const t = window.setTimeout(() => setRevealed(true), 120);
    return () => clearTimeout(t);
  }, []);

  const begin = () => {
    if (phaseRef.current !== 'intro') return;
    sound.whoosh(BOOST_MS);
    warpRef.current = true;
    setPhase('warp');
    warpTimeout.current = window.setTimeout(() => {
      warpRef.current = false;
      setPhase('selection');
    }, BOOST_MS);
  };

  const submitPrompt = () => {
    if (phaseRef.current !== 'prompt' || !promptText.trim()) return;
    setPhase('loading');
    loadTimeout.current = window.setTimeout(() => setPhase('memory'), 9000);
  };

  const startGenerating = (data: Memory) => {
    setMemory(data);
    setPhase('generating');
  };

  const reset = () => {
    if (warpTimeout.current) clearTimeout(warpTimeout.current);
    if (loadTimeout.current) clearTimeout(loadTimeout.current);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    genTimeouts.current.forEach(clearTimeout);
    genTimeouts.current = [];
    typingRef.current = false;
    setPromptText('');
    setShowCta(false);
    setPhase('intro');
  };

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(44, el.scrollHeight)}px`;
  };

  const handlePromptFocus = () => {
    // Only trigger once — if already typed or typing, do nothing
    if (promptText !== '' || typingRef.current) return;
    typingRef.current = true;
    let i = 0;
    const tick = () => {
      i++;
      setPromptText(DEMO_PROMPT.slice(0, i));
      // grow the textarea as characters appear
      window.setTimeout(autoGrow, 0);
      if (i < DEMO_PROMPT.length) {
        typingTimer.current = window.setTimeout(tick, 18);
      } else {
        typingRef.current = false;
        window.setTimeout(() => setShowCta(true), 600);
      }
    };
    tick();
  };

  // Three.js: floating shapes + drifting 3D models
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);

    // Lighting for the 3D models
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xbfd0ff, 0.4);
    fillLight.position.set(-4, -2, 2);
    scene.add(fillLight);

    let W = window.innerWidth;
    let H = window.innerHeight;
    const camera = new THREE.PerspectiveCamera(70, W / H, 0.1, 200);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const SHAPE_COUNT = 26;
    const SPREAD_X = 14;
    const SPREAD_Y = 9;
    const DEPTH_RANGE = 30;

    const shapeGeos = [
      new THREE.PlaneGeometry(1.1, 1.1),
      new THREE.PlaneGeometry(1.7, 1.0),
      new THREE.CircleGeometry(0.7, 32),
    ];

    const makeMat = () => new THREE.MeshBasicMaterial({
      color: 0xeaeaf2,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });

    const shapes: THREE.Mesh[] = [];

    // Depth factor 0 (far) → 1 (near camera)
    const depthFactor = (z: number) => Math.max(0, Math.min(1, (z - (camera.position.z - DEPTH_RANGE)) / DEPTH_RANGE));

    const applyDepth = (m: THREE.Mesh) => {
      const d = depthFactor(m.position.z);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.05 + d * 0.50;
      const base = m.userData.baseScale as number;
      m.scale.setScalar(base * (0.35 + d * 0.65));
    };

    const placeShape = (m: THREE.Mesh, z: number) => {
      m.position.set(
        (Math.random() - 0.5) * SPREAD_X * 2,
        (Math.random() - 0.5) * SPREAD_Y * 2,
        z
      );
      m.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      m.userData.spin = (Math.random() - 0.5) * 0.5;
      m.userData.drift = SHAPE_SPEED * (0.6 + Math.random() * 0.8);
      applyDepth(m);
    };

    for (let i = 0; i < SHAPE_COUNT; i++) {
      const m = new THREE.Mesh(shapeGeos[i % shapeGeos.length], makeMat());
      const baseScale = 0.55 + Math.random() * 0.9;
      m.userData.baseScale = baseScale;
      m.scale.setScalar(baseScale);
      placeShape(m, camera.position.z - Math.random() * DEPTH_RANGE);
      scene.add(m);
      shapes.push(m);
    }

    // — Drifting 3D models —
    type ModelObj = {
      group: THREE.Group;
      baseScale: number;
      spin: THREE.Vector3;
      drift: number;
    };
    const modelObjs: ModelObj[] = [];

    const placeModel = (g: THREE.Group) => {
      g.position.set(
        (Math.random() - 0.5) * SPREAD_X * 2,
        (Math.random() - 0.5) * SPREAD_Y * 2,
        camera.position.z - Math.random() * DEPTH_RANGE
      );
      g.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
    };

    const applyModelDepth = (obj: ModelObj) => {
      const d = depthFactor(obj.group.position.z);
      // opacity on all meshes: 0.04 far → 0.72 near
      obj.group.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mat) => {
            if (mat) {
              (mat as THREE.MeshStandardMaterial).opacity = 0.15 + d * 0.75;
              (mat as THREE.MeshStandardMaterial).transparent = true;
            }
          });
        }
      });
      // scale: small far, full near, normalized to baseScale
      obj.group.scale.setScalar(obj.baseScale * (0.2 + d * 0.8));
    };

    // Load each unique GLB once, then clone for the full sequence
    const loader = new GLTFLoader();
    const gltfCache = new Map<string, THREE.Group>();

    const spawnInstance = (path: string, index: number, normalizedScene: THREE.Group, baseScale: number) => {
      const model = normalizedScene.clone(true);
      const group = new THREE.Group();
      group.add(model);
      placeModel(group);
      group.position.z = camera.position.z - 4 - (index / BG_MODEL_PATHS.length) * (DEPTH_RANGE - 4);
      scene.add(group);
      const obj: ModelObj = {
        group,
        baseScale,
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 0.8,
        ),
        drift: MODEL_SPEED * (0.7 + Math.random() * 0.6),
      };
      modelObjs.push(obj);
      applyModelDepth(obj);
    };

    // First pass: load unique GLBs and build cache
    const TARGET_SIZE = 1.6;
    let loaded = 0;
    BG_MODEL_UNIQUE.forEach((path) => {
      loader.load(path, (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const s = TARGET_SIZE / maxDim;
        model.scale.setScalar(s);
        const ctr = box.getCenter(new THREE.Vector3());
        model.position.sub(ctr.multiplyScalar(s));
        // Store normalized scene in cache
        const normalized = new THREE.Group();
        normalized.add(model);
        gltfCache.set(path, normalized);
        loaded++;
        // Once all unique GLBs are loaded, spawn instances in sequence order
        if (loaded === BG_MODEL_UNIQUE.length) {
          BG_MODEL_PATHS.forEach((p, i) => {
            const cached = gltfCache.get(p);
            if (cached) {
              const box2 = new THREE.Box3().setFromObject(cached);
              const s2 = TARGET_SIZE / (Math.max(...box2.getSize(new THREE.Vector3()).toArray()) || 1);
              spawnInstance(p, i, cached, s2);
            }
          });
        }
      });
    });

    let frame = 0;
    let last = performance.now();
    let currentSpeed = SHAPE_SPEED;

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const targetSpeed = warpRef.current ? SHAPE_SPEED * 8 : SHAPE_SPEED;
      currentSpeed += (targetSpeed - currentSpeed) * Math.min(1, dt * 3);

      const showShapes = phaseRef.current !== 'generating';

      for (const m of shapes) {
        m.visible = showShapes;
        m.rotation.z += m.userData.spin * dt;
        m.rotation.x += m.userData.spin * 0.5 * dt;
        m.position.z += m.userData.drift * (currentSpeed / SHAPE_SPEED) * dt;
        if (m.position.z > camera.position.z + 4) {
          placeShape(m, camera.position.z - DEPTH_RANGE);
        }
        applyDepth(m);
      }

      // Animate drifting models — slower, unaffected by warp
      for (const obj of modelObjs) {
        obj.group.visible = showShapes;
        obj.group.rotation.x += obj.spin.x * dt;
        obj.group.rotation.y += obj.spin.y * dt;
        obj.group.rotation.z += obj.spin.z * dt;
        obj.group.position.z += obj.drift * (currentSpeed / SHAPE_SPEED) * dt;
        if (obj.group.position.z > camera.position.z + 4) {
          placeModel(obj.group);
          obj.group.position.z = camera.position.z - DEPTH_RANGE;
        }
        applyModelDepth(obj);
      }

      renderer.render(scene, camera);
    };
    animate();

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
      window.removeEventListener('resize', onResize);
      shapeGeos.forEach((g) => g.dispose());
      shapes.forEach((m) => (m.material as THREE.MeshBasicMaterial).dispose());
      renderer.dispose();
    };
  }, []);

  const intro = phase === 'intro';
  const onPrompt = phase === 'prompt';

  return (
    <div className="relative h-screen w-full overflow-hidden" style={{ background: '#131313' }}>
      <canvas ref={canvasRef} className="block h-full w-full absolute inset-0" />

      {/* Subtle dark gradient — lighter at center, darker at edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(30,30,35,0.0) 0%, rgba(10,10,12,0.55) 70%, rgba(0,0,0,0.75) 100%)',
        }}
      />

      {/* Intro: logo + Begin button — staggered reveal on mount */}
      <div
        className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center"
        style={{
          opacity: intro ? 1 : 0,
          pointerEvents: intro ? 'auto' : 'none',
          transition: 'opacity 0.7s ease',
          transform: 'translateY(4vh)',
        }}
      >
        {/* Stage 1: tagline */}
        <p
          className="select-none"
          style={{
            fontFamily: 'var(--font-body), sans-serif',
            fontSize: 'clamp(0.8rem, 1.4vw, 1rem)',
            letterSpacing: '0.05em',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: '0.5em',
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1), transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
            transitionDelay: '0ms',
          }}
        >
          Remember With
        </p>

        {/* Stage 2: logo */}
        <div
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 1s cubic-bezier(0.22, 1, 0.36, 1), transform 1s cubic-bezier(0.22, 1, 0.36, 1)',
            transitionDelay: '300ms',
          }}
        >
          <LogoBlur text="ECHO" circleSize={0.7} circleEdge={0.5} blur={12} />
        </div>

        {/* Stage 3: CTA button */}
        <div
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(18px)',
            transition: 'opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1), transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
            transitionDelay: '650ms',
          }}
        >
          <button
            type="button"
            onClick={begin}
            className="echo-cta"
            style={{
              marginTop: 'clamp(0.75rem, 2vh, 1.5rem)',
              height: '52px',
              padding: '0 40px',
              borderRadius: '999px',
              background: 'transparent',
              border: '1px solid #ffffff',
              color: '#ffffff',
              fontFamily: 'var(--font-body), sans-serif',
              fontSize: 'clamp(0.8rem, 1.4vw, 1rem)',
              letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
          >
            <span>Start</span>
          </button>
        </div>
      </div>

      {/* Prompt phase: top logo */}
      <div
        aria-hidden={!onPrompt}
        className="absolute left-1/2 top-[6%] z-20"
        style={{
          opacity: onPrompt ? 1 : 0,
          transform: onPrompt ? 'translate(-50%, 0)' : 'translate(-50%, -36px)',
          transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <LogoBlur text="ECHO" fontMin={28.8} fontVw={0.045} fontMax={57.6} blur={6} circleSize={0.7} />
      </div>



      {/* Prompt phase: interactive 3D models orbiting around the prompt */}
      {onPrompt && (
        <div className="absolute inset-0 z-15">
          <MemoriesRing
            onOpen={(m) => {
              setMemory({ id: m.id, name: m.name, photoUrl: null });
              setPhase('gallery');
            }}
          />
        </div>
      )}

      {onPrompt && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-6">
          <textarea
            ref={textareaRef}
            aria-label="What do you want to remember?"
            placeholder="What do you want to remember?"
            className="echo-prompt-input echo-prompt-rise"
            value={promptText}
            rows={1}
            onChange={(e) => {
              setPromptText(e.target.value);
              autoGrow();
            }}
            onFocus={handlePromptFocus}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitPrompt();
              }
            }}
            style={{
              width: 'min(340px, 80%)',
              minHeight: '44px',
              height: '44px',
              borderRadius: '18px',
              background: 'transparent',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.25)',
              pointerEvents: 'auto',
              color: '#ffffff',
              caretColor: '#ffffff',
              textAlign: 'left',
              padding: '12px 18px',
              fontFamily: 'var(--font-body), sans-serif',
              fontWeight: 400,
              fontSize: 'clamp(0.8rem, 1vw, 0.95rem)',
              lineHeight: 1.5,
              outline: 'none',
              resize: 'none',
              overflow: 'hidden',
              display: 'block',
              boxSizing: 'border-box',
            }}
          />

          <button
            type="button"
            onClick={submitPrompt}
            className="echo-cta"
            style={{
              pointerEvents: 'auto',
              opacity: showCta ? 1 : 0,
              transform: showCta ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1), transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
              height: '44px',
              padding: '0 32px',
              borderRadius: '999px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.5)',
              color: '#ffffff',
              fontFamily: 'var(--font-body), sans-serif',
              fontSize: 'clamp(0.8rem, 1vw, 0.95rem)',
              letterSpacing: '0.05em',
              cursor: showCta ? 'pointer' : 'default',
            }}
          >
            <span>Remember this</span>
          </button>
        </div>
      )}


      {phase === 'selection' && (
        <SelectionScreen
          onSelect={(id, name) => {
            setMemory({ id, name, photoUrl: null });
            setPhase('gallery');
          }}
        />
      )}

      {phase === 'loading' && (
        <GeneratingScreen
          durationMs={9000}
          showModel={false}
          beats={[
            { title: 'Reading your memory…', sub: 'GIVE US A MOMENT' },
            { title: 'Trying to understand it better…', sub: 'ANALYZING YOUR ECHOES' },
            { title: 'Almost there…', sub: 'FINDING THE RIGHT ECHOES' },
          ]}
        />
      )}

      {phase === 'memory' && <MemoryScreen onBegin={startGenerating} />}
      {phase === 'generating' && <GeneratingScreen onDone={() => setPhase('gallery')} />}
      {phase === 'gallery' && (
        <GalleryScreen photoUrl={memory?.photoUrl ?? null} name={memory?.name} memoryId={memory?.id} onMemories={() => setPhase('memories')} />
      )}



      {phase === 'memories' && (
        <MemoriesScreen
          onBack={() => setPhase('gallery')}
          onLogoClick={() => setPhase('prompt')}
          onOpen={(m) => {
            setMemory({ id: m.id, name: m.name, photoUrl: null });
            setPhase('gallery');
          }}
        />
      )}

      <div className="absolute right-0 top-0 z-60 flex items-center justify-end gap-3 pt-[clamp(1.25rem,4vh,2.5rem)] pr-[clamp(1.25rem,4vw,2.5rem)]">
        <button
          type="button"
          onClick={reset}
          aria-label="Start over"
          title="Start over"
          className="grid place-items-center"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.35)',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            opacity: intro ? 0 : 1,
            pointerEvents: intro ? 'none' : 'auto',
            transition: 'opacity 0.5s ease, border-color 0.2s ease, color 0.2s ease',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 12a9 9 0 1 0 2.64-6.36" />
            <path d="M3 3v6h6" />
          </svg>
        </button>
        <SoundToggle />
      </div>

      {/* Info button — bottom center, visible on intro and prompt */}
      <button
        type="button"
        onClick={() => setShowInfo(true)}
        aria-label="About Echo"
        className="grid place-items-center"
        style={{
          position: 'absolute',
          bottom: 'clamp(1.25rem, 4vh, 2.5rem)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.3)',
          color: 'rgba(255,255,255,0.6)',
          cursor: 'pointer',
          opacity: (intro || onPrompt) ? 1 : 0,
          pointerEvents: (intro || onPrompt) ? 'auto' : 'none',
          transition: 'opacity 0.4s ease',
          fontFamily: 'var(--font-body), sans-serif',
          fontSize: '0.7rem',
          letterSpacing: '0.02em',
        }}
      >
        i
      </button>

      {/* Info overlay */}
      {showInfo && (
        <div
          className="echo-lightbox fixed inset-0 z-70 grid place-items-center px-6"
          style={{ background: 'rgba(8,8,8,0.75)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
          onClick={() => setShowInfo(false)}
        >
          <div
            className="echo-lightbox-img"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(92vw, 480px)',
              borderRadius: '28px',
              background: 'rgba(20,20,20,0.85)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
              padding: '40px 36px 36px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-body), sans-serif',
                fontSize: 'clamp(0.95rem, 1.4vw, 1.1rem)',
                lineHeight: 1.75,
                color: 'rgba(255,255,255,0.78)',
                margin: 0,
              }}
            >
              You describe a memory. A person, a place, a feeling, a detail that still lives in you. Echo uses that description to generate images, videos, and sounds — not photographs, not recordings, but AI impressions of what you remember. They won&apos;t be perfect. Memory never is. But some of them will be close enough to matter.
            </p>
          </div>
        </div>
      )}

      {/* Noise overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.16'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
          mixBlendMode: 'overlay',
          opacity: 0.5,
        }}
      />
    </div>
  );
}
