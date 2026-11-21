import { useEffect, useRef } from 'react';
import { CharacterConfig } from '../game/character';
import {
  SpriteAnimPose,
  drawHeroPixelSprite,
  drawIsometricShadow,
} from '../game/pixelSprites';

interface HeroPreviewCanvasProps {
  character: CharacterConfig;
  pose?: SpriteAnimPose;
  facingLeft?: boolean;
  paused?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export function HeroPreviewCanvas({
  character,
  pose = 'idle',
  facingLeft = false,
  paused = false,
  width = 240,
  height = 240,
  className = '',
}: HeroPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const propsRef = useRef({ character, pose, facingLeft, paused, dirty: true });
  propsRef.current = { character, pose, facingLeft, paused, dirty: true };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buf = document.createElement('canvas');
    buf.width = 76;
    buf.height = 76;
    const bctx = buf.getContext('2d');
    if (!bctx) return;

    let raf = 0;
    let lastDraw = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const { character: cfg, pose: activePose, facingLeft: isLeft, paused: isPaused, dirty } =
        propsRef.current;
      if (isPaused && !dirty) {
        raf = window.requestAnimationFrame(draw);
        return;
      }
      if (!dirty && now - lastDraw < 64) {
        raf = window.requestAnimationFrame(draw);
        return;
      }
      lastDraw = now;
      propsRef.current.dirty = false;
      const t = (now - start) / 1000;

      bctx.imageSmoothingEnabled = false;
      bctx.clearRect(0, 0, buf.width, buf.height);

      // Subtle mossy blight mist halo behind weathered stone plinth
      const pulse = 0.22 + Math.sin(t * 2.8) * 0.08;
      bctx.fillStyle = `rgba(132, 204, 22, ${pulse.toFixed(2)})`;
      bctx.beginPath();
      bctx.ellipse(38, 56, 26, 11, 0, 0, Math.PI * 2);
      bctx.fill();

      // Isometric dark-fantasy carved stone pedestal
      bctx.fillStyle = '#100D0B';
      bctx.beginPath();
      bctx.moveTo(38, 44);
      bctx.lineTo(64, 56);
      bctx.lineTo(64, 62);
      bctx.lineTo(38, 72);
      bctx.lineTo(12, 62);
      bctx.lineTo(12, 56);
      bctx.closePath();
      bctx.fill();

      // Pedestal top weathered flagstone diamond
      bctx.fillStyle = '#362F2A';
      bctx.beginPath();
      bctx.moveTo(38, 45);
      bctx.lineTo(62, 56);
      bctx.lineTo(38, 67);
      bctx.lineTo(14, 56);
      bctx.closePath();
      bctx.fill();

      // Pedestal inner amber rune trim
      bctx.strokeStyle = '#D97706';
      bctx.lineWidth = 1;
      bctx.beginPath();
      bctx.moveTo(38, 49);
      bctx.lineTo(54, 56);
      bctx.lineTo(38, 63);
      bctx.lineTo(22, 56);
      bctx.closePath();
      bctx.stroke();

      // Pedestal stone side faces
      bctx.fillStyle = '#201B18';
      bctx.beginPath();
      bctx.moveTo(14, 56);
      bctx.lineTo(38, 67);
      bctx.lineTo(38, 71);
      bctx.lineTo(14, 61);
      bctx.closePath();
      bctx.fill();

      bctx.fillStyle = '#2A231E';
      bctx.beginPath();
      bctx.moveTo(62, 56);
      bctx.lineTo(38, 67);
      bctx.lineTo(38, 71);
      bctx.lineTo(62, 61);
      bctx.closePath();
      bctx.fill();

      // Animated pose cycle for punch/kick/special preview
      let effectivePose = activePose;
      let z = 0;
      if (activePose === 'punch1') {
        const cycle = Math.floor(t * 2.8) % 3;
        effectivePose = cycle === 0 ? 'punch1' : cycle === 1 ? 'punch2' : 'punch3';
      } else if (activePose === 'special') {
        z = 4 + Math.sin(t * 6) * 2;
      }

      drawIsometricShadow(bctx, 38, 56, 9, z);
      drawHeroPixelSprite(bctx, 38, 56 - z, cfg, {
        x: 0,
        y: 0,
        z,
        facingLeft: isLeft,
        pose: effectivePose,
        animTime: t,
        walkPhase: t * 2.6,
        scaleX: 1,
        scaleY: 1,
        hitFlash: false,
        invulnBlink: false,
      });

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, canvas.width, canvas.height);

      raf = window.requestAnimationFrame(draw);
    };

    raf = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      data-testid="hero-preview-canvas"
      className={`pixelated block ${className}`}
    />
  );
}
