import React, { useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useTelegram } from '../hooks/useTelegram';
import { useGameStore } from '../store/gameStore';
import { WaitingRoom } from './WaitingRoom';
import { GameTable } from './GameTable';
import { Hand } from './Hand';
import { HokmSelector } from './HokmSelector';
import { ScoreBoard } from './ScoreBoard';
import { GameEndModal } from './GameEndModal';
import { Card } from './Card';
import { Card as CardType, Suit } from '../types';
import './Game.css';

export const Game: React.FC = () => {
  const {
    createGame,
    joinGame,
    leaveGame,
    setReady,
    selectHokm,
    playCard,
    setRoundsToWin,
    startGame,
    addBot,
    removeBot
  } = useSocket();

  const { initDataUnsafe, user, isReady } = useTelegram();

  const {
    gameState,
    myHand,
    hakemCards,
    playerId,
    isMyTurn,
    selectedCard,
    showHokmSelector,
    setSelectedCard,
    error,
    setError
  } = useGameStore();

  // استفاده از ref برای جلوگیری از join/create دوباره
  const hasJoinedRef = React.useRef(false);

  // Auto-join یا Auto-create بازی
  useEffect(() => {
    // اگر قبلاً join شده یا در حال join است، اجرا نشود
    if (gameState || hasJoinedRef.current) return;

    // صبر کردن تا تلگرام آماده شود
    if (!isReady) return;

    // یک تاخیر کوچک برای اطمینان از لود شدن user
    const timeoutId = setTimeout(() => {
      if (hasJoinedRef.current) return;

      // علامت‌گذاری که در حال join است
      hasJoinedRef.current = true;

      const playerName = user
        ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
        : 'بازیکن';

      // Telegram ID بازیکن
      const telegramId = user?.id?.toString();

      // دریافت gameId از چند منبع مختلف
      const urlParams = new URLSearchParams(window.location.search);
      let gameId = urlParams.get('gameId');

      console.log('[Game] Searching for gameId...');
      console.log('[Game] urlParams gameId:', gameId);

      // روش 1: از tgWebAppStartParam (تلگرام) - مستقیم از URL
      if (!gameId) {
        const tgStartParam = urlParams.get('tgWebAppStartParam');
        console.log('[Game] tgWebAppStartParam:', tgStartParam);
        if (tgStartParam && tgStartParam.startsWith('game_')) {
          gameId = tgStartParam.replace('game_', '');
          console.log('[Game] Extracted gameId from tgWebAppStartParam:', gameId);
        }
      }

      // روش 2: از initDataUnsafe (Telegram WebApp API)
      if (!gameId && initDataUnsafe?.start_param) {
        const startParam = initDataUnsafe.start_param;
        console.log('[Game] initDataUnsafe.start_param:', startParam);
        if (startParam.startsWith('game_')) {
          gameId = startParam.replace('game_', '');
          console.log('[Game] Extracted gameId from initDataUnsafe:', gameId);
        }
      }

      // روش 3: از hash (برخی نسخه‌های تلگرام)
      if (!gameId && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);

        // بررسی tgWebAppStartParam در hash
        const hashGameId = hashParams.get('tgWebAppStartParam');
        console.log('[Game] hash tgWebAppStartParam:', hashGameId);
        if (hashGameId && hashGameId.startsWith('game_')) {
          gameId = hashGameId.replace('game_', '');
          console.log('[Game] Extracted gameId from hash:', gameId);
        }

        // بررسی startapp در hash (روش دیگر تلگرام)
        if (!gameId) {
          const startapp = hashParams.get('startapp');
          console.log('[Game] hash startapp:', startapp);
          if (startapp && startapp.startsWith('game_')) {
            gameId = startapp.replace('game_', '');
            console.log('[Game] Extracted gameId from hash startapp:', gameId);
          }
        }
      }

      // روش 4: مستقیم از window.location.href (fallback)
      if (!gameId) {
        const href = window.location.href;
        console.log('[Game] Full URL:', href);

        const match = href.match(/[?&#](?:tgWebAppStartParam|startapp)=game_([A-Z0-9]+)/i);
        if (match) {
          gameId = match[1];
          console.log('[Game] Extracted gameId from URL regex:', gameId);
        }
      }

      console.log('[Game] Final gameId:', gameId);
      console.log('[Game] PlayerName:', playerName);
      console.log('[Game] TelegramId:', telegramId);

      if (gameId) {
        // پیوستن به بازی موجود
        console.log('[Game] Joining game:', gameId);
        joinGame(gameId, playerName, telegramId);
      } else {
        // ایجاد بازی جدید (اولین نفر)
        console.log('[Game] Creating new game');
        createGame(playerName, telegramId);
      }
    }, 500); // تاخیر 500 میلی‌ثانیه برای اطمینان از لود شدن user

    return () => clearTimeout(timeoutId);
  }, [gameState, isReady, user, initDataUnsafe, joinGame, createGame]);

  // پاک کردن خطا بعد از 3 ثانیه
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  const handleCardClick = (card: CardType) => {
    if (!isMyTurn) return;

    if (selectedCard?.id === card.id) {
      playCard(card.id);
      setSelectedCard(null);
    } else {
      setSelectedCard(card);
    }
  };

  const handleHokmSelect = (suit: Suit) => {
    if (suit) {
      selectHokm(suit);
    }
  };

  // صفحه لابی - فقط برای لودینگ
  if (!gameState) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>در حال اتصال...</p>
      </div>
    );
  }

  // اتاق انتظار
  if (gameState.phase === 'waiting') {
    return (
      <WaitingRoom
        gameId={gameState.id}
        players={gameState.players}
        myPlayerId={playerId}
        roundsToWin={gameState.roundsToWin}
        isCreator={gameState.players[0]?.id === playerId}
        onSetRoundsToWin={setRoundsToWin}
        onReady={setReady}
        onLeave={leaveGame}
        onStartGame={startGame}
        onAddBot={addBot}
        onRemoveBot={removeBot}
      />
    );
  }

  // فاز تعیین حاکم
  if (gameState.phase === 'determiningHakem') {
    return (
      <div className="hakem-determination">
        <div className="hakem-determination-content">
          <h2>تعیین حاکم</h2>
          <p>هر بازیکن یک کارت پیک دریافت می‌کند. کمترین کارت = حاکم</p>
          <div className="spade-cards">
            {gameState.hakemDeterminationCards.map(entry => {
              const player = gameState.players.find(p => p.id === entry.playerId);
              const isHakem = entry.playerId === gameState.hakemId;
              return (
                <div key={entry.playerId} className={`spade-card-entry ${isHakem ? 'is-hakem' : ''}`}>
                  <span className="spade-player-name">{player?.name}</span>
                  <Card card={entry.card} size="medium" isPlayable={false} />
                  {isHakem && <span className="hakem-label">حاکم!</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // پایان بازی
  if (gameState.phase === 'gameEnd') {
    return (
      <GameEndModal
        winningTeam={gameState.winningTeam!}
        gameScore={gameState.gameScore}
        myTeam={gameState.players.find(p => p.id === playerId)?.team || 'team1'}
        onPlayAgain={() => window.location.reload()}
        onExit={leaveGame}
      />
    );
  }

  // بازی در جریان - 3 zone layout
  return (
    <div className="game-container">
      {/* خطا */}
      {error && (
        <div className="error-toast">
          {error}
        </div>
      )}

      {/* Top bar: hokm + score */}
      <div className="game-top-bar">
        <ScoreBoard
          roundScore={gameState.roundScore}
          gameScore={gameState.gameScore}
          roundNumber={gameState.roundNumber}
          trickNumber={gameState.trickNumber}
          hokm={gameState.hokm}
          roundsToWin={gameState.roundsToWin}
          myTeam={gameState.players.find(p => p.id === playerId)?.team}
        />
      </div>

      {/* Middle: table */}
      <div className="game-middle">
        <GameTable
          players={gameState.players}
          currentTrick={gameState.currentTrick.cards}
          hokm={gameState.hokm}
          myPlayerId={playerId}
          hakemId={gameState.hakemId}
        />
      </div>

      {/* Bottom: hand */}
      <div className="game-bottom">
        <Hand
          cards={myHand}
          onCardClick={handleCardClick}
          selectedCard={selectedCard}
          isMyTurn={isMyTurn && gameState.phase === 'playing'}
        />
      </div>

      {/* انتخاب حکم */}
      <HokmSelector
        onSelect={handleHokmSelect}
        isVisible={showHokmSelector}
        hakemCards={hakemCards}
      />

      {/* نمایش فاز dealing */}
      {gameState.phase === 'dealing' && (
        <div className="dealing-overlay">
          <div className="dealing-message">
            در حال پخش کارت...
          </div>
        </div>
      )}

      {/* پایان دست */}
      {gameState.phase === 'roundEnd' && (
        <div className="round-end-overlay">
          <div className="round-end-message">
            <h2>پایان دست {gameState.roundNumber}</h2>
            {gameState.lastRoundResult === 'hakemKut' && (
              <div className="kut-badge hakem-kut">حاکم کُت! (+۳ امتیاز)</div>
            )}
            {gameState.lastRoundResult === 'kut' && (
              <div className="kut-badge kut">کُت! (+۲ امتیاز)</div>
            )}
            <div className="round-result">
              <span className="team1">تیم ۱: {gameState.roundScore.team1}</span>
              <span className="vs">-</span>
              <span className="team2">تیم ۲: {gameState.roundScore.team2}</span>
            </div>
            <p>دست بعدی به زودی شروع می‌شود...</p>
          </div>
        </div>
      )}
    </div>
  );
};
