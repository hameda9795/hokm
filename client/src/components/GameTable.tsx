import React from 'react';
import { Card } from './Card';
import { Card as CardType, Player, Suit } from '../types';
import { getPlayerAvatar } from '../utils/avatars';
import './GameTable.css';

interface GameTableProps {
  players: Player[];
  currentTrick: { playerId: string; card: CardType }[];
  hokm: Suit | null;
  myPlayerId: string;
  hakemId: string | null;
  currentPlayerId?: string | null;
}

export const GameTable: React.FC<GameTableProps> = ({
  players,
  currentTrick,
  hokm: _hokm,
  myPlayerId,
  hakemId,
  currentPlayerId
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

  // Calculate remaining cards for each player
  const getPlayerRemainingCards = (player: Player) => {
    const hasPlayedInTrick = currentTrick.some(t => t.playerId === player.id);
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
          const isCurrentTurn = player.id === currentPlayerId;
          const remainingCards = getPlayerRemainingCards(player);
          const avatarPath = getPlayerAvatar(player.id, player.position, player.isBot || false);

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

              {/* Player info with avatar */}
              <div className={`player-info ${isMe ? 'is-me' : ''} ${isCurrentTurn ? 'is-turn' : ''}`}>
                <div className={`player-avatar-wrapper ${player.isConnected ? '' : 'disconnected'} team-${player.team}`}>
                  <img
                    src={avatarPath}
                    alt={player.name}
                    className="player-avatar-img"
                    draggable={false}
                  />
                  {isHakem && <span className="hakem-crown">👑</span>}
                  {isCurrentTurn && <div className="turn-indicator" />}
                </div>
                <span className="player-name">{isMe ? 'شما' : player.name}</span>
                {!isMe && (
                  <span className="player-cards-count">{remainingCards}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
