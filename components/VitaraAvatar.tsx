
import React, { useState, useEffect, useRef } from 'react';

export const VitaraAvatar: React.FC = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate distance from center
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      // Limit the movement range
      const limit = 8;
      const moveX = (deltaX / window.innerWidth) * limit * 2;
      const moveY = (deltaY / window.innerHeight) * limit * 2;

      setPosition({ 
        x: Math.max(-limit, Math.min(limit, moveX)), 
        y: Math.max(-limit, Math.min(limit, moveY)) 
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-12 h-12 flex items-center justify-center select-none"
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-teal-400/20 rounded-full blur-md animate-pulse" />
      
      {/* Avatar Shadow */}
      <div className="absolute bottom-1 w-8 h-2 bg-black/10 rounded-full blur-[2px]" />

      {/* Main Avatar */}
      <div 
        className="text-4xl transition-transform duration-75 ease-out drop-shadow-md cursor-default"
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px) rotate(${position.x * 0.5}deg) scale(1.1)`,
        }}
      >
        👩‍⚕️
      </div>

      {/* Online indicator */}
      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
    </div>
  );
};
