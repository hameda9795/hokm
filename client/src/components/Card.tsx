import React from 'react';
import { Card as CardType, SUIT_SYMBOLS, SUIT_COLORS } from '../types';
import './Card.css';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  isSelected?: boolean;
  isPlayable?: boolean;
  size?: 'small' | 'medium' | 'large';
  faceDown?: boolean;
}

export const Card: React.FC<CardProps> = ({
  card,
  onClick,
  isSelected = false,
  isPlayable = true,
  size = 'medium',
  faceDown = false
}) => {
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const suitColor = SUIT_COLORS[card.suit];

  const sizeClasses = {
    small: 'card-small',
    medium: 'card-medium',
    large: 'card-large'
  };

  if (faceDown) {
    return (
      <div className={`card card-back ${sizeClasses[size]}`}>
        <div className="card-back-pattern">🃏</div>
      </div>
    );
  }

  return (
    <div
      className={`card ${sizeClasses[size]} ${isSelected ? 'card-selected' : ''} ${isPlayable ? 'card-playable' : 'card-disabled'}`}
      onClick={isPlayable ? onClick : undefined}
      style={{ '--suit-color': suitColor } as React.CSSProperties}
    >
      <div className="card-corner card-corner-top">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit">{suitSymbol}</span>
      </div>

      <div className="card-center">
        <span className="card-suit-large">{suitSymbol}</span>
      </div>

      <div className="card-corner card-corner-bottom">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit">{suitSymbol}</span>
      </div>
    </div>
  );
};
