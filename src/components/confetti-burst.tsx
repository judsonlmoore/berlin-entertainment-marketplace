"use client";

import { useEffect, useRef } from "react";

type Props = {
  active: boolean;
};

/**
 * Lightweight canvas confetti for the onboarding completion step.
 * Respects prefers-reduced-motion.
 */
export function ConfettiBurst({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const colors = ["#1F5A45", "#B84A32", "#B99A59", "#8EA9B7", "#141816"];
    const particles = Array.from({ length: 120 }, () => ({
      x: width * 0.5 + (Math.random() - 0.5) * 80,
      y: height * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -12 - 4,
      g: 0.22 + Math.random() * 0.12,
      size: 4 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)]!,
      life: 70 + Math.floor(Math.random() * 40),
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
    }));

    let frame = 0;
    let raf = 0;

    const tick = () => {
      frame += 1;
      ctx.clearRect(0, 0, width, height);
      let alive = 0;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive += 1;
        p.life -= 1;
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / 50);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (alive > 0 && frame < 180) {
        raf = window.requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, width, height);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50"
    />
  );
}
