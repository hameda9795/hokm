import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { webhookCallback } from 'grammy';
import { SocketHandler } from './socket/SocketHandler.js';
import { gameManager } from './game/GameManager.js';
import { TelegramBot } from './bot/TelegramBot.js';
import {
  ServerToClientEvents,
  ClientToServerEvents
} from './types/index.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS configuration - اجازه به همه origin‌ها برای تست
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Socket.IO setup
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize socket handler
new SocketHandler(io);

// Health check endpoint for Docker and Nginx
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/stats', (req, res) => {
  res.json(gameManager.getStats());
});

app.get('/api/games', (req, res) => {
  const games = gameManager.getWaitingGames().map(g => ({
    gameId: g.gameId,
    players: g.state.players.length,
    maxPlayers: 4
  }));
  res.json(games);
});

// Cleanup inactive games every 5 minutes
setInterval(() => {
  const cleaned = gameManager.cleanupInactiveGames(30);
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} inactive games`);
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;

// Initialize Telegram Bot if token is provided
let telegramBot: TelegramBot | null = null;
const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const miniAppUrl = process.env.TELEGRAM_WEBHOOK_DOMAIN || process.env.MINI_APP_URL;

if (botToken && miniAppUrl) {
  telegramBot = new TelegramBot({
    token: botToken,
    miniAppUrl: miniAppUrl,
    gameManager
  });

  // Use Webhook in Production, Polling in Development
  if (process.env.NODE_ENV === 'production') {
    console.log('🚀 Starting Telegram Bot in WEBHOOK mode...');
    // Setup webhook route
    // Note: Nginx forwards /webhook/* to this server
    app.use('/webhook/telegram', webhookCallback(telegramBot.getBot(), 'express'));

    // Log webhook info
    console.log(`📡 Webhook endpoint ready at /webhook/telegram`);
  } else {
    console.log('🔄 Starting Telegram Bot in POLLING mode...');
    telegramBot.start().catch(err => {
      console.error('Failed to start Telegram bot:', err);
    });
  }
} else {
  console.warn('⚠️  Telegram bot not initialized. Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_DOMAIN in .env file.');
}

// اتصال بات به GameManager برای اطلاع‌رسانی
if (telegramBot) {
  gameManager.setNotificationCallback(async (gameId, chatId, event, data) => {
    try {
      let message = '';

      switch (event) {
        case 'player_joined':
          // ساختن لینک به پروفایل تلگرام
          const playerLink = data.telegramId
            ? `[${data.playerName}](tg://user?id=${data.telegramId})`
            : data.playerName;

          // لیست بازیکنان فعلی
          let playersList = '';
          if (data.players && data.players.length > 0) {
            playersList = '\n\n👥 بازیکنان:\n';
            data.players.forEach((player: { name: string; telegramId?: string }, idx: number) => {
              const pLink = player.telegramId
                ? `[${player.name}](tg://user?id=${player.telegramId})`
                : player.name;
              playersList += `${idx + 1}. ${pLink}\n`;
            });
          }

          message = `✅ ${playerLink} به بازی پیوست!\n👥 بازیکنان: ${data.playerCount}/4${playersList}`;
          break;
        case 'game_started':
          message = `🎮 بازی شروع شد!\n👑 حاکم: ${data.hakemName}`;
          break;
        case 'round_ended':
          message = `🎊 دست ${data.roundNumber} تمام شد!\n🏆 امتیازات:\nتیم ۱: ${data.team1Score} | تیم ۲: ${data.team2Score}`;
          break;
        case 'game_ended':
          message = `🏁 بازی تمام شد!\n🎉 تیم ${data.winningTeam} برنده شد!\n\n💯 امتیاز نهایی:\nتیم ۱: ${data.team1Score} | تیم ۲: ${data.team2Score}`;
          break;
      }

      if (message && telegramBot) {
        await telegramBot.notifyGameUpdate(chatId, message);
      }
    } catch (error) {
      console.error('Error sending game notification:', error);
    }
  });
}

httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║     🃏 Hokm Game Server Running 🃏     ║
╠═══════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(33)} ║
║  Mode: ${(process.env.NODE_ENV || 'development').padEnd(33)} ║
║  Bot:  ${telegramBot ? (process.env.NODE_ENV === 'production' ? '📡 Webhook' : '🔄 Polling').padEnd(33) : '❌ Disabled'.padEnd(33)} ║
╚═══════════════════════════════════════╝
  `);
});

export { io, app, httpServer, telegramBot };
