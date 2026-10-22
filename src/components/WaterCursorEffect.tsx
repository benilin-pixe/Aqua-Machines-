import React, { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
  time: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
  growthRate: number;
  wobbleSeed: number;
}

interface Droplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  stretch: number;
}

export const WaterCursorEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth * window.devicePixelRatio);
    let height = (canvas.height = window.innerHeight * window.devicePixelRatio);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const points: Point[] = [];
    const ripples: Ripple[] = [];
    const droplets: Droplet[] = [];
    const maxRipples = 25;
    const maxDroplets = 40;

    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let lastPointerX = pointerX;
    let lastPointerY = pointerY;
    let isPointerActive = false;
    let distanceSinceLastRipple = 0;
    let lastTime = Date.now();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth * window.devicePixelRatio;
      height = canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const spawnRipple = (x: number, y: number, maxRadius = 50, speed = 0.8) => {
      if (ripples.length >= maxRipples) {
        ripples.shift();
      }
      ripples.push({
        x,
        y,
        radius: 3,
        maxRadius: maxRadius + Math.random() * 15,
        alpha: 0.6,
        speed,
        growthRate: 0.7 + Math.random() * 0.4,
        wobbleSeed: Math.random() * 10,
      });
    };

    const spawnDroplet = (x: number, y: number, customVx = 0, customVy = 0, sizeMultiplier = 1) => {
      if (droplets.length >= maxDroplets) {
        droplets.shift();
      }
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 1.5 + 0.5;
      droplets.push({
        x,
        y,
        vx: customVx || Math.cos(angle) * spd,
        vy: customVy || Math.sin(angle) * spd,
        size: (Math.random() * 2.2 + 1) * sizeMultiplier,
        alpha: 0.75,
        decay: 0.02 + Math.random() * 0.015,
        stretch: 1,
      });
    };

    const handlePointerDown = (e: PointerEvent) => {
      isPointerActive = true;
      targetX = e.clientX;
      targetY = e.clientY;

      // Concentric click / tap ripples
      spawnRipple(e.clientX, e.clientY, 65, 1.1);
      setTimeout(() => spawnRipple(e.clientX, e.clientY, 40, 0.85), 100);
      setTimeout(() => spawnRipple(e.clientX, e.clientY, 20, 0.6), 200);

      // Tap droplets
      for (let i = 0; i < 3; i++) {
        spawnDroplet(e.clientX, e.clientY, 0, 0, 1.2);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const handlePointerUp = () => {
      isPointerActive = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerUp, { passive: true });

    const render = () => {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const now = Date.now();
      lastTime = now;

      // Smooth pointer interpolation (fluid inertia)
      pointerX += (targetX - pointerX) * 0.22;
      pointerY += (targetY - pointerY) * 0.22;

      const dx = pointerX - lastPointerX;
      const dy = pointerY - lastPointerY;
      const speed = Math.sqrt(dx * dx + dy * dy);
      lastPointerX = pointerX;
      lastPointerY = pointerY;

      distanceSinceLastRipple += speed;

      // Automatic ripple emission along movement path
      if (distanceSinceLastRipple > 40 || (speed > 1.5 && Math.random() < 0.12)) {
        spawnRipple(pointerX, pointerY, 35 + speed * 0.4, 0.7);
        distanceSinceLastRipple = 0;
      }

      // Automatic droplet emission during movement
      if (speed > 2 && Math.random() < 0.25) {
        spawnDroplet(pointerX + (Math.random() - 0.5) * 8, pointerY + (Math.random() - 0.5) * 8, dx * 0.1, dy * 0.1);
      }

      points.push({ x: pointerX, y: pointerY, time: now });
      while (points.length > 0 && now - points[0].time > 220) {
        points.shift();
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // 1. Render realistic water ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.growthRate * (1 - r.radius / r.maxRadius) * 1.4;
        r.alpha -= 0.009;

        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        const segments = 24;
        for (let s = 0; s <= segments; s++) {
          const theta = (s / segments) * Math.PI * 2;
          const wobble = Math.sin(theta * 5 + r.wobbleSeed + r.radius * 0.12) * 1.2;
          const currentR = Math.max(1, r.radius + wobble);
          const rx = r.x + Math.cos(theta) * currentR;
          const ry = r.y + Math.sin(theta) * currentR;
          if (s === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();

        ctx.strokeStyle = `rgba(34, 211, 238, ${Math.max(0, r.alpha * 0.5)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Inner specular highlight
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, r.alpha * 0.35)})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.restore();
      }

      // 2. Render flowing translucent water stream trail
      if (points.length > 2) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let j = 1; j < points.length; j++) {
          const xc = (points[j].x + points[j - 1].x) / 2;
          const yc = (points[j].y + points[j - 1].y) / 2;
          ctx.quadraticCurveTo(points[j - 1].x, points[j - 1].y, xc, yc);
        }

        const streamWidth = Math.max(2, Math.min(6, 8 - speed * 0.15));
        ctx.lineWidth = streamWidth * 1.8;
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
        ctx.stroke();

        ctx.lineWidth = streamWidth;
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
        ctx.stroke();

        ctx.lineWidth = Math.max(0.8, streamWidth * 0.3);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.stroke();

        ctx.restore();
      }

      // 3. Render organic translucent water droplets
      for (let i = droplets.length - 1; i >= 0; i--) {
        const d = droplets[i];
        d.x += d.vx;
        d.y += d.vy;
        d.vx *= 0.94;
        d.vy *= 0.94;
        d.vy += 0.02; // subtle gravity
        d.alpha -= d.decay;
        d.size = Math.max(0.2, d.size - 0.02);
        
        // Calculate stretch along velocity vector
        const velMag = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
        d.stretch = Math.max(1, 1 + velMag * 0.2);

        if (d.alpha <= 0 || d.size <= 0.2) {
          droplets.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(d.x, d.y);
        if (velMag > 0.1) {
          ctx.rotate(Math.atan2(d.vy, d.vx));
        }

        ctx.beginPath();
        // Irregular rounded droplet shape
        ctx.ellipse(0, 0, d.size * d.stretch, d.size, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, d.alpha)})`;
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 5;
        ctx.fill();

        ctx.restore();

        // Occasionally trigger secondary ripple when droplet is near end of life or impacts
        if (d.alpha < 0.2 && Math.random() < 0.05) {
          spawnRipple(d.x, d.y, 18, 0.5);
        }
      }

      // 4. Leading pointer water droplet glow
      ctx.save();
      const cursorGrad = ctx.createRadialGradient(pointerX, pointerY, 0, pointerX, pointerY, 12);
      cursorGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      cursorGrad.addColorStop(0.4, 'rgba(34, 211, 238, 0.55)');
      cursorGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.beginPath();
      ctx.arc(pointerX, pointerY, 12, 0, Math.PI * 2);
      ctx.fillStyle = cursorGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pointerX, pointerY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden"
    />
  );
};
