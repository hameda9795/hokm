import { HokmEngine } from './HokmEngine.js';
import { GameState, Player } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

interface GameSession {
  engine: HokmEngine;
  createdAt: Date;
  lastActivity: Date;
  telegramChatId?: number; // برای اطلاع‌رسانی در گروه
  creatorTelegramId?: number; // Telegram ID سازنده بازی
  creatorTelegramUsername?: string; // Username سازنده بازی
}

/**
 * مدیریت چند بازی همزمان
 */
export class GameManager {
  private games: Map<string, GameSession> = new Map();
  private playerToGame: Map<string, string> = new Map(); // playerId -> gameId
  private notificationCallback?: (gameId: string, chatId: number, event: string, data?: any) => void;

  createGame(): string {
    const gameId = uuidv4().substring(0, 8).toUpperCase();
    const engine = new HokmEngine(gameId);

    this.games.set(gameId, {
      engine,
      createdAt: new Date(),
      lastActivity: new Date()
    });

    return gameId;
  }

  getGame(gameId: string): HokmEngine | null {
    const session = this.games.get(gameId);
    if (session) {
      session.lastActivity = new Date();
      return session.engine;
    }
    return null;
  }

  joinGame(gameId: string, playerId: string, playerName: string, telegramId?: string): Player | null {
    const engine = this.getGame(gameId);
    if (!engine) return null;

    const player = engine.addPlayer(playerId, playerName, telegramId);
    if (player) {
      this.playerToGame.set(playerId, gameId);
    }
    return player;
  }

  leaveGame(playerId: string): boolean {
    const gameId = this.playerToGame.get(playerId);
    if (!gameId) return false;

    const engine = this.getGame(gameId);
    if (!engine) return false;

    const result = engine.removePlayer(playerId);
    if (result) {
      this.playerToGame.delete(playerId);
    }

    // اگر همه بازیکنان رفتند، بازی را حذف کن
    const state = engine.getState();
    if (state.players.length === 0 || state.players.every(p => !p.isConnected)) {
      this.games.delete(gameId);
    }

    return result;
  }

  getPlayerGame(playerId: string): { gameId: string; engine: HokmEngine } | null {
    const gameId = this.playerToGame.get(playerId);
    if (!gameId) return null;

    const engine = this.getGame(gameId);
    if (!engine) return null;

    return { gameId, engine };
  }

  getAllGames(): Array<{ gameId: string; state: GameState }> {
    return Array.from(this.games.entries()).map(([gameId, session]) => ({
      gameId,
      state: session.engine.getState()
    }));
  }

  getWaitingGames(): Array<{ gameId: string; state: GameState }> {
    return this.getAllGames().filter(g => g.state.phase === 'waiting' && g.state.players.length < 4);
  }

  // پاکسازی بازی‌های غیرفعال
  cleanupInactiveGames(maxInactiveMinutes: number = 30): number {
    const now = new Date();
    let cleaned = 0;

    for (const [gameId, session] of this.games.entries()) {
      const inactiveMinutes = (now.getTime() - session.lastActivity.getTime()) / 60000;
      if (inactiveMinutes > maxInactiveMinutes) {
        // حذف بازیکنان از mapping
        const state = session.engine.getState();
        state.players.forEach(p => this.playerToGame.delete(p.id));

        this.games.delete(gameId);
        cleaned++;
      }
    }

    return cleaned;
  }

  getStats(): { totalGames: number; activePlayers: number; waitingGames: number } {
    return {
      totalGames: this.games.size,
      activePlayers: this.playerToGame.size,
      waitingGames: this.getWaitingGames().length
    };
  }

  // تنظیم callback برای اطلاع‌رسانی
  setNotificationCallback(callback: (gameId: string, chatId: number, event: string, data?: any) => void) {
    this.notificationCallback = callback;
  }

  // اضافه کردن telegram chat به بازی
  setGameTelegramChat(gameId: string, chatId: number) {
    const session = this.games.get(gameId);
    if (session) {
      session.telegramChatId = chatId;
    }
  }

  // دریافت telegram chat از بازی
  getGameTelegramChat(gameId: string): number | undefined {
    return this.games.get(gameId)?.telegramChatId;
  }

  // تنظیم سازنده بازی
  setGameCreator(gameId: string, telegramId: number, username?: string) {
    const session = this.games.get(gameId);
    if (session) {
      session.creatorTelegramId = telegramId;
      session.creatorTelegramUsername = username;
    }
  }

  // دریافت اطلاعات سازنده بازی
  getGameCreator(gameId: string): { telegramId?: number; username?: string } {
    const session = this.games.get(gameId);
    return {
      telegramId: session?.creatorTelegramId,
      username: session?.creatorTelegramUsername
    };
  }

  // بررسی آیا کاربر سازنده بازی است
  isGameCreator(gameId: string, telegramId: number): boolean {
    const session = this.games.get(gameId);
    return session?.creatorTelegramId === telegramId;
  }

  // اطلاع‌رسانی به گروه تلگرام
  notifyTelegramGroup(gameId: string, event: string, data?: any) {
    const session = this.games.get(gameId);
    if (session?.telegramChatId && this.notificationCallback) {
      this.notificationCallback(gameId, session.telegramChatId, event, data);
    }
  }
}

// Singleton instance
export const gameManager = new GameManager();
