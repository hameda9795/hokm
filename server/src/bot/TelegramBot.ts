import { Bot, InlineKeyboard, Context } from 'grammy';
import { GameManager } from '../game/GameManager.js';
import { groupAuthService, GroupAuthService } from '../services/GroupAuthService.js';

interface BotConfig {
  token: string;
  miniAppUrl: string;
  gameManager: GameManager;
}

export class TelegramBot {
  private bot: Bot;
  private miniAppUrl: string;
  private gameManager: GameManager;
  private activeTournaments: Map<number, string> = new Map(); // chatId -> gameId
  private groupAuthService: GroupAuthService;

  constructor(config: BotConfig) {
    this.bot = new Bot(config.token);
    this.miniAppUrl = config.miniAppUrl;
    this.gameManager = config.gameManager;
    this.groupAuthService = groupAuthService;

    this.setupCommands();
    this.setupMiddleware();
    this.setupAdminHandlers();  // Admin handlers FIRST (before message:text catches everything)
    this.setupHandlers();
  }

  private setupCommands() {
    this.bot.api.setMyCommands([
      { command: 'start', description: '🎮 شروع بات' },
      { command: 'play', description: '🃏 شروع بازی در گروه' },
      { command: 'newgame', description: '🆕 ایجاد بازی جدید' },
      { command: 'status', description: '📊 وضعیت بازی فعلی' },
      { command: 'help', description: '❓ راهنمای بازی' },
      { command: 'cancel', description: '❌ لغو بازی فعلی' }
    ]);
  }

  // Middleware برای بررسی مجوز گروه
  private setupMiddleware() {
    this.bot.use(async (ctx, next) => {
      // در چت خصوصی همیشه اجازه بده (برای دستورات ادمین)
      if (ctx.chat?.type === 'private') {
        await next();
        return;
      }

      // فقط برای گروه‌ها چک کن
      if (ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup') {
        const chatId = ctx.chat.id;
        const messageText = ctx.message?.text || '';

        // پیام‌های فعالسازی را همیشه اجازه بده (برای ادمین)
        if (/^\/?(فعالسازی|gameactive|فعال‌سازی|active)$/i.test(messageText)) {
          await next();
          return;
        }

        const authResult = this.groupAuthService.checkAuthorization(chatId);
        const adminUsername = this.groupAuthService.getAdminUsername();

        if (authResult.status === 'authorized') {
          // گروه مجاز است
          await next();
        } else if (authResult.status === 'expired') {
          // اعتبار تمام شده
          // فقط یک بار پیام بده (برای هر دستور نه)
          const messageText = ctx.message?.text || '';
          if (messageText.startsWith('/play') || messageText.startsWith('/newgame') ||
              messageText === 'بازی حکم' || messageText === 'بازی' || messageText === 'حکم بازی') {
            await ctx.reply(
              '⚠️ اعتبار استفاده از ربات در این گروه به پایان رسیده است.\n\n' +
              `📅 تاریخ انقضا: ${authResult.group?.expiresAt.toLocaleDateString('fa-IR')}\n` +
              `📩 برای تمدید به @${adminUsername} پیام دهید.`
            );
          }
          // دستورات /help و /status رو بذار کار کنه
          if (messageText.startsWith('/help') || messageText.startsWith('/status')) {
            await next();
          }
        } else {
          // گروه مجاز نیست
          const messageText = ctx.message?.text || '';
          if (messageText.startsWith('/play') || messageText.startsWith('/newgame') ||
              messageText.startsWith('/start') ||
              messageText === 'بازی حکم' || messageText === 'بازی' || messageText === 'حکم بازی') {
            await ctx.reply(
              '❌ این گروه مجوز استفاده از ربات را ندارد.\n\n' +
              `📩 برای دریافت مجوز به @${adminUsername} پیام دهید.`
            );
          }
        }
      }
    });
  }

  private setupHandlers() {
    // دستور شروع
    this.bot.command('start', async (ctx) => {
      const startParam = ctx.match;
      const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

      // اگر در گروه هستیم، به handlePlayCommand هدایت کن
      if (isGroup) {
        await this.handlePlayCommand(ctx, true);
        return;
      }

      // در چت خصوصی
      if (startParam && startParam.startsWith('game_')) {
        // Deep link برای پیوستن به بازی
        const gameId = startParam.replace('game_', '');
        const gameUrl = `${this.miniAppUrl}?gameId=${gameId}`;

        const keyboard = new InlineKeyboard()
          .webApp('🎴 پیوستن به بازی', gameUrl);

        await ctx.reply(
          `🎮 بازی حکم\n\n` +
          `کد بازی: ${gameId}\n\n` +
          `برای پیوستن روی دکمه زیر کلیک کنید:`,
          { reply_markup: keyboard }
        );
      } else {
        // پیام خوش‌آمدگویی معمولی
        const keyboard = new InlineKeyboard()
          .webApp('🎮 شروع بازی', this.miniAppUrl);

        await ctx.reply(
          '🃏 به بازی حکم خوش آمدید!\n\n' +
          'برای شروع بازی روی دکمه زیر کلیک کنید یا از دستور /help برای راهنما استفاده کنید.',
          { reply_markup: keyboard }
        );
      }
    });

    // دستور بازی در گروه
    this.bot.command('play', async (ctx) => {
      await this.handlePlayCommand(ctx);
    });

    // ایجاد بازی جدید
    this.bot.command('newgame', async (ctx) => {
      await this.handlePlayCommand(ctx, true);
    });

    // شنیدن همه پیام‌های متنی برای شروع بازی با فارسی
    this.bot.on('message:text', async (ctx) => {
      const text = ctx.message.text.trim();
      console.log('[Bot] Received message:', text, 'in chat type:', ctx.chat?.type);

      // بررسی متن‌های فارسی برای شروع بازی
      if (text === 'بازی حکم' || text === 'بازی' || text === 'حکم بازی') {
        if (ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup') {
          console.log('[Bot] Starting game from Persian text');
          await this.handlePlayCommand(ctx, true);
        }
      }
    });

    // callback query برای دکمه‌های inline
    this.bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;

      if (data.startsWith('join_')) {
        const gameId = data.replace('join_', '');
        const user = ctx.from;
        const gameUrl = `${this.miniAppUrl}?gameId=${gameId}`;

        await ctx.answerCallbackQuery({
          url: gameUrl
        });
      }
    });

    // وضعیت بازی
    this.bot.command('status', async (ctx) => {
      await this.handleStatusCommand(ctx);
    });

    // لغو بازی
    this.bot.command('cancel', async (ctx) => {
      await this.handleCancelCommand(ctx);
    });

    // راهنما
    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        '📖 راهنمای بازی حکم\n\n' +
        '🎯 هدف بازی:\n' +
        'گرفتن ۷ دست از ۱۳ دست برای بردن هر راند\n\n' +
        '👥 بازیکنان:\n' +
        '۴ نفر در ۲ تیم (بازیکنان روبروی هم هم‌تیمی هستند)\n\n' +
        '👑 حاکم:\n' +
        'بازیکنی که حکم (خال برنده) را انتخاب می‌کند\n\n' +
        '📜 قوانین:\n' +
        '• باید از خال درخواستی بازی کنید (اگر دارید)\n' +
        '• حکم همیشه بقیه خال‌ها را می‌زند\n' +
        '• اگر تیم بازنده هیچ دستی نبرده باشد (کاپ)، ۲ امتیاز می‌گیرید\n\n' +
        '🏆 پیروزی:\n' +
        'تیمی که اول به ۷ امتیاز برسد برنده است!\n\n' +
        '💡 دستورات:\n' +
        '/play - شروع بازی در گروه\n' +
        '/newgame - ایجاد بازی جدید\n' +
        '/status - وضعیت بازی فعلی\n' +
        '/cancel - لغو بازی\n' +
        '/help - نمایش این راهنما'
      );
    });

    // Handle errors
    this.bot.catch((err) => {
      console.error('Bot error:', err);
    });
  }

  // دستورات مدیریت برای ادمین
  private setupAdminHandlers() {
    // فعالسازی گروه با پیام متنی در گروه (با یا بدون /)
    this.bot.hears(/^\/?(فعالسازی|gameactive|فعال‌سازی|active)$/i, async (ctx) => {
      // فقط در گروه
      if (ctx.chat?.type !== 'group' && ctx.chat?.type !== 'supergroup') {
        return;
      }

      // فقط ادمین اصلی
      const userId = ctx.from?.id;
      if (!userId || !this.groupAuthService.isAdmin(userId)) {
        return; // بدون پیام خطا - فقط نادیده بگیر
      }

      const chatId = ctx.chat.id;
      const chatTitle = ctx.chat.title || 'گروه';

      // چک کن آیا گروه قبلا فعاله
      const existing = this.groupAuthService.getGroupInfo(chatId);
      if (existing && existing.expiresAt > new Date()) {
        const daysLeft = Math.ceil((existing.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        await ctx.reply(
          `✅ این گروه از قبل فعال است!\n\n` +
          `📋 نام: ${existing.groupName}\n` +
          `⏰ ${daysLeft} روز باقیمانده\n\n` +
          `برای تمدید یکی از گزینه‌ها را انتخاب کنید:`,
          {
            reply_markup: new InlineKeyboard()
              .text('➕ 7 روز', `extend_${chatId}_7`).text('➕ 14 روز', `extend_${chatId}_14`).row()
              .text('➕ 30 روز', `extend_${chatId}_30`).text('➕ 60 روز', `extend_${chatId}_60`).row()
              .text('➕ 90 روز', `extend_${chatId}_90`)
          }
        );
        return;
      }

      // نمایش دکمه‌های انتخاب مدت
      const keyboard = new InlineKeyboard()
        .text('7 روز', `activate_${chatId}_7_${encodeURIComponent(chatTitle)}`).text('14 روز', `activate_${chatId}_14_${encodeURIComponent(chatTitle)}`).row()
        .text('30 روز', `activate_${chatId}_30_${encodeURIComponent(chatTitle)}`).text('60 روز', `activate_${chatId}_60_${encodeURIComponent(chatTitle)}`).row()
        .text('90 روز', `activate_${chatId}_90_${encodeURIComponent(chatTitle)}`);

      await ctx.reply(
        `🎮 فعالسازی ربات برای گروه "${chatTitle}"\n\n` +
        `لطفاً مدت اعتبار را انتخاب کنید:`,
        { reply_markup: keyboard }
      );
    });

    // هندل کردن دکمه‌های فعالسازی
    this.bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;
      const userId = ctx.from?.id;

      // فقط ادمین اصلی
      if (!userId || !this.groupAuthService.isAdmin(userId)) {
        await ctx.answerCallbackQuery({ text: '❌ فقط مالک ربات میتواند این کار را انجام دهد.' });
        return;
      }

      // فعالسازی گروه
      if (data.startsWith('activate_')) {
        const parts = data.split('_');
        const chatId = parseInt(parts[1]);
        const days = parseInt(parts[2]);
        const chatTitle = decodeURIComponent(parts.slice(3).join('_'));

        try {
          const group = this.groupAuthService.addGroup(chatId, chatTitle, days, ctx.from?.username || 'admin');
          await ctx.editMessageText(
            `✅ گروه با موفقیت فعال شد!\n\n` +
            `📋 نام: ${chatTitle}\n` +
            `⏰ اعتبار: ${days} روز\n` +
            `📅 تا تاریخ: ${group.expiresAt.toLocaleDateString('fa-IR')}\n\n` +
            `حالا میتونید با دستور /play بازی رو شروع کنید! 🎮`
          );
          await ctx.answerCallbackQuery({ text: '✅ گروه فعال شد!' });
        } catch (error) {
          await ctx.answerCallbackQuery({ text: '❌ خطا در فعالسازی' });
        }
        return;
      }

      // تمدید گروه
      if (data.startsWith('extend_')) {
        const parts = data.split('_');
        const chatId = parseInt(parts[1]);
        const days = parseInt(parts[2]);

        try {
          const group = this.groupAuthService.extendGroup(chatId, days);
          if (group) {
            await ctx.editMessageText(
              `✅ اعتبار گروه تمدید شد!\n\n` +
              `📋 نام: ${group.groupName}\n` +
              `➕ ${days} روز اضافه شد\n` +
              `📅 اعتبار تا: ${group.expiresAt.toLocaleDateString('fa-IR')}`
            );
            await ctx.answerCallbackQuery({ text: '✅ تمدید شد!' });
          }
        } catch (error) {
          await ctx.answerCallbackQuery({ text: '❌ خطا در تمدید' });
        }
        return;
      }
    });

    // اضافه کردن گروه (دستور قدیمی هم کار کنه)
    this.bot.command('addgroup', async (ctx) => {
      if (!await this.isAdminCommand(ctx)) return;

      const args = ctx.match?.split(' ') || [];
      if (args.length < 2) {
        await ctx.reply(
          '❌ فرمت دستور نادرست است.\n\n' +
          '✅ فرمت صحیح:\n' +
          '`/addgroup <chatId> <days> [name]`\n\n' +
          '📝 مثال:\n' +
          '`/addgroup -1001234567890 30 گروه دوستان`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const chatId = parseInt(args[0]);
      const days = parseInt(args[1]);
      const groupName = args.slice(2).join(' ') || `گروه ${chatId}`;

      if (isNaN(chatId) || isNaN(days)) {
        await ctx.reply('❌ chatId و days باید عدد باشند.');
        return;
      }

      if (days <= 0) {
        await ctx.reply('❌ تعداد روز باید بزرگتر از صفر باشد.');
        return;
      }

      try {
        const group = this.groupAuthService.addGroup(chatId, groupName, days, ctx.from?.username || 'admin');
        await ctx.reply(
          `✅ گروه با موفقیت اضافه شد!\n\n` +
          `📋 نام: ${group.groupName}\n` +
          `🆔 شناسه: \`${group.chatId}\`\n` +
          `📅 اعتبار تا: ${group.expiresAt.toLocaleDateString('fa-IR')}\n` +
          `⏰ روز باقیمانده: ${days}`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        await ctx.reply(`❌ خطا در اضافه کردن گروه: ${error}`);
      }
    });

    // حذف گروه
    this.bot.command('removegroup', async (ctx) => {
      if (!await this.isAdminCommand(ctx)) return;

      const chatIdStr = ctx.match?.trim();
      if (!chatIdStr) {
        await ctx.reply(
          '❌ لطفاً شناسه گروه را وارد کنید.\n\n' +
          '✅ فرمت صحیح:\n' +
          '`/removegroup <chatId>`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const chatId = parseInt(chatIdStr);
      if (isNaN(chatId)) {
        await ctx.reply('❌ شناسه گروه باید عدد باشد.');
        return;
      }

      const removed = this.groupAuthService.removeGroup(chatId);
      if (removed) {
        await ctx.reply(`✅ گروه \`${chatId}\` با موفقیت حذف شد.`, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply(`❌ گروهی با شناسه \`${chatId}\` یافت نشد.`, { parse_mode: 'Markdown' });
      }
    });

    // تمدید گروه
    this.bot.command('extendgroup', async (ctx) => {
      if (!await this.isAdminCommand(ctx)) return;

      const args = ctx.match?.split(' ') || [];
      if (args.length < 2) {
        await ctx.reply(
          '❌ فرمت دستور نادرست است.\n\n' +
          '✅ فرمت صحیح:\n' +
          '`/extendgroup <chatId> <days>`\n\n' +
          '📝 مثال:\n' +
          '`/extendgroup -1001234567890 30`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const chatId = parseInt(args[0]);
      const days = parseInt(args[1]);

      if (isNaN(chatId) || isNaN(days)) {
        await ctx.reply('❌ chatId و days باید عدد باشند.');
        return;
      }

      if (days <= 0) {
        await ctx.reply('❌ تعداد روز باید بزرگتر از صفر باشد.');
        return;
      }

      const group = this.groupAuthService.extendGroup(chatId, days);
      if (group) {
        await ctx.reply(
          `✅ اعتبار گروه تمدید شد!\n\n` +
          `📋 نام: ${group.groupName}\n` +
          `🆔 شناسه: \`${group.chatId}\`\n` +
          `📅 اعتبار جدید تا: ${group.expiresAt.toLocaleDateString('fa-IR')}`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply(`❌ گروهی با شناسه \`${chatId}\` یافت نشد.`, { parse_mode: 'Markdown' });
      }
    });

    // لیست گروه‌ها
    this.bot.command('groups', async (ctx) => {
      if (!await this.isAdminCommand(ctx)) return;

      const groups = this.groupAuthService.getAllGroups();
      const stats = this.groupAuthService.getStats();

      if (groups.length === 0) {
        await ctx.reply('📋 هیچ گروهی ثبت نشده است.');
        return;
      }

      let message = `📋 لیست گروه‌ها (${stats.total} گروه)\n`;
      message += `✅ فعال: ${stats.active} | ❌ منقضی: ${stats.expired}\n`;
      message += '━━━━━━━━━━━━━━━\n\n';

      const now = new Date();
      groups.forEach((group, idx) => {
        const isExpired = group.expiresAt < now;
        const statusIcon = isExpired ? '❌' : '✅';
        const daysLeft = Math.ceil((group.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        message += `${idx + 1}. ${statusIcon} ${group.groupName}\n`;
        message += `   🆔 \`${group.chatId}\`\n`;
        message += `   📅 ${group.expiresAt.toLocaleDateString('fa-IR')}`;
        message += isExpired ? ' (منقضی)' : ` (${daysLeft} روز)`;
        message += '\n\n';
      });

      await ctx.reply(message, { parse_mode: 'Markdown' });
    });

    // اطلاعات یک گروه
    this.bot.command('groupinfo', async (ctx) => {
      if (!await this.isAdminCommand(ctx)) return;

      const chatIdStr = ctx.match?.trim();
      if (!chatIdStr) {
        await ctx.reply(
          '❌ لطفاً شناسه گروه را وارد کنید.\n\n' +
          '✅ فرمت صحیح:\n' +
          '`/groupinfo <chatId>`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const chatId = parseInt(chatIdStr);
      if (isNaN(chatId)) {
        await ctx.reply('❌ شناسه گروه باید عدد باشد.');
        return;
      }

      const group = this.groupAuthService.getGroupInfo(chatId);
      if (!group) {
        await ctx.reply(`❌ گروهی با شناسه \`${chatId}\` یافت نشد.`, { parse_mode: 'Markdown' });
        return;
      }

      const now = new Date();
      const isExpired = group.expiresAt < now;
      const daysLeft = Math.ceil((group.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      await ctx.reply(
        `📊 اطلاعات گروه\n\n` +
        `📋 نام: ${group.groupName}\n` +
        `🆔 شناسه: \`${group.chatId}\`\n` +
        `📅 تاریخ ایجاد: ${group.createdAt.toLocaleDateString('fa-IR')}\n` +
        `📅 تاریخ انقضا: ${group.expiresAt.toLocaleDateString('fa-IR')}\n` +
        `⏰ وضعیت: ${isExpired ? '❌ منقضی شده' : `✅ فعال (${daysLeft} روز باقیمانده)`}\n` +
        `👤 اضافه شده توسط: @${group.addedBy}`,
        { parse_mode: 'Markdown' }
      );
    });

    // راهنمای ادمین
    this.bot.command('adminhelp', async (ctx) => {
      if (!await this.isAdminCommand(ctx)) return;

      await ctx.reply(
        '🔧 دستورات مدیریت\n\n' +
        '📝 مدیریت گروه‌ها:\n' +
        '`/addgroup <chatId> <days> [name]` - اضافه کردن گروه\n' +
        '`/removegroup <chatId>` - حذف گروه\n' +
        '`/extendgroup <chatId> <days>` - تمدید اعتبار\n' +
        '`/groups` - لیست همه گروه‌ها\n' +
        '`/groupinfo <chatId>` - اطلاعات گروه\n\n' +
        '💡 نکته: برای گرفتن chatId گروه، ربات را به گروه اضافه کنید و هر پیامی بفرستید. آیدی در لاگ سرور نشان داده می‌شود.',
        { parse_mode: 'Markdown' }
      );
    });
  }

  // بررسی دسترسی ادمین
  private async isAdminCommand(ctx: Context): Promise<boolean> {
    console.log(`[AdminCheck] Chat type: ${ctx.chat?.type}, User ID: ${ctx.from?.id}`);

    if (ctx.chat?.type !== 'private') {
      console.log('[AdminCheck] Not private chat, rejecting');
      return false;
    }

    const userId = ctx.from?.id;
    if (!userId) {
      console.log('[AdminCheck] No user ID found');
      return false;
    }

    const isAdmin = this.groupAuthService.isAdmin(userId);
    console.log(`[AdminCheck] User ${userId} isAdmin: ${isAdmin}`);

    if (!isAdmin) {
      await ctx.reply('❌ شما دسترسی ادمین ندارید.');
      return false;
    }

    return true;
  }

  private async handlePlayCommand(ctx: Context, forceNew: boolean = false) {
    if (ctx.chat?.type === 'private') {
      await ctx.reply('⚠️ این دستور فقط در گروه کار می‌کند!');
      return;
    }

    const chatId = ctx.chat!.id;
    const user = ctx.from!;
    let gameId = this.activeTournaments.get(chatId);

    // اگر بازی فعالی نیست یا forceNew باشد، بازی جدید بساز
    if (!gameId || forceNew) {
      gameId = this.gameManager.createGame();
      this.activeTournaments.set(chatId, gameId);
      // ثبت chatId برای اطلاع‌رسانی‌های بعدی
      this.gameManager.setGameTelegramChat(gameId, chatId);
      // ثبت سازنده بازی
      this.gameManager.setGameCreator(gameId, user.id, user.username);
    } else {
      // بررسی کن که بازی هنوز منتظر بازیکن است
      const game = this.gameManager.getGame(gameId);
      if (game && game.getState().phase !== 'waiting') {
        gameId = this.gameManager.createGame();
        this.activeTournaments.set(chatId, gameId);
        this.gameManager.setGameTelegramChat(gameId, chatId);
        this.gameManager.setGameCreator(gameId, user.id, user.username);
      }
    }

    // لینک مستقیم به Mini App با پارامتر startapp
    // فرمت صحیح: https://t.me/botusername/appname?startapp=parameter
    const botUsername = ctx.me.username;
    const miniAppUrl = `https://t.me/${botUsername}/hokmgeram?startapp=game_${gameId}`;

    // نام کاربر برای نمایش
    const creatorName = user.username
      ? `@${user.username}`
      : `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;
    const creatorLink = user.username
      ? `[${creatorName}](tg://user?id=${user.id})`
      : `[${user.first_name}](tg://user?id=${user.id})`;

    const keyboard = new InlineKeyboard()
      .url('🎴 پیوستن به بازی', miniAppUrl);

    await ctx.reply(
      '🎮 بازی حکم شروع شد!\n\n' +
      `🎯 کد بازی: \`${gameId}\`\n` +
      `👑 سازنده: ${creatorLink}\n` +
      '👥 بازیکنان: 0/4\n\n' +
      '🔹 روی دکمه زیر کلیک کنید تا وارد بازی شوید\n' +
      '🔹 یا لینک را با دوستان خود به اشتراک بگذارید',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      }
    );
  }

  private async handleStatusCommand(ctx: Context) {
    if (ctx.chat?.type === 'private') {
      await ctx.reply('⚠️ این دستور فقط در گروه کار می‌کند!');
      return;
    }

    const chatId = ctx.chat!.id;
    const gameId = this.activeTournaments.get(chatId);

    if (!gameId) {
      await ctx.reply('❌ هیچ بازی فعالی در این گروه وجود ندارد.\n\nبرای شروع از دستور /play استفاده کنید.');
      return;
    }

    const game = this.gameManager.getGame(gameId);
    if (!game) {
      this.activeTournaments.delete(chatId);
      await ctx.reply('❌ بازی یافت نشد. لطفاً بازی جدیدی با /play ایجاد کنید.');
      return;
    }

    const state = game.getState();
    const playerCount = state.players.filter(p => p.isConnected).length;

    let statusText = `📊 وضعیت بازی\n\n`;
    statusText += `🎯 کد بازی: \`${gameId}\`\n`;

    // نمایش سازنده بازی
    const creator = this.gameManager.getGameCreator(gameId);
    if (creator.telegramId) {
      const creatorLink = creator.username
        ? `[@${creator.username}](tg://user?id=${creator.telegramId})`
        : `[سازنده](tg://user?id=${creator.telegramId})`;
      statusText += `👑 سازنده: ${creatorLink}\n`;
    }

    statusText += `👥 بازیکنان: ${playerCount}/4\n`;
    statusText += `📍 مرحله: ${this.getPhaseText(state.phase)}\n\n`;

    if (playerCount > 0) {
      statusText += '👤 بازیکنان:\n';
      state.players.forEach((p, idx) => {
        const icon = p.isConnected ? '✅' : '❌';
        // ساختن لینک به پروفایل تلگرام
        const playerLink = p.telegramId
          ? `[${p.name}](tg://user?id=${p.telegramId})`
          : p.name;
        const teamLabel = p.team === 'team1' ? '(تیم ۱)' : '(تیم ۲)';
        statusText += `${icon} ${playerLink} ${teamLabel}\n`;
      });
    }

    if (state.phase === 'playing') {
      statusText += `\n🏆 امتیازات:\n`;
      statusText += `تیم ۱: ${state.gameScore.team1} | تیم ۲: ${state.gameScore.team2}\n`;
      statusText += `دست جاری: تیم ۱: ${state.roundScore.team1} | تیم ۲: ${state.roundScore.team2}\n`;
    }

    await ctx.reply(statusText, { parse_mode: 'Markdown' });
  }

  private async handleCancelCommand(ctx: Context) {
    if (ctx.chat?.type === 'private') {
      await ctx.reply('⚠️ این دستور فقط در گروه کار می‌کند!');
      return;
    }

    const chatId = ctx.chat!.id;
    const gameId = this.activeTournaments.get(chatId);

    if (!gameId) {
      await ctx.reply('❌ هیچ بازی فعالی برای لغو وجود ندارد.');
      return;
    }

    this.activeTournaments.delete(chatId);
    await ctx.reply('✅ بازی لغو شد.\n\nبرای شروع بازی جدید از /play استفاده کنید.');
  }

  private getPhaseText(phase: string): string {
    const phases: Record<string, string> = {
      'waiting': '⏳ در انتظار بازیکنان',
      'selectingHokm': '👑 انتخاب حکم',
      'playing': '🎮 در حال بازی',
      'roundEnd': '🎊 پایان دست',
      'gameEnd': '🏁 پایان بازی'
    };
    return phases[phase] || phase;
  }

  // متد برای ارسال اطلاع‌رسانی به گروه
  async notifyGameUpdate(chatId: number, message: string, keyboard?: InlineKeyboard) {
    try {
      await this.bot.api.sendMessage(chatId, message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // متد برای ارسال اطلاع‌رسانی انقضا به گروه‌های منقضی
  async notifyExpiredGroups() {
    const expiredGroups = this.groupAuthService.getExpiredGroupsToNotify();
    const adminUsername = this.groupAuthService.getAdminUsername();

    for (const group of expiredGroups) {
      try {
        await this.bot.api.sendMessage(group.chatId,
          '⚠️ اعتبار استفاده از ربات در این گروه به پایان رسیده است.\n\n' +
          `📅 تاریخ انقضا: ${group.expiresAt.toLocaleDateString('fa-IR')}\n` +
          `📩 برای تمدید به @${adminUsername} پیام دهید.`
        );
        this.groupAuthService.markAsNotified(group.chatId);
        console.log(`[Bot] Sent expiration notice to group ${group.chatId}`);
      } catch (error) {
        console.error(`[Bot] Failed to send expiration notice to ${group.chatId}:`, error);
      }
    }
  }

  // شروع بات
  async start() {
    await this.bot.start({
      onStart: (botInfo) => {
        console.log(`
╔═══════════════════════════════════════╗
║     🤖 Telegram Bot Started 🤖        ║
╠═══════════════════════════════════════╣
║  Bot: @${botInfo.username?.padEnd(29) || 'Unknown'.padEnd(29)} ║
║  Mini App: ${this.miniAppUrl.substring(0, 23).padEnd(23)}    ║
╚═══════════════════════════════════════╝
        `);
      }
    });
  }

  // توقف بات
  stop() {
    this.bot.stop();
  }

  getBot() {
    return this.bot;
  }

  getGroupAuthService() {
    return this.groupAuthService;
  }
}
