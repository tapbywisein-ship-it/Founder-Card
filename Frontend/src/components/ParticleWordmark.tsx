import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  accent: boolean;
}

const DOT_SPACING = 6;
const DOT_RADIUS = 1.3;
const REPEL_RADIUS = 60;
const REPEL_DISTANCE = 22;
const EASE = 0.15;

/**
 * Large text rendered as individual dots that repel away from the cursor and
 * ease back to their home position — a footer signature/easter egg, not the
 * static CSS `background-clip: text` dot pattern used elsewhere.
 */
export const ParticleWordmark = ({
  text,
  className = '',
  dotColor = 'rgba(255,255,255,0.4)',
  accentText,
  accentColor = 'rgba(25,129,254,0.9)',
}: {
  text: string;
  className?: string;
  dotColor?: string;
  /** Substring of `text` to render in `accentColor` instead of `dotColor`. */
  accentText?: string;
  accentColor?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const buildParticles = () => {
      width = container.clientWidth;
      // Container not laid out yet (clientWidth 0) → a 0-wide offscreen canvas
      // makes getImageData throw. Bail and retry next frame instead of crashing.
      if (width === 0) {
        requestAnimationFrame(buildParticles);
        return;
      }
      const vw = window.innerWidth / 100;
      const fontSize = Math.min(Math.max(56, vw * 12), 144);
      height = Math.round(fontSize * 1.15);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const off = document.createElement('canvas');
      off.width = width;
      off.height = height;
      const octx = off.getContext('2d');
      if (!octx) return;

      let size = fontSize;
      octx.textBaseline = 'middle';
      octx.fillStyle = '#fff';
      octx.font = `800 ${size}px Inter, sans-serif`;
      let textWidth = octx.measureText(text).width;
      while (textWidth > width - 16 && size > 10) {
        size -= 2;
        octx.font = `800 ${size}px Inter, sans-serif`;
        textWidth = octx.measureText(text).width;
      }
      const startX = (width - textWidth) / 2;
      octx.fillText(text, startX, height / 2);

      const accentIndex = accentText ? text.indexOf(accentText) : -1;
      const accentStartX = accentIndex >= 0
        ? startX + octx.measureText(text.slice(0, accentIndex)).width
        : Infinity;

      const { data } = octx.getImageData(0, 0, width, height);
      const particles: Particle[] = [];
      for (let y = 0; y < height; y += DOT_SPACING) {
        for (let x = 0; x < width; x += DOT_SPACING) {
          const alpha = data[(y * width + x) * 4 + 3];
          if (alpha > 128) particles.push({ x, y, homeX: x, homeY: y, accent: x >= accentStartX });
        }
      }
      particlesRef.current = particles;
    };

    buildParticles();

    let rafId: number;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      const mouse = mouseRef.current;

      for (const p of particlesRef.current) {
        ctx.fillStyle = p.accent ? accentColor : dotColor;
        const dx = p.homeX - mouse.x;
        const dy = p.homeY - mouse.y;
        const dist = Math.hypot(dx, dy);

        let targetX = p.homeX;
        let targetY = p.homeY;
        if (dist < REPEL_RADIUS) {
          const force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
          const angle = Math.atan2(dy, dx);
          targetX = p.homeX + Math.cos(angle) * force * REPEL_DISTANCE;
          targetY = p.homeY + Math.sin(angle) * force * REPEL_DISTANCE;
        }

        p.x += (targetX - p.x) * EASE;
        p.y += (targetY - p.y) * EASE;

        ctx.beginPath();
        ctx.arc(p.x, p.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const handleResize = () => buildParticles();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, [text, dotColor, accentText, accentColor]);

  return (
    <div ref={containerRef} className={className}>
      <canvas ref={canvasRef} className="block" aria-hidden />
    </div>
  );
};
