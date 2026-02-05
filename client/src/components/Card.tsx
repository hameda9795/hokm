import React from 'react';
import { Card as CardType } from '../types';
import { getPipPositions } from './CardAssets';
import './Card.css';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  isSelected?: boolean;
  isPlayable?: boolean;
  size?: 'small' | 'medium' | 'large';
  faceDown?: boolean;
}

// Suit configurations with proper colors
const SUIT_CONFIG = {
  hearts: { symbol: '♥', color: '#dc2626' },
  diamonds: { symbol: '♦', color: '#e11d48' },
  clubs: { symbol: '♣', color: '#1e293b' },
  spades: { symbol: '♠', color: '#0f172a' },
};

export const Card: React.FC<CardProps> = ({
  card,
  onClick,
  isSelected = false,
  isPlayable = true,
  size = 'medium',
  faceDown = false
}) => {
  const suitConfig = SUIT_CONFIG[card.suit];
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const isFaceCard = ['J', 'Q', 'K'].includes(card.rank);
  const isAce = card.rank === 'A';

  const sizeClasses = {
    small: 'card-small',
    medium: 'card-medium',
    large: 'card-large'
  };

  // Card back design
  if (faceDown) {
    return (
      <div className={`card card-back ${sizeClasses[size]}`}>
        <div className="card-back-inner">
          <div className="card-back-pattern">
            <div className="card-back-border" />
            <div className="card-back-center">
              <div className="card-back-diamond" />
              <div className="card-back-ornament">
                <span className="cbo-suit cbo-spade">♠</span>
                <span className="cbo-suit cbo-heart">♥</span>
              </div>
              <div className="card-back-ornament">
                <span className="cbo-suit cbo-diamond">♦</span>
                <span className="cbo-suit cbo-club">♣</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render pip layout for number cards (2-10)
  const renderPips = () => {
    const positions = getPipPositions(card.rank);
    return (
      <div className="card-pips">
        {positions.map((pos, i) => (
          <span
            key={i}
            className={`card-pip ${pos.inverted ? 'inverted' : ''}`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
            }}
          >
            {suitConfig.symbol}
          </span>
        ))}
      </div>
    );
  };

  // Render face card (J, Q, K)
  const renderFaceCard = () => {
    const faceLabels: Record<string, { label: string; icon: string }> = {
      J: { label: 'JACK', icon: '⚔' },
      Q: { label: 'QUEEN', icon: '👑' },
      K: { label: 'KING', icon: '♔' },
    };
    const face = faceLabels[card.rank];

    return (
      <div className="card-face-figure">
        <div className="face-card-frame">
          <div className="face-card-portrait">
            <div className="face-portrait-bg" />
            <span className="face-card-icon">{face.icon}</span>
            <span className="face-card-letter">{card.rank}</span>
          </div>
          <div className="face-card-suits">
            <span className="face-suit-corner tl">{suitConfig.symbol}</span>
            <span className="face-suit-corner br">{suitConfig.symbol}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render Ace with large center suit
  const renderAce = () => (
    <div className="card-ace-center">
      <div className="ace-ornament-top" />
      <span className="ace-suit-large">{suitConfig.symbol}</span>
      <div className="ace-ornament-bottom" />
    </div>
  );

  return (
    <div
      className={`card ${sizeClasses[size]} ${isSelected ? 'card-selected' : ''} ${isPlayable ? 'card-playable' : 'card-disabled'} ${isRed ? 'card-red' : 'card-black'}`}
      onClick={isPlayable ? onClick : undefined}
      style={{ '--suit-color': suitConfig.color } as React.CSSProperties}
    >
      {/* Card face */}
      <div className="card-face">
        {/* Top-left corner */}
        <div className="card-corner card-corner-top">
          <span className="card-rank">{card.rank}</span>
          <span className="card-suit-small">{suitConfig.symbol}</span>
        </div>

        {/* Card center content */}
        <div className="card-center-content">
          {isFaceCard && renderFaceCard()}
          {isAce && renderAce()}
          {!isFaceCard && !isAce && renderPips()}
        </div>

        {/* Bottom-right corner (inverted) */}
        <div className="card-corner card-corner-bottom">
          <span className="card-rank">{card.rank}</span>
          <span className="card-suit-small">{suitConfig.symbol}</span>
        </div>

        {/* Shine overlay */}
        <div className="card-shine" />
      </div>
    </div>
  );
};
