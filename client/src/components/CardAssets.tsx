import React from 'react';

// SVG definitions for high-quality card suits
export const CardSuitsSVG: React.FC = () => (
  <svg style={{ position: 'absolute', width: 0, height: 0 }}>
    <defs>
      {/* Heart - Classic shape */}
      <symbol id="suit-heart" viewBox="0 0 100 100">
        <path
          d="M50 88 C20 60, 0 40, 0 25 C0 10, 15 0, 30 0 C40 0, 50 10, 50 20 C50 10, 60 0, 70 0 C85 0, 100 10, 100 25 C100 40, 80 60, 50 88Z"
          fill="currentColor"
        />
      </symbol>

      {/* Diamond - Elegant shape */}
      <symbol id="suit-diamond" viewBox="0 0 100 120">
        <path
          d="M50 0 L95 60 L50 120 L5 60 Z"
          fill="currentColor"
        />
      </symbol>

      {/* Club - Trefoil shape */}
      <symbol id="suit-club" viewBox="0 0 100 100">
        <circle cx="50" cy="25" r="22" fill="currentColor" />
        <circle cx="25" cy="55" r="22" fill="currentColor" />
        <circle cx="75" cy="55" r="22" fill="currentColor" />
        <path d="M42 50 L50 95 L58 50 Z" fill="currentColor" />
        <rect x="45" y="75" width="10" height="20" fill="currentColor" />
      </symbol>

      {/* Spade - Classic shape */}
      <symbol id="suit-spade" viewBox="0 0 100 100">
        <path
          d="M50 5 C20 35, 0 50, 0 65 C0 80, 15 90, 30 90 C40 90, 47 85, 50 78 C53 85, 60 90, 70 90 C85 90, 100 80, 100 65 C100 50, 80 35, 50 5Z"
          fill="currentColor"
        />
        <path d="M42 78 L50 98 L58 78 Z" fill="currentColor" />
        <rect x="45" y="85" width="10" height="12" fill="currentColor" />
      </symbol>

      {/* Card back pattern */}
      <pattern id="card-back-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#1a1a2e" />
        <path d="M0 10 L10 0 L20 10 L10 20 Z" fill="rgba(251, 191, 36, 0.1)" />
        <circle cx="10" cy="10" r="2" fill="rgba(251, 191, 36, 0.15)" />
      </pattern>

      {/* Ornate border pattern */}
      <pattern id="ornate-border" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="transparent" />
        <circle cx="4" cy="4" r="1.5" fill="rgba(251, 191, 36, 0.3)" />
      </pattern>

      {/* Card texture gradient */}
      <linearGradient id="card-face-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#fafafa" />
        <stop offset="100%" stopColor="#f5f5f5" />
      </linearGradient>

      {/* Card shine effect */}
      <linearGradient id="card-shine" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
        <stop offset="50%" stopColor="rgba(255,255,255,0)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.05)" />
      </linearGradient>

      {/* Gold gradient for premium elements */}
      <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef3c7" />
        <stop offset="50%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>

      {/* Card back gradient */}
      <linearGradient id="card-back-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2d1b4e" />
        <stop offset="50%" stopColor="#1a1a2e" />
        <stop offset="100%" stopColor="#0f0a1a" />
      </linearGradient>

      {/* Red suit gradient */}
      <linearGradient id="red-suit-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ff4757" />
        <stop offset="100%" stopColor="#c0392b" />
      </linearGradient>

      {/* Black suit gradient */}
      <linearGradient id="black-suit-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#2c3e50" />
        <stop offset="100%" stopColor="#1a1a2e" />
      </linearGradient>

      {/* Drop shadow filter */}
      <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(0,0,0,0.3)" />
      </filter>

      {/* Glow filter for selected cards */}
      <filter id="card-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feFlood floodColor="#fbbf24" floodOpacity="0.6" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  </svg>
);

// Suit symbol component
export const SuitSymbol: React.FC<{
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  size?: number;
  className?: string;
}> = ({ suit, size = 24, className = '' }) => {
  const suitId = `suit-${suit.slice(0, -1)}`; // Remove 's' from end
  const isRed = suit === 'hearts' || suit === 'diamonds';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ color: isRed ? '#dc2626' : '#1e293b' }}
    >
      <use href={`#${suitId}`} />
    </svg>
  );
};

// Face card figures (J, Q, K)
export const FaceCardFigure: React.FC<{
  rank: 'J' | 'Q' | 'K';
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
}> = ({ rank, suit }) => {
  const isRed = suit === 'hearts' || suit === 'diamonds';
  const color = isRed ? '#dc2626' : '#1e293b';

  const figures = {
    J: (
      <g fill={color}>
        {/* Jack figure - stylized */}
        <ellipse cx="50" cy="30" rx="15" ry="18" fill={color} opacity="0.9" />
        <rect x="35" y="45" width="30" height="35" rx="5" fill={color} opacity="0.8" />
        <rect x="30" y="50" width="10" height="25" rx="3" fill={color} opacity="0.7" />
        <rect x="60" y="50" width="10" height="25" rx="3" fill={color} opacity="0.7" />
        <text x="50" y="36" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">J</text>
      </g>
    ),
    Q: (
      <g fill={color}>
        {/* Queen figure - stylized */}
        <ellipse cx="50" cy="28" rx="16" ry="18" fill={color} opacity="0.9" />
        <path d="M35 22 L50 8 L65 22" fill={isRed ? '#fbbf24' : '#64748b'} />
        <ellipse cx="50" cy="60" rx="20" ry="25" fill={color} opacity="0.8" />
        <text x="50" y="36" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">Q</text>
      </g>
    ),
    K: (
      <g fill={color}>
        {/* King figure - stylized */}
        <ellipse cx="50" cy="30" rx="16" ry="18" fill={color} opacity="0.9" />
        <path d="M30 18 L50 5 L70 18" fill={isRed ? '#fbbf24' : '#64748b'} />
        <rect x="33" y="45" width="34" height="40" rx="5" fill={color} opacity="0.8" />
        <rect x="28" y="50" width="12" height="28" rx="3" fill={color} opacity="0.7" />
        <rect x="60" y="50" width="12" height="28" rx="3" fill={color} opacity="0.7" />
        <text x="50" y="36" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">K</text>
      </g>
    ),
  };

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
      {figures[rank]}
    </svg>
  );
};

// Get pip positions for number cards
export const getPipPositions = (rank: string): { x: number; y: number; inverted?: boolean }[] => {
  const positions: Record<string, { x: number; y: number; inverted?: boolean }[]> = {
    'A': [{ x: 50, y: 50 }],
    '2': [{ x: 50, y: 20 }, { x: 50, y: 80, inverted: true }],
    '3': [{ x: 50, y: 20 }, { x: 50, y: 50 }, { x: 50, y: 80, inverted: true }],
    '4': [
      { x: 30, y: 20 }, { x: 70, y: 20 },
      { x: 30, y: 80, inverted: true }, { x: 70, y: 80, inverted: true }
    ],
    '5': [
      { x: 30, y: 20 }, { x: 70, y: 20 },
      { x: 50, y: 50 },
      { x: 30, y: 80, inverted: true }, { x: 70, y: 80, inverted: true }
    ],
    '6': [
      { x: 30, y: 20 }, { x: 70, y: 20 },
      { x: 30, y: 50 }, { x: 70, y: 50 },
      { x: 30, y: 80, inverted: true }, { x: 70, y: 80, inverted: true }
    ],
    '7': [
      { x: 30, y: 20 }, { x: 70, y: 20 },
      { x: 50, y: 35 },
      { x: 30, y: 50 }, { x: 70, y: 50 },
      { x: 30, y: 80, inverted: true }, { x: 70, y: 80, inverted: true }
    ],
    '8': [
      { x: 30, y: 20 }, { x: 70, y: 20 },
      { x: 50, y: 35 },
      { x: 30, y: 50 }, { x: 70, y: 50 },
      { x: 50, y: 65, inverted: true },
      { x: 30, y: 80, inverted: true }, { x: 70, y: 80, inverted: true }
    ],
    '9': [
      { x: 30, y: 18 }, { x: 70, y: 18 },
      { x: 30, y: 38 }, { x: 70, y: 38 },
      { x: 50, y: 50 },
      { x: 30, y: 62, inverted: true }, { x: 70, y: 62, inverted: true },
      { x: 30, y: 82, inverted: true }, { x: 70, y: 82, inverted: true }
    ],
    '10': [
      { x: 30, y: 15 }, { x: 70, y: 15 },
      { x: 50, y: 28 },
      { x: 30, y: 38 }, { x: 70, y: 38 },
      { x: 30, y: 62, inverted: true }, { x: 70, y: 62, inverted: true },
      { x: 50, y: 72, inverted: true },
      { x: 30, y: 85, inverted: true }, { x: 70, y: 85, inverted: true }
    ],
  };

  return positions[rank] || [];
};

export default CardSuitsSVG;
