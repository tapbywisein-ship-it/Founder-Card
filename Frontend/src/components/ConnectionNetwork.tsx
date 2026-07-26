import { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 0 = unknown stranger (muted gray), 1 = just connected (brand blue), eases back to 0. */
  connected: number;
}

const NODE_COUNT = 34;
const LINK_DISTANCE = 170;
const CONNECT_EVERY_MS = 900;

/**
 * Ambient hero visual: anonymous dots drifting, briefly linking up and
 * lighting up brand-blue when "connected", then fading back to strangers —
 * the whole product story (unknown people → real connections) as a loop.
 */
export const ConnectionNetwork = ({ className = '' }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let nodes: Node[] = [];

    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      // Not laid out yet — a 0-sized canvas breaks the node spawn below. Retry next frame.
      if (width === 0 || height === 0) {
        requestAnimationFrame(resize);
        return;
      }
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        connected: 0,
      }));
    };
    resize();

    let rafId: number;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
        n.connected = Math.max(0, n.connected - 0.006);
      }

      // Faint links between nodes close enough to "meet"
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < LINK_DISTANCE) {
            const glow = Math.max(a.connected, b.connected);
            const alpha = (1 - dist / LINK_DISTANCE) * (0.06 + glow * 0.35);
            ctx.strokeStyle = glow > 0.1 ? `rgba(25,129,254,${alpha})` : `rgba(148,163,184,${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        const r = 2.2 + n.connected * 1.6;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.connected > 0.1
          ? `rgba(25,129,254,${0.5 + n.connected * 0.5})`
          : 'rgba(148,163,184,0.4)';
        ctx.fill();
      }

      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    // Every tick, pick two nearby strangers and "introduce" them.
    const connectInterval = setInterval(() => {
      if (!nodes.length) return;
      const a = nodes[Math.floor(Math.random() * nodes.length)];
      let closest: Node | null = null;
      let closestDist = Infinity;
      for (const b of nodes) {
        if (b === a) continue;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < closestDist) {
          closestDist = dist;
          closest = b;
        }
      }
      a.connected = 1;
      if (closest) closest.connected = 1;
    }, CONNECT_EVERY_MS);

    const handleResize = () => resize();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(connectInterval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className={className || 'relative'}>
      <canvas ref={canvasRef} className="block w-full h-full" aria-hidden />
    </div>
  );
};
