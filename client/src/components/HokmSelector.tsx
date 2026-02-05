import React from 'react';
import { Card as CardType, Suit, SUITS, SUIT_SYMBOLS, SUIT_NAMES_FA, SUIT_COLORS } from '../types';
import { Card } from './Card';
import './HokmSelector.css';

interface HokmSelectorProps {
  onSelect: (suit: Suit) => void;
  isVisible: boolean;
  hakemCards: CardType[];
}

export const HokmSelector: React.FC<HokmSelectorProps> = ({ onSelect, isVisible, hakemCards }) => {
  if (!isVisible) return null;

  return (
    <div className="hokm-selector-overlay">
      <div className="hokm-selector">
        <h2 className="hokm-title">👑 انتخاب حکم</h2>
        <p className="hokm-subtitle">شما حاکم هستید! ابتدا ۵ کارت خود را ببینید و سپس حکم را انتخاب کنید</p>

        {/* نمایش 5 کارت اول حاکم */}
        {hakemCards.length > 0 && (
          <div className="hakem-preview-cards">
            <p className="preview-label">کارت‌های شما:</p>
            <div className="preview-cards-row">
              {hakemCards.map(card => (
                <Card
                  key={card.id}
                  card={card}
                  size="small"
                  isPlayable={false}
                />
              ))}
            </div>
          </div>
        )}

        <div className="suit-options">
          {SUITS.map(suit => (
            <button
              key={suit}
              className="suit-button"
              onClick={() => onSelect(suit)}
              style={{
                '--suit-color': SUIT_COLORS[suit]
              } as React.CSSProperties}
            >
              <span className="suit-symbol">{SUIT_SYMBOLS[suit]}</span>
              <span className="suit-name">{SUIT_NAMES_FA[suit]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
