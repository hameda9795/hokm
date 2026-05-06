import React from 'react';
import { Player, RoundsToWinOption } from '../types';
import { getPlayerAvatar } from '../utils/avatars';
import './WaitingRoom.css';

interface WaitingRoomProps {
  gameId: string;
  players: Player[];
  myPlayerId: string;
  roundsToWin: RoundsToWinOption;
  isCreator: boolean;
  onSetRoundsToWin: (value: RoundsToWinOption) => void;
  onReady: () => void;
  onLeave: () => void;
  onStartGame: () => void;
  onAddBot: () => void;
  onRemoveBot: (botId: string) => void;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({
  gameId,
  players,
  myPlayerId,
  roundsToWin,
  isCreator,
  onSetRoundsToWin,
  onReady,
  onLeave,
  onStartGame,
  onAddBot,
  onRemoveBot
}) => {
  const myPlayer = players.find(p => p.id === myPlayerId);
  const isReady = myPlayer?.isReady || false;
  const allReady = players.length === 4 && players.every(p => p.isReady);
  const canAddBot = isCreator && players.length < 4;

  const copyGameId = () => {
    navigator.clipboard.writeText(gameId);
  };

  return (
    <div className="waiting-room">
      <div className="waiting-content">
        <h2>اتاق انتظار</h2>

        <div className="game-id-box" onClick={copyGameId}>
          <span className="game-id-label">کد بازی:</span>
          <span className="game-id-value">{gameId}</span>
          <span className="copy-hint">برای کپی کلیک کنید</span>
        </div>

        {/* انتخاب تعداد دست‌ها */}
        <div className="wr-rounds-config">
          <span className="wr-rounds-label">هدف بازی:</span>
          <div className="wr-rounds-buttons">
            {([1, 3, 7] as RoundsToWinOption[]).map(n => (
              <button
                key={n}
                className={`wr-round-btn ${roundsToWin === n ? 'active' : ''}`}
                onClick={() => onSetRoundsToWin(n)}
                disabled={!isCreator}
              >
                {n} دست
              </button>
            ))}
          </div>
          {!isCreator && (
            <span className="wr-rounds-hint">فقط سازنده بازی می‌تواند تغییر دهد</span>
          )}
        </div>

        <div className="wr-players-grid">
          {[0, 1, 2, 3].map(position => {
            const player = players.find(p => p.position === position);
            const team = position % 2 === 0 ? 'team1' : 'team2';
            const avatarPath = player
              ? getPlayerAvatar(player.id, player.position, player.isBot || false, player.photoUrl)
              : null;

            return (
              <div key={position} className={`wr-slot ${player ? 'wr-filled' : 'wr-empty'} wr-${team}`}>
                <div className="wr-team-badge">
                  {team === 'team1' ? 'تیم ۱' : 'تیم ۲'}
                </div>
                {player ? (
                  <>
                    <div className={`wr-avatar-wrapper wr-${team}-frame`}>
                      <img
                        src={avatarPath!}
                        alt={player.name}
                        className="wr-avatar-img"
                        draggable={false}
                      />
                      {player.isBot && <span className="wr-bot-badge">🤖</span>}
                    </div>
                    <div className="wr-name">
                      {player.name}
                      {player.id === myPlayerId && <span className="wr-you"> (شما)</span>}
                    </div>
                    <div className={`wr-status ${player.isReady ? 'wr-ready' : 'wr-not-ready'}`}>
                      {player.isReady ? '✓ آماده' : 'در انتظار...'}
                    </div>
                    {/* دکمه حذف ربات - فقط برای سازنده */}
                    {isCreator && player.isBot && (
                      <button
                        className="wr-remove-bot-btn"
                        onClick={() => onRemoveBot(player.id)}
                      >
                        ✕
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {/* دکمه اضافه کردن ربات - فقط برای سازنده */}
                    {canAddBot ? (
                      <button className="wr-add-bot-btn" onClick={() => {
                        onAddBot();
                      }}>
                        <span className="wr-add-bot-icon">🤖</span>
                        <span className="wr-add-bot-text">افزودن ربات</span>
                      </button>
                    ) : (
                      <>
                        <div className="wr-empty-icon">+</div>
                        <div className="wr-empty-text">خالی</div>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="wr-hint">
          بازیکنان روبروی هم، هم‌تیمی هستند
        </div>

        <div className="wr-actions">
          {!isReady && players.length >= 1 && (
            <button className="wr-ready-btn" onClick={onReady}>
              آماده‌ام!
            </button>
          )}

          {/* دکمه تعیین حاکم - فقط برای سازنده وقتی همه آماده هستند */}
          {isCreator && allReady && (
            <button className="wr-start-btn" onClick={onStartGame}>
              🎴 تعیین حاکم
            </button>
          )}

          {isReady && !allReady && (
            <div className="wr-waiting-msg">
              منتظر بقیه بازیکنان...
            </div>
          )}

          {!isCreator && allReady && (
            <div className="wr-waiting-msg">
              منتظر سازنده برای شروع بازی...
            </div>
          )}

          <button className="wr-leave-btn" onClick={onLeave}>
            خروج
          </button>
        </div>

        <div className="wr-count">
          {players.length} از ۴ بازیکن
        </div>
      </div>
    </div>
  );
};
