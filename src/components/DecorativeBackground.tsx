import React from 'react';

const DecorativeBackground = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="line1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="20%" stopColor="rgba(0,0,0,0.05)" />
            <stop offset="50%" stopColor="rgba(0,0,0,0)" />
            <stop offset="80%" stopColor="rgba(0,0,0,0.05)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
          <linearGradient id="line2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="30%" stopColor="rgba(0,0,0,0.04)" />
            <stop offset="50%" stopColor="rgba(0,0,0,0)" />
            <stop offset="70%" stopColor="rgba(0,0,0,0.04)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
          <linearGradient id="line3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="25%" stopColor="rgba(0,0,0,0.045)" />
            <stop offset="50%" stopColor="rgba(0,0,0,0)" />
            <stop offset="75%" stopColor="rgba(0,0,0,0.045)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>
        <line x1="0" y1="150" x2="1200" y2="200" stroke="url(#line1)" strokeWidth="1" transform="rotate(15 600 400)" />
        <line x1="0" y1="300" x2="1200" y2="350" stroke="url(#line2)" strokeWidth="1" transform="rotate(-8 600 400)" />
        <line x1="0" y1="450" x2="1200" y2="500" stroke="url(#line3)" strokeWidth="1" transform="rotate(12 600 400)" />
        <line x1="0" y1="600" x2="1200" y2="650" stroke="url(#line1)" strokeWidth="1" transform="rotate(-5 600 400)" />
        <line x1="0" y1="100" x2="1200" y2="100" stroke="url(#line2)" strokeWidth="1" />
        <line x1="0" y1="700" x2="1200" y2="700" stroke="url(#line3)" strokeWidth="1" />
        <path d="M 1000 100 Q 1300 400 1000 700" stroke="url(#line1)" strokeWidth="1" fill="none" />
        <path d="M 200 100 Q -100 400 200 700" stroke="url(#line2)" strokeWidth="1" fill="none" />
        <path d="M 1050 150 Q 1350 400 1050 650" stroke="url(#line3)" strokeWidth="1" fill="none" />
        <path d="M 150 150 Q -150 400 150 650" stroke="url(#line1)" strokeWidth="1" fill="none" />
      </svg>
    </div>
  );
};

export default DecorativeBackground;
