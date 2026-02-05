import { Server, Socket } from 'socket.io';
import { gameManager } from '../game/GameManager.js';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  Suit,
  RoundsToWinOption
} from '../types/index.js';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export class SocketHandler {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
    this.setupConnectionHandler();
  }

  private setupConnectionHandler(): void {
    this.io.on('connection', (socket: GameSocket) => {
      console.log(`Client connected: ${socket.id}`);

      // ایجاد بازی جدید
      socket.on('game:create', (playerName: string, telegramId?: string) => {
        this.handleCreateGame(socket, playerName, telegramId);
      });

      // پیوستن به بازی
      socket.on('game:join', (gameId: string, playerName: string, telegramId?: string) => {
        this.handleJoinGame(socket, gameId, playerName, telegramId);
      });

      // خروج از بازی
      socket.on('game:leave', () => {
        this.handleLeaveGame(socket);
      });

      // اعلام آمادگی
      socket.on('game:ready', () => {
        this.handleReady(socket);
      });

      // تنظیم تعداد دست‌ها
      socket.on('game:setRoundsToWin', (roundsToWin: RoundsToWinOption) => {
        this.handleSetRoundsToWin(socket, roundsToWin);
      });

      // انتخاب حکم
      socket.on('game:selectHokm', (suit: Suit) => {
        this.handleSelectHokm(socket, suit);
      });

      // بازی کردن کارت
      socket.on('game:playCard', (cardId: string) => {
        this.handlePlayCard(socket, cardId);
      });

      // شروع بازی (تعیین حاکم) - فقط سازنده
      socket.on('game:startGame', () => {
        this.handleStartGame(socket);
      });

      // اضافه کردن ربات - فقط سازنده
      socket.on('game:addBot', () => {
        console.log(`[Server] Received game:addBot from ${socket.id}`);
        this.handleAddBot(socket);
      });

      // حذف ربات - فقط سازنده
      socket.on('game:removeBot', (botId: string) => {
        this.handleRemoveBot(socket, botId);
      });

      // قطع اتصال
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleCreateGame(socket: GameSocket, playerName: string, telegramId?: string): void {
    const gameId = gameManager.createGame();
    const player = gameManager.joinGame(gameId, socket.id, playerName, telegramId);

    if (player) {
      socket.join(gameId);
      const engine = gameManager.getGame(gameId)!;

      socket.emit('game:state', engine.getStateForPlayer(socket.id));
      console.log(`Game created: ${gameId} by ${playerName}`);
    } else {
      socket.emit('game:error', 'خطا در ایجاد بازی');
    }
  }

  private handleJoinGame(socket: GameSocket, gameId: string, playerName: string, telegramId?: string): void {
    const player = gameManager.joinGame(gameId, socket.id, playerName, telegramId);

    if (player) {
      socket.join(gameId);
      const engine = gameManager.getGame(gameId)!;

      // اطلاع‌رسانی به همه بازیکنان
      this.io.to(gameId).emit('game:playerJoined', player);

      // ارسال state به همه
      this.broadcastGameState(gameId);

      // اطلاع‌رسانی به گروه تلگرام
      const state = engine.getState();
      const playersInfo = state.players.map(p => ({
        name: p.name,
        telegramId: p.telegramId
      }));

      gameManager.notifyTelegramGroup(gameId, 'player_joined', {
        playerName,
        telegramId,
        playerCount: state.players.filter(p => p.isConnected).length,
        players: playersInfo
      });

      console.log(`${playerName} joined game ${gameId}`);
    } else {
      socket.emit('game:error', 'امکان پیوستن به بازی وجود ندارد');
    }
  }

  private handleLeaveGame(socket: GameSocket): void {
    const playerGame = gameManager.getPlayerGame(socket.id);
    if (playerGame) {
      const { gameId, engine } = playerGame;

      gameManager.leaveGame(socket.id);
      socket.leave(gameId);

      this.io.to(gameId).emit('game:playerLeft', socket.id);
      this.broadcastGameState(gameId);

      console.log(`Player left game ${gameId}`);
    }
  }

  private handleSetRoundsToWin(socket: GameSocket, roundsToWin: RoundsToWinOption): void {
    const playerGame = gameManager.getPlayerGame(socket.id);
    if (!playerGame) {
      socket.emit('game:error', 'شما در هیچ بازی نیستید');
      return;
    }

    const { gameId, engine } = playerGame;
    const result = engine.setRoundsToWin(roundsToWin);

    if (result) {
      this.broadcastGameState(gameId);
    } else {
      socket.emit('game:error', 'امکان تغییر تعداد دست‌ها وجود ندارد');
    }
  }

  private handleReady(socket: GameSocket): void {
    const playerGame = gameManager.getPlayerGame(socket.id);
    if (!playerGame) {
      socket.emit('game:error', 'شما در هیچ بازی نیستید');
      return;
    }

    const { gameId, engine } = playerGame;
    const result = engine.setPlayerReady(socket.id);

    if (result) {
      this.broadcastGameState(gameId);

      const state = engine.getState();

      // فاز تعیین حاکم (فقط دور اول)
      if (state.phase === 'determiningHakem') {
        // نمایش کارت‌های پیک به همه بازیکنان
        this.io.to(gameId).emit(
          'game:hakemDetermined',
          state.hakemId!,
          state.hakemDeterminationCards
        );

        // بعد از 3 ثانیه، انتقال به فاز پخش کارت
        setTimeout(() => {
          const currentEngine = gameManager.getGame(gameId);
          if (!currentEngine) return;

          currentEngine.proceedToDealing();
          this.broadcastGameState(gameId);

          // ارسال 5 کارت به حاکم
          const newState = currentEngine.getState();
          if (newState.phase === 'choosingHokm' && newState.hakemId) {
            this.io.to(newState.hakemId).emit('player:hakemCards', newState.hakemCards);
            // اگر حاکم Bot است، انتخاب خودکار حکم
            this.checkAndSelectHokm(gameId);
          }
        }, 3000);
      }

      // فاز انتخاب حکم (دورهای بعدی)
      if (state.phase === 'choosingHokm' && state.hakemId) {
        this.io.to(state.hakemId).emit('player:hakemCards', state.hakemCards);
        // اگر حاکم Bot است، انتخاب خودکار حکم
        this.checkAndSelectHokm(gameId);
      }
    }
  }

  private handleStartGame(socket: GameSocket): void {
    const playerGame = gameManager.getPlayerGame(socket.id);
    if (!playerGame) {
      socket.emit('game:error', 'شما در هیچ بازی نیستید');
      return;
    }

    const { gameId, engine } = playerGame;
    const state = engine.getState();

    // فقط نفر اول (سازنده) می‌تواند بازی را شروع کند
    if (state.players[0]?.id !== socket.id) {
      socket.emit('game:error', 'فقط سازنده بازی می‌تواند بازی را شروع کند');
      return;
    }

    // بررسی شرایط
    if (state.players.length !== 4) {
      socket.emit('game:error', 'باید 4 بازیکن در بازی باشند');
      return;
    }

    if (!state.players.every(p => p.isReady)) {
      socket.emit('game:error', 'همه بازیکنان باید آماده باشند');
      return;
    }

    const result = engine.startGame();

    if (result) {
      this.broadcastGameState(gameId);

      const newState = engine.getState();

      // فاز تعیین حاکم
      if (newState.phase === 'determiningHakem') {
        this.io.to(gameId).emit(
          'game:hakemDetermined',
          newState.hakemId!,
          newState.hakemDeterminationCards
        );

        // بعد از 3 ثانیه، انتقال به فاز پخش کارت
        setTimeout(() => {
          const currentEngine = gameManager.getGame(gameId);
          if (!currentEngine) return;

          currentEngine.proceedToDealing();
          this.broadcastGameState(gameId);

          // ارسال 5 کارت به حاکم
          const dealingState = currentEngine.getState();
          if (dealingState.phase === 'choosingHokm' && dealingState.hakemId) {
            this.io.to(dealingState.hakemId).emit('player:hakemCards', dealingState.hakemCards);
            // اگر حاکم Bot است، انتخاب خودکار حکم
            this.checkAndSelectHokm(gameId);
          }
        }, 4000);
      }
    } else {
      socket.emit('game:error', 'امکان شروع بازی وجود ندارد');
    }
  }

  private handleSelectHokm(socket: GameSocket, suit: Suit): void {
    const playerGame = gameManager.getPlayerGame(socket.id);
    if (!playerGame) {
      socket.emit('game:error', 'شما در هیچ بازی نیستید');
      return;
    }

    const { gameId, engine } = playerGame;
    const result = engine.selectHokm(socket.id, suit);

    if (result) {
      this.io.to(gameId).emit('game:hokmSelected', suit);

      // کارت‌ها پخش شدند، ارسال state جدید با دست‌های کامل
      this.broadcastGameState(gameId);

      // اعلام نوبت به بازیکن فعلی
      const state = engine.getState();
      if (state.currentPlayerId && state.phase === 'playing') {
        this.io.to(state.currentPlayerId).emit('game:yourTurn');

        // اگر نوبت Bot است، بازی می‌کند
        this.checkAndPlayBot(gameId);
      }

      console.log(`Hokm selected: ${suit} in game ${gameId}`);
    } else {
      socket.emit('game:error', 'شما حاکم نیستید یا نمی‌توانید حکم انتخاب کنید');
    }
  }

  private handlePlayCard(socket: GameSocket, cardId: string): void {
    const playerGame = gameManager.getPlayerGame(socket.id);
    if (!playerGame) {
      socket.emit('game:error', 'شما در هیچ بازی نیستید');
      return;
    }

    const { gameId, engine } = playerGame;
    const prevState = engine.getState();
    const result = engine.playCard(socket.id, cardId);

    if (result.success) {
      const state = engine.getState();
      const playedCard = prevState.players
        .find(p => p.id === socket.id)?.hand
        .find(c => c.id === cardId);

      if (playedCard) {
        this.io.to(gameId).emit('game:cardPlayed', socket.id, playedCard);
      }

      // بررسی اتمام trick (اگر قبل از بازی 3 کارت بود و الان 0 کارت است، یعنی کارت 4 بازی شد)
      if (state.currentTrick.cards.length === 0 && prevState.currentTrick.cards.length === 3) {
        const winnerId = state.lastTrickWinner;
        if (winnerId) {
          const winner = engine.getPlayer(winnerId);
          if (winner) {
            this.io.to(gameId).emit('game:trickWon', winnerId, winner.team);
          }
        }
      }

      // بررسی پایان دست
      if (state.phase === 'roundEnd' && prevState.phase === 'playing') {
        this.io.to(gameId).emit('game:roundEnd', state.roundScore, state.gameScore);
        this.broadcastGameState(gameId);

        // اگر بازی تمام نشده، بعد از 4 ثانیه دست بعدی شروع شود
        if (state.phase === 'roundEnd') {
          setTimeout(() => {
            const currentEngine = gameManager.getGame(gameId);
            if (!currentEngine) return;

            const currentState = currentEngine.getState();
            if (currentState.phase !== 'roundEnd') return; // احتمالاً بازی تمام شده

            currentEngine.startNextRound();
            this.broadcastGameState(gameId);

            // ارسال 5 کارت به حاکم جدید
            const newState = currentEngine.getState();
            if (newState.phase === 'choosingHokm' && newState.hakemId) {
              this.io.to(newState.hakemId).emit('player:hakemCards', newState.hakemCards);
            }
          }, 4000);
        }

        return; // state قبلاً broadcast شده
      }

      // بررسی پایان بازی
      if (state.phase === 'gameEnd') {
        this.io.to(gameId).emit('game:gameEnd', state.winningTeam!, state.gameScore);
      }

      // ارسال state جدید
      this.broadcastGameState(gameId);

      // اعلام نوبت
      if (state.currentPlayerId && state.phase === 'playing') {
        this.io.to(state.currentPlayerId).emit('game:yourTurn');

        // اگر نوبت Bot است، بازی می‌کند
        this.checkAndPlayBot(gameId);
      }
    } else {
      socket.emit('game:error', result.error || 'خطا در بازی کردن کارت');
    }
  }

  private handleDisconnect(socket: GameSocket): void {
    console.log(`Client disconnected: ${socket.id}`);

    const playerGame = gameManager.getPlayerGame(socket.id);
    if (playerGame) {
      const { gameId, engine } = playerGame;

      // بازیکن را disconnected می‌کنیم
      const player = engine.getPlayer(socket.id);
      if (player) {
        player.isConnected = false;

        // اگر بازی شروع شده، بازیکن را با Bot جایگزین می‌کنیم
        if (engine.getState().phase !== 'waiting') {
          engine.replaceWithBot(socket.id);
          console.log(`Player ${player.name} replaced with Bot in game ${gameId}`);
        }
      }

      this.io.to(gameId).emit('game:playerLeft', socket.id);
      this.broadcastGameState(gameId);

      // اگر نوبت این بازیکن بود، Bot بازی می‌کند
      this.checkAndPlayBot(gameId);
    }
  }

  private broadcastGameState(gameId: string): void {
    const engine = gameManager.getGame(gameId);
    if (!engine) return;

    const state = engine.getState();

    // ارسال state مخصوص هر بازیکن (فقط کارت‌های خودش را ببیند)
    state.players.forEach(player => {
      if (player.isConnected) {
        const playerState = engine.getStateForPlayer(player.id);
        this.io.to(player.id).emit('game:state', playerState);

        // ارسال دست بازیکن
        const fullPlayer = engine.getPlayer(player.id);
        if (fullPlayer) {
          this.io.to(player.id).emit('player:hand', fullPlayer.hand);
        }
      }
    });
  }

  /**
   * بررسی و بازی خودکار توسط Bot
   */
  private checkAndPlayBot(gameId: string): void {
    const engine = gameManager.getGame(gameId);
    if (!engine) return;

    // اگر نوبت Bot است (بازیکن disconnect شده یا Bot)
    if (engine.shouldBotPlay()) {
      // تأخیر برای طبیعی‌تر شدن بازی Bot (1-2 ثانیه)
      const delay = 1000 + Math.random() * 1000;

      setTimeout(() => {
        const currentEngine = gameManager.getGame(gameId);
        if (!currentEngine) return;

        // ذخیره state قبل از بازی
        const prevState = currentEngine.getState();
        const prevTrickLength = prevState.currentTrick.cards.length;

        const result = currentEngine.botPlayCard();

        if (result.success && result.playerId && result.cardId) {
          const state = currentEngine.getState();

          // یافتن کارت بازی شده از دست قبلی بازیکن (قبل از بازی)
          const playedCard = prevState.players
            .find(p => p.id === result.playerId)?.hand
            .find(c => c.id === result.cardId);

          if (playedCard) {
            this.io.to(gameId).emit('game:cardPlayed', result.playerId, playedCard);
            console.log(`Bot played card: ${playedCard.rank} of ${playedCard.suit}`);
          }

          // بررسی اتمام trick (از 4 کارت به 0 کارت)
          if (state.currentTrick.cards.length === 0 && prevTrickLength === 3) {
            const winnerId = state.lastTrickWinner;
            if (winnerId) {
              const winner = currentEngine.getPlayer(winnerId);
              if (winner) {
                this.io.to(gameId).emit('game:trickWon', winnerId, winner.team);
              }
            }
          }

          // بررسی پایان دست
          if (state.phase === 'roundEnd') {
            this.io.to(gameId).emit('game:roundEnd', state.roundScore, state.gameScore);
            this.broadcastGameState(gameId);

            // شروع دست بعدی
            setTimeout(() => {
              const currentEngine2 = gameManager.getGame(gameId);
              if (!currentEngine2) return;

              const currentState = currentEngine2.getState();
              if (currentState.phase !== 'roundEnd') return;

              currentEngine2.startNextRound();
              this.broadcastGameState(gameId);

              // انتخاب حکم توسط Bot اگر حاکم Bot است
              this.checkAndSelectHokm(gameId);
            }, 4000);

            return;
          }

          // بررسی پایان بازی
          if (state.phase === 'gameEnd') {
            this.io.to(gameId).emit('game:gameEnd', state.winningTeam!, state.gameScore);
          }

          // ارسال state جدید
          this.broadcastGameState(gameId);

          // اعلام نوبت
          if (state.currentPlayerId && state.phase === 'playing') {
            this.io.to(state.currentPlayerId).emit('game:yourTurn');

            // ادامه بازی Bot (برای موارد چند Bot)
            this.checkAndPlayBot(gameId);
          }
        }
      }, delay);
    }
  }

  /**
   * بررسی و انتخاب خودکار حکم توسط Bot
   */
  private checkAndSelectHokm(gameId: string): void {
    const engine = gameManager.getGame(gameId);
    if (!engine) return;

    // اگر حاکم Bot است (بازیکن disconnect شده یا Bot)
    if (engine.shouldBotSelectHokm()) {
      // تأخیر برای طبیعی‌تر شدن
      setTimeout(() => {
        const currentEngine = gameManager.getGame(gameId);
        if (!currentEngine) return;

        const selectedHokm = currentEngine.botSelectHokm();

        if (selectedHokm) {
          this.io.to(gameId).emit('game:hokmSelected', selectedHokm);
          console.log(`Bot selected hokm: ${selectedHokm}`);

          // ارسال state جدید
          this.broadcastGameState(gameId);

          const state = currentEngine.getState();
          if (state.currentPlayerId && state.phase === 'playing') {
            this.io.to(state.currentPlayerId).emit('game:yourTurn');

            // شروع بازی خودکار Bot
            this.checkAndPlayBot(gameId);
          }
        }
      }, 2000);
    }
  }

  /**
   * اضافه کردن ربات به بازی
   */
  private handleAddBot(socket: GameSocket): void {
    const gameInfo = gameManager.getPlayerGame(socket.id);
    if (!gameInfo) {
      socket.emit('game:error', 'شما در هیچ بازی‌ای نیستید');
      return;
    }

    const { gameId, engine } = gameInfo;

    // بررسی اینکه سازنده بازی است (بازیکن اول)
    const state = engine.getState();
    const isCreator = state.players[0]?.id === socket.id;
    if (!isCreator) {
      socket.emit('game:error', 'فقط سازنده بازی می‌تواند ربات اضافه کند');
      return;
    }

    // اضافه کردن ربات
    const botPlayer = engine.addBotPlayer();
    if (!botPlayer) {
      socket.emit('game:error', 'امکان اضافه کردن ربات وجود ندارد');
      return;
    }

    console.log(`Bot added to game ${gameId}: ${botPlayer.name}`);

    // اعلام به همه بازیکنان
    this.io.to(gameId).emit('game:playerJoined', botPlayer);
    this.broadcastGameState(gameId);
  }

  /**
   * حذف ربات از بازی
   */
  private handleRemoveBot(socket: GameSocket, botId: string): void {
    const gameInfo = gameManager.getPlayerGame(socket.id);
    if (!gameInfo) {
      socket.emit('game:error', 'شما در هیچ بازی‌ای نیستید');
      return;
    }

    const { gameId, engine } = gameInfo;

    // بررسی اینکه سازنده بازی است
    const state = engine.getState();
    const isCreator = state.players[0]?.id === socket.id;
    if (!isCreator) {
      socket.emit('game:error', 'فقط سازنده بازی می‌تواند ربات را حذف کند');
      return;
    }

    // حذف ربات
    const removed = engine.removeBotPlayer(botId);
    if (!removed) {
      socket.emit('game:error', 'ربات پیدا نشد');
      return;
    }

    console.log(`Bot removed from game ${gameId}: ${botId}`);

    // اعلام به همه بازیکنان
    this.io.to(gameId).emit('game:playerLeft', botId);
    this.broadcastGameState(gameId);
  }
}
