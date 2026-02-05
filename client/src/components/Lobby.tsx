import React, { useState } from 'react';
import './Lobby.css';

interface LobbyProps {
  onCreateGame: (playerName: string) => void;
  onJoinGame: (gameId: string, playerName: string) => void;
  telegramUser?: { firstName: string; lastName?: string };
}

export const Lobby: React.FC<LobbyProps> = ({
  onCreateGame,
  onJoinGame,
  telegramUser
}) => {
  const [playerName, setPlayerName] = useState(
    telegramUser ? `${telegramUser.firstName}${telegramUser.lastName ? ' ' + telegramUser.lastName : ''}` : ''
  );
  const [gameId, setGameId] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');

  const handleCreate = () => {
    if (playerName.trim()) {
      onCreateGame(playerName.trim());
    }
  };

  const handleJoin = () => {
    if (playerName.trim() && gameId.trim()) {
      onJoinGame(gameId.trim().toUpperCase(), playerName.trim());
    }
  };

  return (
    <div className="lobby">
      <div className="lobby-content">
        <div className="lobby-header">
          <h1>🃏 بازی حکم</h1>
          <p>بازی محبوب ایرانی</p>
        </div>

        {mode === 'menu' && (
          <div className="lobby-menu">
            <input
              type="text"
              placeholder="نام شما"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="lobby-input"
              maxLength={20}
            />

            <button
              className="lobby-button create"
              onClick={() => setMode('create')}
              disabled={!playerName.trim()}
            >
              🎮 ایجاد بازی جدید
            </button>

            <button
              className="lobby-button join"
              onClick={() => setMode('join')}
              disabled={!playerName.trim()}
            >
              🚪 پیوستن به بازی
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="lobby-create">
            <p className="create-info">
              یک بازی جدید ایجاد کنید و کد بازی را با دوستان به اشتراک بگذارید
            </p>
            <button className="lobby-button create" onClick={handleCreate}>
              ✨ شروع بازی
            </button>
            <button className="lobby-button back" onClick={() => setMode('menu')}>
              ← بازگشت
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="lobby-join">
            <input
              type="text"
              placeholder="کد بازی (مثال: ABC123)"
              value={gameId}
              onChange={(e) => setGameId(e.target.value.toUpperCase())}
              className="lobby-input"
              maxLength={10}
            />
            <button
              className="lobby-button join"
              onClick={handleJoin}
              disabled={!gameId.trim()}
            >
              ورود به بازی
            </button>
            <button className="lobby-button back" onClick={() => setMode('menu')}>
              ← بازگشت
            </button>
          </div>
        )}

        <div className="lobby-footer">
          <p>نسخه ۱.۰.۰</p>
        </div>
      </div>
    </div>
  );
};
