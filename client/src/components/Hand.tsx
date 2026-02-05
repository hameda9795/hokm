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

  // Calculate overlap based on card count to fit all cards
  const getOverlapStyle = () => {
    // More cards = more overlap
    if (totalCards <= 5) return { marginLeft: '-15px' };
    if (totalCards <= 8) return { marginLeft: '-20px' };
    if (totalCards <= 10) return { marginLeft: '-25px' };
    return { marginLeft: '-30px' };
  };

  return (
    <div className={`hand-area ${isMyTurn ? 'my-turn' : ''}`}>
      {isMyTurn && (
        <div className="turn-badge">نوبت شما</div>
      )}
      <div className="hand-container">
        <div className="hand-cards" style={{ '--card-count': totalCards } as React.CSSProperties}>
          {cards.map((card, index) => {
            const isSelected = selectedCard?.id === card.id;

            return (
              <div
                key={card.id}
                className={`hand-card-wrapper ${isSelected ? 'selected' : ''}`}
                style={{
                  zIndex: isSelected ? 100 : index + 1,
                  animationDelay: `${index * 50}ms`,
                  ...(index > 0 ? getOverlapStyle() : {}),
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
