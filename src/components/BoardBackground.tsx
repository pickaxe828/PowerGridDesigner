import { useEffect, useRef } from 'react';
import { useStore } from '@xyflow/react';

const GRID_SIZE = 20;
const BOARD_SIZE = 16;
const MINOR_LINE_COLOR = 'rgba(71, 85, 105, 0.30)';
const MAJOR_LINE_COLOR = 'rgba(71, 85, 105, 0.45)';
const ORIGIN_COLOR = '#ef4444';

export default function BoardBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const transform = useStore((s) => s.transform);
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width || !height) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const [tx, ty, zoom] = transform;

    const startCol = Math.floor(-tx / (GRID_SIZE * zoom)) - 1;
    const endCol = Math.ceil((width - tx) / (GRID_SIZE * zoom)) + 1;
    const startRow = Math.floor(-ty / (GRID_SIZE * zoom)) - 1;
    const endRow = Math.ceil((height - ty) / (GRID_SIZE * zoom)) + 1;

    const snap = (v: number) => Math.floor(v) + 0.5;

    // ==========================================
    // PASS 1: Minor square grid lines (every cell, offset to match wire cell edges)
    // ==========================================
    ctx.beginPath();
    ctx.strokeStyle = MINOR_LINE_COLOR;
    ctx.lineWidth = 0.5;

    for (let col = startCol; col <= endCol; col++) {
      const x = snap((col - 0.5) * GRID_SIZE * zoom + tx);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let row = startRow; row <= endRow; row++) {
      const y = snap((row - 0.5) * GRID_SIZE * zoom + ty);
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // ==========================================
    // PASS 2: Major board boundary lines (every 16 cells, offset to match wire cell edges)
    // ==========================================
    ctx.beginPath();
    ctx.strokeStyle = MAJOR_LINE_COLOR;
    ctx.lineWidth = 1.5;

    for (let col = startCol; col <= endCol; col++) {
      if (col % BOARD_SIZE === 0) {
        const x = snap((col - 0.5) * GRID_SIZE * zoom + tx);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
    }
    for (let row = startRow; row <= endRow; row++) {
      if (row % BOARD_SIZE === 0) {
        const y = snap((row - 0.5) * GRID_SIZE * zoom + ty);
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
    }
    ctx.stroke();

    // ==========================================
    // PASS 3: Origin marker
    // ==========================================
    const originX = tx;
    const originY = ty;
    ctx.beginPath();
    ctx.fillStyle = ORIGIN_COLOR;
    const size = 3;
    ctx.fillRect(snap(originX) - size, snap(originY) - size, size * 2, size * 2);

  }, [transform, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="react-flow__background"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
}
