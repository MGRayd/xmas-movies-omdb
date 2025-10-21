import React, { useEffect, useRef } from 'react';

interface SnowflakeProps {
  size: number;
  x: number;
  y: number;
  speed: number;
  opacity: number;
  wind: number;
}

interface SnowEffectProps {
  snowflakeCount?: number;
}

const SnowEffect: React.FC<SnowEffectProps> = ({ snowflakeCount = 100 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snowflakesRef = useRef<SnowflakeProps[]>([]);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to full window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Initialize snowflakes
    const initSnowflakes = () => {
      snowflakesRef.current = [];
      for (let i = 0; i < snowflakeCount; i++) {
        snowflakesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 4 + 1,
          speed: Math.random() * 1 + 0.5,
          opacity: Math.random() * 0.6 + 0.3,
          wind: Math.random() * 0.5 - 0.25
        });
      }
    };

    // Draw a single snowflake
    const drawSnowflake = (flake: SnowflakeProps) => {
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
      ctx.fill();
    };

    // Update snowflake position
    const updateSnowflake = (flake: SnowflakeProps) => {
      flake.y += flake.speed;
      flake.x += flake.wind;

      // Reset snowflake when it reaches bottom
      if (flake.y > canvas.height) {
        flake.y = -10;
        flake.x = Math.random() * canvas.width;
      }

      // Reset snowflake when it goes off screen horizontally
      if (flake.x > canvas.width) {
        flake.x = 0;
      } else if (flake.x < 0) {
        flake.x = canvas.width;
      }
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      snowflakesRef.current.forEach(flake => {
        drawSnowflake(flake);
        updateSnowflake(flake);
      });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Initialize
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    initSnowflakes();
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [snowflakeCount]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-10"
      aria-hidden="true"
    />
  );
};

export default SnowEffect;
