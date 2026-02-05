import React from 'react';
import { Card } from './Card';
import { Card as CardType } from '../types';
import './Hand.css';

interface HandProps {
  cards: CardType[];
  onCardClick: (card: CardType) => void;
  selectedCard: CardType | null;
  isMyTurn: boolean;
  playableCards?: string[];
}

export const Hand: React.FC<HandProps> = ({
  cards,
  onCardClick,
  selectedCard,
  isMyTurn,
  playableCards
}) => {
  const isCardPlayable = (card: CardType) => {
    if (!isMyTurn) return false;
    if (playableCards && playableCards.length > 0) {
      return playableCards.includes(card.id);
    }
    return true;
  };

  const totalCards = cards.length;

  // Simple arc: rotation only, positioned with flexbox
  const getCardRotation = (index: number) => {
    if (totalCards <= 1) return 0;
    const maxAngle = Math.min(40, totalCards * 3); // Max 40 degrees spread
    const step = maxAngle / (totalCards - 1);
    return -maxAngle / 2 + step * index;
  };

  return (
    <div className={`hand-area ${isMyTurn ? 'my-turn' : ''}`}>
      {isMyTurn && (
        <div className="turn-badge">نوبت شما</div>
      )}
      <div className="hand-scroll">
        <div className="hand-cards">
          {cards.map((card, index) => {
            const isSelected = selectedCard?.id === card.id;
            const rotation = getCardRotation(index);

            return (
              <div
                key={card.id}
                className={`hand-card-wrapper ${isSelected ? 'selected' : ''}`}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  zIndex: isSelected ? 100 : index + 1,
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <Card
                  card={card}
                  onClick={() => onCardClick(card)}
                  isSelected={isSelected}
                  isPlayable={isCardPlayable(card)}
                  size="large"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
