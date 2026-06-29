
export default function NoiseOverlay() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage: "url('/grain.gif')",
        opacity: 0.09,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
        zIndex: 99999,
      }}
    />
  );
}
