import React, { useEffect, useRef } from "react";

export default function PremiumBackground3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Grid configuration
    const cols = 26;
    const rows = 26;
    const spacing = 45; // Space between points in 3D

    // 3D rotation parameters
    let yaw = -0.3; // Angle Y
    let pitch = 0.55; // Angle X
    let time = 0;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse positions to -1 to 1
      mouseRef.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.targetY = (e.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    const render = () => {
      time += 0.008;

      // Smooth mouse interpolation for beautiful camera sway
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      // Premium minimal dark slate/obsidian luxury layout
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        10,
        width / 2,
        height / 2,
        Math.max(width, height)
      );
      bgGrad.addColorStop(0, "#101218"); // deep warm obsidian
      bgGrad.addColorStop(0.6, "#07080b"); // rich black charcoal
      bgGrad.addColorStop(1, "#020305"); // true pitch-black slate
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Camera settings
      const fov = 400; // Perspective distance / focal length
      const cameraZ = 300;

      // Subtle dynamic camera orbit sway based on mouse
      const currentYaw = yaw + mouseRef.current.x * 0.15;
      const currentPitch = pitch + mouseRef.current.y * 0.12;

      // Pre-calculate trigonometric values
      const cosYaw = Math.cos(currentYaw);
      const sinYaw = Math.sin(currentYaw);
      const cosPitch = Math.cos(currentPitch);
      const sinPitch = Math.sin(currentPitch);

      // Coordinates cache
      const projectedPoints: Array<{ sx: number; sy: number; depth: number; opacity: number }[]> = [];

      for (let c = 0; c < cols; c++) {
        projectedPoints[c] = [];
        for (let r = 0; r < rows; r++) {
          // Centered grid coords
          const lx = (c - cols / 2) * spacing;
          const ly = (r - rows / 2) * spacing;

          // Double wave ripple mathematics for a organic 3D mesh curvature
          const distFromCenter = Math.sqrt(lx * lx + ly * ly) * 0.007;
          const waveZ =
            Math.sin(distFromCenter - time * 2) * 35 +
            Math.cos((lx * 0.01) + time) * 15 +
            Math.sin((ly * 0.01) - time) * 15;

          // Apply rotation: Pitch first (around X)
          // Y rotated
          const y1 = ly * cosPitch - waveZ * sinPitch;
          const z1 = ly * sinPitch + waveZ * cosPitch;

          // Yaw second (around Y)
          const x2 = lx * cosYaw + z1 * sinYaw;
          const z2 = -lx * sinYaw + z1 * cosYaw;

          // Offset depth
          const finalZ = z2 + cameraZ;

          if (finalZ <= 0) continue; // Behind clip plane

          // Perspective projection
          const scale = fov / (fov + finalZ);
          const sx = width / 2 + x2 * scale;
          const sy = height / 2 + y1 * scale;

          // Fade out based on depth (premium fog effect)
          const maxDepth = 600;
          const minDepth = 100;
          let opacity = 1 - (finalZ - minDepth) / (maxDepth - minDepth);
          opacity = Math.max(0, Math.min(1, opacity));

          projectedPoints[c][r] = { sx, sy, depth: finalZ, opacity };
        }
      }

      // Draw lines between net vertices for premium skeletal grid aesthetics
      ctx.lineWidth = 0.65;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const pt = projectedPoints[c]?.[r];
          if (!pt) continue;

          // Connect to column right neighbor
          const ptRight = projectedPoints[c + 1]?.[r];
          if (ptRight && pt.opacity > 0.02 && ptRight.opacity > 0.02) {
            const combinedOpacity = pt.opacity * ptRight.opacity * 0.15;
            ctx.beginPath();
            ctx.moveTo(pt.sx, pt.sy);
            ctx.lineTo(ptRight.sx, ptRight.sy);
            // Draw bronze connecting strands
            ctx.strokeStyle = `rgba(180, 83, 9, ${combinedOpacity})`;
            ctx.stroke();
          }

          // Connect to row bottom neighbor
          const ptBottom = projectedPoints[c]?.[r + 1];
          if (ptBottom && pt.opacity > 0.02 && ptBottom.opacity > 0.02) {
            const combinedOpacity = pt.opacity * ptBottom.opacity * 0.15;
            ctx.beginPath();
            ctx.moveTo(pt.sx, pt.sy);
            ctx.lineTo(ptBottom.sx, ptBottom.sy);
            // Draw champagne/gold connecting strands
            ctx.strokeStyle = `rgba(245, 158, 11, ${combinedOpacity})`;
            ctx.stroke();
          }
        }
      }

      // Draw particle nodes with depth-based sizes & gorgeous glowing gold/amber colors
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          const pt = projectedPoints[c]?.[r];
          if (!pt || pt.opacity <= 0.02) continue;

          const size = Math.max(0.6, (3.5 - pt.depth * 0.004) * 1.5);
          ctx.beginPath();
          ctx.arc(pt.sx, pt.sy, size, 0, Math.PI * 2);

          // Stagger colours: alternating gold-400, warm amber-600 and glowing titanium white
          let nodeColor = `rgba(251, 191, 36, ${pt.opacity * 0.82})`; // gold-400
          if ((c + r) % 5 === 0) {
            nodeColor = `rgba(217, 119, 6, ${pt.opacity * 0.95})`; // amber-600
          } else if ((c + r) % 7 === 0) {
            nodeColor = `rgba(255, 255, 255, ${pt.opacity * 0.9})`; // warm white glow
          }

          ctx.fillStyle = nodeColor;
          ctx.fill();

          // Add a soft subtle outer glow to closer/major particles
          if (pt.depth < 250 && (c + r) % 3 === 0) {
            ctx.beginPath();
            ctx.arc(pt.sx, pt.sy, size * 2.8, 0, Math.PI * 2);
            ctx.fillStyle = nodeColor.replace(/[\d.]+\)$/, `${pt.opacity * 0.15})`);
            ctx.fill();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none block"
    />
  );
}
