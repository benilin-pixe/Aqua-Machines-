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
}

export const WaterCursorEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;

    if (prefersReducedMotion || isTouchDevice) {
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
    const maxRipples = 20;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let lastMouseX = mouseX;
    let lastMouseY = mouseY;
    let distanceSinceLastRipple = 0;
    let lastTime = Date.now();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth * window.devicePixelRatio;
      height = canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const spawnRipple = (x: number, y: number, maxRadius = 55, speed = 0.8) => {
      if (ripples.length >= maxRipples) {
        ripples.shift();
      }
      ripples.push({
        x,
        y,
        radius: 4,
        maxRadius: maxRadius + Math.random() * 15,
        alpha: 0.55,
        speed,
        growthRate: 0.7 + Math.random() * 0.4,
        wobbleSeed: Math.random() * 10,
      });
    };

    const handleClick = (e: MouseEvent) => {
      // Concentric click ripples
      spawnRipple(e.clientX, e.clientY, 70, 1.2);
      setTimeout(() => spawnRipple(e.clientX, e.clientY, 45, 0.9), 120);
      setTimeout(() => spawnRipple(e.clientX, e.clientY, 25, 0.6), 240);

      // Tiny droplets
      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 2.5 + 0.8;
        droplets.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          size: Math.random() * 2 + 0.8,
          alpha: 0.7,
          decay: 0.025,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    const render = () => {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const now = Date.now();
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      // Smooth mouse interpolation
      mouseX += (targetX - mouseX) * 0.2;
      mouseY += (targetY - mouseY) * 0.2;

      const dx = mouseX - lastMouseX;
      const dy = mouseY - lastMouseY;
      const speed = Math.sqrt(dx * dx + dy * dy);
      lastMouseX = mouseX;
      lastMouseY = mouseY;

      distanceSinceLastRipple += speed;

      // Automatically spawn ripples based on distance/movement
      if (distanceSinceLastRipple > 45 || (speed > 2 && Math.random() < 0.15)) {
        spawnRipple(mouseX, mouseY, 40 + speed * 0.5, 0.75);
        distanceSinceLastRipple = 0;
      }

      points.push({ x: mouseX, y: mouseY, time: now });
      while (points.length > 0 && now - points[0].time > 250) {
        points.shift();
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // 1. Render ripples (calm water surface disturbance)
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.growthRate * (1 - r.radius / r.maxRadius) * 1.5;
        r.alpha -= 0.008;

        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        
        // Draw slightly irregular/shimmering ripple ring (subtle wave distortion)
        const segments = 24;
        for (let s = 0; s <= segments; s++) {
          const theta = (s / segments) * Math.PI * 2;
          const wobble = Math.sin(theta * 4 + r.wobbleSeed + r.radius * 0.1) * 1.5;
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

        // Delicate inner specular highlight ring
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, r.alpha * 0.3)})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();

        ctx.restore();
      }

      // 2. Render subtle flowing water stream behind cursor
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
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
        ctx.stroke();

        ctx.lineWidth = streamWidth;
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
        ctx.stroke();

        ctx.lineWidth = Math.max(0.8, streamWidth * 0.3);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.stroke();

        ctx.restore();
      }

      // 3. Render standalone tiny water droplets
      for (let i = droplets.length - 1; i >= 0; i--) {
        const d = droplets[i];
        d.x += d.vx;
        d.y += d.vy;
        d.vx *= 0.95;
        d.vy *= 0.95;
        d.alpha -= d.decay;
        d.size = Math.max(0.2, d.size - 0.02);

        if (d.alpha <= 0 || d.size <= 0.2) {
          droplets.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, d.alpha)})`;
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.restore();
      }

      // 4. Cursor center water droplet glow
      ctx.save();
      const cursorGrad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 10);
      cursorGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      cursorGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.5)');
      cursorGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 10, 0, Math.PI * 2);
      ctx.fillStyle = cursorGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
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
