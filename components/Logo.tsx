
import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  const arrowSize = {
    sm: 'w-4 h-4 -top-1 -left-1',
    md: 'w-6 h-6 -top-2 -left-2',
    lg: 'w-10 h-10 -top-3 -left-3'
  };

  return (
    <div className={`flex flex-col items-center group ${className}`}>
      <div className={`flex items-baseline font-black tracking-tighter ${sizeClasses[size]}`}>
        <span className="text-white">ENV</span>
        <div className="relative">
          <span className="text-white">SION</span>
          <div className={`absolute ${arrowSize[size]} text-red-600 transform rotate-12 pointer-events-none opacity-90 group-hover:scale-110 transition-transform`}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M21,3L3,10.53V11.5L9.84,14.16L12.5,21H13.47L21,3Z" />
            </svg>
          </div>
        </div>
        <span className="text-red-600 ml-1">PATHS</span>
      </div>
      <div className="w-full h-0.5 bg-red-600 mt-0.5 shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
    </div>
  );
};

export default Logo;
