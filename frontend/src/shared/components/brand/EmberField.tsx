const EMBER_POSITIONS = [15, 30, 50, 70, 85, 42, 62, 8];

export function EmberField() {
  return (
    <>
      {/* Grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 30% 70%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 30% 70%, black, transparent)',
        }}
      />
      {/* Radial glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_80%,rgba(249,115,22,0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_70%_20%,rgba(249,115,22,0.04),transparent_50%)]" />
      {/* Floating embers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {EMBER_POSITIONS.map((left, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-ember-500"
            style={{
              left: `${left}%`,
              width: i % 2 === 0 ? 3 : 2,
              height: i % 2 === 0 ? 3 : 2,
              filter: 'blur(0.5px)',
              boxShadow: '0 0 6px #f97316, 0 0 12px rgba(249,115,22,0.3)',
              animation: `ember-float ${6 + i * 0.5}s ease-in-out ${i * 0.5}s infinite`,
            }}
          />
        ))}
      </div>
      {/* Bottom border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ember-500 to-transparent opacity-40" />

      <style>{`
        @keyframes ember-float {
          0% { bottom: -5%; opacity: 0; }
          10% { opacity: 0.8; }
          50% { opacity: 0.4; }
          90% { opacity: 0; }
          100% { bottom: 105%; opacity: 0; transform: translateX(30px); }
        }
      `}</style>
    </>
  );
}
