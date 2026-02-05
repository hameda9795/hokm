import React from 'react';
import { Card as CardType } from '../types';
import './Card.css';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  isSelected?: boolean;
  isPlayable?: boolean;
  size?: 'small' | 'medium' | 'large';
  faceDown?: boolean;
}

// Map rank to file naming convention
const getRankFileName = (rank: string): string => {
  const rankMap: Record<string, string> = {
    'A': 'ace',
    'J': 'jack',
    'Q': 'queen',
    'K': 'king',
  };
  return rankMap[rank] || rank;
};

// Get the card image path
const getCardImagePath = (suit: string, rank: string): string => {
  const rankName = getRankFileName(rank);
  return `/cards/${suit}_${rankName}.svg`;
};

export const Card: React.FC<CardProps> = ({
  card,
  onClick,
  isSelected = false,
  isPlayable = true,
  size = 'medium',
  faceDown = false
}) => {
  const sizeClasses = {
    small: 'card-small',
    medium: 'card-medium',
    large: 'card-large'
  };

  const cardImagePath = faceDown
    ? '/cards/card_back.svg'
    : getCardImagePath(card.suit, card.rank);

  return (
    <div
      className={`card ${sizeClasses[size]} ${isSelected ? 'card-selected' : ''} ${isPlayable ? 'card-playable' : 'card-disabled'} ${faceDown ? 'card-back' : ''}`}
      onClick={isPlayable ? onClick : undefined}
    >
      <img
        src={cardImagePath}
        alt={faceDown ? 'Card back' : `${card.rank} of ${card.suit}`}
        className="card-image"
        draggable={false}
      />
      {/* Shine overlay for premium effect */}
      <div className="card-shine" />
    </div>
  );
};
