import React from 'react';
import { Card } from './Card';
import { Card as CardType, Suit, SUIT_SYMBOLS, SUIT_NAMES_FA } from '../types';
import './Hand.css';

interface HandProps {
  cards: CardType[];
  onCardClick: (card: CardType) => void;
  selectedCard: CardType | null;
  isMyTurn: boolean;
  playableCards?: string[];
}

// Suit order for display - red suits left, black suits right
const SUIT_ORDER: Suit[] = ['hearts', 'diamonds', 'spades', 'clubs'];

// Sort cards by rank (A high, 2 low)
const RANK_ORDER: Record<string, number> = {
  'A': 14, 'K': 13, 'Q': 12, 'J': 11,
  '10': 10, '9': 9, '8': 8, '7': 7,
  '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
};

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

  // Group cards by suit
  const groupedCards = SUIT_ORDER.reduce((acc, suit) => {
    const suitCards = cards
      .filter(card => card.suit === suit)
      .sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
    if (suitCards.length > 0) {
      acc[suit] = suitCards;
    }
    return acc;
  }, {} as Record<Suit, CardType[]>);

  // Split into left column (red: hearts, diamonds) and right column (black: spades, clubs)
  const leftSuits: Suit[] = ['hearts', 'diamonds'];
  const rightSuits: Suit[] = ['spades', 'clubs'];

  const renderSuitGroup = (suit: Suit, suitCards: CardType[]) => (
    <div key={suit} className={`suit-group suit-${suit}`}>
      <div className="suit-header">
        <span className={`suit-symbol ${suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black'}`}>
          {SUIT_SYMBOLS[suit]}
        </span>
        <span className="suit-name">{SUIT_NAMES_FA[suit]}</span>
        <span className="suit-count">{suitCards.length}</span>
      </div>
      <div className="suit-cards">
        {suitCards.map((card, index) => {
          const isSelected = selectedCard?.id === card.id;
          return (
            <div
              key={card.id}
              className={`hand-card-wrapper ${isSelected ? 'selected' : ''}`}
              style={{
                zIndex: isSelected ? 100 : index + 1,
                animationDelay: `${index * 30}ms`,
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
  );

  const renderColumn = (suits: Suit[], columnClass: string) => (
    <div className={`hand-column ${columnClass}`}>
      {suits.map(suit =>
        groupedCards[suit] ? renderSuitGroup(suit, groupedCards[suit]) : null
      )}
    </div>
  );

  return (
    <div className={`hand-area ${isMyTurn ? 'my-turn' : ''}`}>
      {isMyTurn && (
        <div className="turn-badge">نوبت شما</div>
      )}
      <div className="hand-container">
        <div className="hand-columns">
          {renderColumn(leftSuits, 'left-column')}
          {renderColumn(rightSuits, 'right-column')}
        </div>
      </div>
    </div>
  );
};
