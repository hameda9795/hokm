import React from 'react';
import { Card } from './Card';
import { Card as CardType, Player, Suit } from '../types';
import './GameTable.css';

interface GameTableProps {
  players: Player[];
  currentTrick: { playerId: string; card: CardType }[];
  hokm: Suit | null;
  myPlayerId: string;
  hakemId: string | null;
}

export const GameTable: React.FC<GameTableProps> = ({
  players,
  currentTrick,
  hokm: _hokm,
  myPlayerId,
  hakemId
}) => {
  const getRelativePosition = (playerPosition: number) => {
    const myPlayer = players.find(p => p.id === myPlayerId);
    if (!myPlayer) return playerPosition;
    const diff = (playerPosition - myPlayer.position + 4) % 4;
    return diff;
  };

  // خلاف عقربه ساعت: نفر بعدی سمت راست، نفر قبلی سمت چپ
  const positionClasses = ['bottom', 'left', 'top', 'right'];

  const getCardForPlayer = (playerId: string) => {
    return currentTrick.find(t => t.playerId === playerId)?.card;
  };

  // Calculate remaining cards for each player (13 - cards played)
  const getPlayerRemainingCards = (player: Player) => {
    // Each player starts with 13 cards
    // We count how many cards they've played in current trick
    const hasPlayedInTrick = currentTrick.some(t => t.playerId === player.id);
    // For display purposes, show their hand count
    return player.hand?.length || (13 - (hasPlayedInTrick ? 1 : 0));
  };

  return (
    <div className="game-table">
      <div className="table-felt">
        {/* Cards played on table */}
        <div className="table-center">
          {players.map(player => {
            const relPos = getRelativePosition(player.position);
            const card = getCardForPlayer(player.id);
            return (
              <div key={player.id} className={`table-card-slot ${positionClasses[relPos]}`}>
                {card && <Card card={card} size="small" />}
              </div>
            );
          })}
        </div>

        {/* Player labels around the table with face-down cards */}
        {players.map(player => {
          const relPos = getRelativePosition(player.position);
          const isHakem = player.id === hakemId;
          const isMe = player.id === myPlayerId;
          const remainingCards = getPlayerRemainingCards(player);

          return (
            <div key={player.id} className={`player-slot ${positionClasses[relPos]}`}>
              {/* Face-down cards for other players */}
              {!isMe && (
                <div className={`player-cards-back ${positionClasses[relPos]}`}>
                  {Array.from({ length: Math.min(remainingCards, 13) }).map((_, i) => (
                    <div
                      key={i}
                      className="card-back-mini"
                      style={{
                        '--card-index': i,
                        '--total-cards': remainingCards
                      } as React.CSSProperties}
                    />
                  ))}
                </div>
              )}

              {/* Player info */}
              <div className={`player-info ${isMe ? 'is-me' : ''}`}>
                <div className={`player-chip ${player.isConnected ? '' : 'disconnected'} team-${player.team}`}>
                  <span className="player-chip-letter">
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                  {isHakem && <span className="hakem-crown">H</span>}
                </div>
                <span className="player-name">{player.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
