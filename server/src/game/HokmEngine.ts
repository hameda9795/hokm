import { v4 as uuidv4 } from 'uuid';
import {
  Card,
  Suit,
  Rank,
  Player,
  PlayerPosition,
  TeamId,
  GameState,
  GamePhase,
  Trick,
  DealingStage,
  RoundResultType,
  RoundsToWinOption,
  SUITS,
  RANKS,
  RANK_VALUES,
  TRICKS_TO_WIN_ROUND,
  DEFAULT_ROUNDS_TO_WIN
} from '../types/index.js';
import { botPlayer } from '../bot/BotPlayer.js';

/**
 * موتور بازی حکم
 * تمام قوانین و منطق بازی در اینجا پیاده‌سازی شده
 */
export class HokmEngine {
  private state: GameState;
  private remainingDeck: Card[] = [];

  constructor(gameId?: string) {
    this.state = this.createInitialState(gameId || uuidv4());
  }

  // ============================================
  // ایجاد وضعیت اولیه
  // ============================================

  private createInitialState(gameId: string): GameState {
    return {
      id: gameId,
      phase: 'waiting',
      players: [],
      hakemId: null,
      hokm: null,
      currentTrick: { cards: [], leadSuit: null, winnerId: null },
      currentPlayerId: null,
      roundScore: { team1: 0, team2: 0 },
      gameScore: { team1: 0, team2: 0 },
      roundNumber: 1,
      trickNumber: 1,
      leadPlayerId: null,
      lastTrickWinner: null,
      winningTeam: null,
      hakemCards: [],
      roundsToWin: DEFAULT_ROUNDS_TO_WIN,
      dealingStage: null,
      hakemDeterminationCards: [],
      lastRoundResult: null,
      lastRoundPoints: null
    };
  }

  // ============================================
  // مدیریت بازیکنان
  // ============================================

  addPlayer(id: string, name: string, telegramId?: string, photoUrl?: string): Player | null {
    if (this.state.players.length >= 4) {
      return null;
    }

    if (this.state.phase !== 'waiting') {
      return null;
    }

    // تعیین موقعیت و تیم بازیکن
    const position = this.state.players.length as PlayerPosition;
    const team: TeamId = position % 2 === 0 ? 'team1' : 'team2';

    const player: Player = {
      id,
      name,
      telegramId,
      photoUrl,
      position,
      team,
      hand: [],
      isReady: false,
      isConnected: true,
      isBot: false
    };

    this.state.players.push(player);
    return player;
  }

  removePlayer(playerId: string): boolean {
    const index = this.state.players.findIndex(p => p.id === playerId);
    if (index === -1) return false;

    if (this.state.phase === 'waiting') {
      this.state.players.splice(index, 1);
      // بازنشانی موقعیت‌ها
      this.state.players.forEach((p, i) => {
        p.position = i as PlayerPosition;
        p.team = i % 2 === 0 ? 'team1' : 'team2';
      });
    } else {
      // اگر بازی شروع شده، بازیکن را disconnected می‌کنیم
      this.state.players[index].isConnected = false;
    }

    return true;
  }

  /**
   * جایگزینی بازیکن قطع شده با Bot
   * بازیکن قبلی حفظ می‌شود ولی isBot = true می‌شود
   */
  replaceWithBot(playerId: string): boolean {
    const player = this.getPlayer(playerId);
    if (!player) return false;

    // بازیکن را به Bot تبدیل می‌کنیم
    player.isBot = true;
    player.isConnected = true; // Bot همیشه متصل است
    player.name = `Bot (${player.name})`;

    return true;
  }

  /**
   * اضافه کردن ربات به slot خالی
   * فقط در فاز waiting و توسط سازنده بازی قابل استفاده است
   */
  addBotPlayer(): Player | null {
    if (this.state.players.length >= 4) {
      return null;
    }

    if (this.state.phase !== 'waiting') {
      return null;
    }

    // ایجاد ID یکتا برای ربات
    const botNumber = this.state.players.filter(p => p.isBot).length + 1;
    const botId = `bot_${uuidv4().substring(0, 8)}`;
    const botName = `🤖 ربات ${botNumber}`;

    // تعیین موقعیت و تیم
    const position = this.state.players.length as PlayerPosition;
    const team: TeamId = position % 2 === 0 ? 'team1' : 'team2';

    const botPlayer: Player = {
      id: botId,
      name: botName,
      position,
      team,
      hand: [],
      isReady: true, // ربات همیشه آماده است
      isConnected: true,
      isBot: true
    };

    this.state.players.push(botPlayer);
    return botPlayer;
  }

  /**
   * حذف ربات از بازی
   */
  removeBotPlayer(botId: string): boolean {
    if (this.state.phase !== 'waiting') {
      return false;
    }

    const index = this.state.players.findIndex(p => p.id === botId && p.isBot);
    if (index === -1) return false;

    this.state.players.splice(index, 1);

    // بازنشانی موقعیت‌ها
    this.state.players.forEach((p, i) => {
      p.position = i as PlayerPosition;
      p.team = i % 2 === 0 ? 'team1' : 'team2';
    });

    return true;
  }

  setPlayerReady(playerId: string): boolean {
    const player = this.getPlayer(playerId);
    if (!player) return false;

    player.isReady = true;

    // دیگر بازی اتوماتیک شروع نمی‌شود
    // باید سازنده بازی دکمه "تعیین حاکم" را بزند
    return true;
  }

  // ============================================
  // تنظیم تعداد دست‌ها
  // ============================================

  setRoundsToWin(roundsToWin: RoundsToWinOption): boolean {
    if (this.state.phase !== 'waiting') return false;
    if (![1, 3, 7].includes(roundsToWin)) return false;
    this.state.roundsToWin = roundsToWin;
    return true;
  }

  // ============================================
  // شروع بازی و تعیین حاکم
  // ============================================

  /**
   * شروع بازی - توسط سازنده بازی با کلیک روی دکمه "تعیین حاکم" فراخوانی می‌شود
   */
  startGame(): boolean {
    // بررسی شرایط شروع
    if (this.state.phase !== 'waiting') return false;
    if (this.state.players.length !== 4) return false;
    if (!this.state.players.every(p => p.isReady)) return false;

    if (this.state.roundNumber === 1 && !this.state.hakemId) {
      // دور اول: تعیین حاکم با کارت پیک
      this.determineHakem();
    } else {
      // دورهای بعدی: حاکم از قبل مشخص است
      this.state.phase = 'dealing';
      this.dealCards();
    }
    return true;
  }

  /**
   * تعیین حاکم: به هر نفر 1 کارت پیک داده می‌شود
   * کسی که کمترین کارت را داشته باشد حاکم می‌شود
   */
  private determineHakem(): void {
    this.state.phase = 'determiningHakem';

    // تمام 13 کارت پیک
    const spades: Card[] = RANKS.map(rank => ({
      suit: 'spades' as Suit,
      rank,
      id: `spades-${rank}`
    }));

    // شافل و انتخاب 4 کارت
    const shuffled = this.shuffleDeck(spades);
    const selectedSpades = shuffled.slice(0, 4);

    // تخصیص یک کارت به هر بازیکن
    this.state.hakemDeterminationCards = this.state.players.map((player, i) => ({
      playerId: player.id,
      card: selectedSpades[i]
    }));

    // پیدا کردن بازیکن با کمترین کارت (2 کمترین، A بیشترین)
    let lowestValue = Infinity;
    let hakemId = this.state.players[0].id;

    for (const entry of this.state.hakemDeterminationCards) {
      const value = RANK_VALUES[entry.card.rank];
      if (value < lowestValue) {
        lowestValue = value;
        hakemId = entry.playerId;
      }
    }

    this.state.hakemId = hakemId;
    // socket handler بعد از چند ثانیه proceedToDealing را صدا می‌زند
  }

  /**
   * انتقال از فاز تعیین حاکم به پخش کارت
   * توسط socket handler بعد از نمایش نتیجه صدا زده می‌شود
   */
  proceedToDealing(): void {
    if (this.state.phase !== 'determiningHakem') return;
    this.state.phase = 'dealing';
    this.dealCards();
  }

  // ============================================
  // پخش کارت
  // ============================================

  private createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          suit,
          rank,
          id: `${suit}-${rank}`
        });
      }
    }
    return this.shuffleDeck(deck);
  }

  private shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * پخش کارت مرحله اول: فقط 5 کارت به حاکم
   * بقیه کارت‌ها بعد از انتخاب حکم پخش می‌شوند
   */
  private dealCards(): void {
    const deck = this.createDeck();

    const hakem = this.getPlayer(this.state.hakemId!);
    if (!hakem) return;

    // پاک کردن دست‌های قبلی
    this.state.players.forEach(p => p.hand = []);

    // فقط 5 کارت اول به حاکم
    this.state.hakemCards = deck.slice(0, 5);
    hakem.hand = [...this.state.hakemCards];
    this.sortHand(hakem.hand);

    // ذخیره بقیه کارت‌ها برای بعد از انتخاب حکم
    this.remainingDeck = deck.slice(5);

    this.state.dealingStage = 'hakemFirst5';
    this.state.phase = 'choosingHokm';
    this.state.currentPlayerId = this.state.hakemId;
  }

  private sortHand(hand: Card[]): void {
    const suitOrder: Record<Suit, number> = {
      'spades': 0,
      'hearts': 1,
      'diamonds': 2,
      'clubs': 3
    };

    hand.sort((a, b) => {
      if (suitOrder[a.suit] !== suitOrder[b.suit]) {
        return suitOrder[a.suit] - suitOrder[b.suit];
      }
      return RANK_VALUES[b.rank] - RANK_VALUES[a.rank];
    });
  }

  // ============================================
  // انتخاب حکم
  // ============================================

  selectHokm(playerId: string, suit: Suit): boolean {
    if (this.state.phase !== 'choosingHokm') return false;
    if (playerId !== this.state.hakemId) return false;

    this.state.hokm = suit;

    // پخش کارت‌های باقیمانده
    this.dealRemainingCards();

    return true;
  }

  /**
   * پخش کارت‌های باقیمانده بعد از انتخاب حکم
   * ابتدا 5 کارت به هر 3 نفر دیگر، سپس 4 تا 4 تا تا 13 کارت
   */
  private dealRemainingCards(): void {
    const hakem = this.getPlayer(this.state.hakemId!)!;
    const hakemPosition = hakem.position;

    // بازیکنان به ترتیب خلاف عقربه ساعت (بدون حاکم)
    const otherPlayers = this.getPlayersInOrder(hakemPosition)
      .filter(p => p.id !== hakem.id);

    let deckIndex = 0;

    // مرحله 2: 5 کارت به هر کدام از 3 نفر دیگر
    for (const player of otherPlayers) {
      const cards = this.remainingDeck.slice(deckIndex, deckIndex + 5);
      player.hand.push(...cards);
      deckIndex += 5;
    }
    this.state.dealingStage = 'othersFirst5';

    // مرحله 3: 4 تا 4 تا تا همه 13 کارت داشته باشند
    // حاکم 5 کارت دارد، نیاز به 8 کارت دیگر
    // بقیه 5 کارت دارند، نیاز به 8 کارت دیگر
    // 4 نفر × 8 کارت = 32 کارت باقیمانده
    const allPlayersOrdered = this.getPlayersInOrder(hakemPosition);

    while (deckIndex < this.remainingDeck.length) {
      for (const player of allPlayersOrdered) {
        const cardsNeeded = Math.min(4, 13 - player.hand.length);
        if (cardsNeeded <= 0) continue;
        const cards = this.remainingDeck.slice(deckIndex, deckIndex + cardsNeeded);
        player.hand.push(...cards);
        deckIndex += cardsNeeded;
      }
    }

    this.state.dealingStage = 'complete';
    this.remainingDeck = [];

    // مرتب‌سازی دست بازیکنان
    this.state.players.forEach(p => this.sortHand(p.hand));

    // شروع بازی
    this.state.phase = 'playing';
    this.state.currentPlayerId = this.state.hakemId;
    this.state.leadPlayerId = this.state.hakemId;
  }

  // ============================================
  // بازی کردن کارت
  // ============================================

  playCard(playerId: string, cardId: string): { success: boolean; error?: string } {
    // بررسی فاز بازی
    if (this.state.phase !== 'playing') {
      return { success: false, error: 'بازی در حال انجام نیست' };
    }

    // بررسی نوبت
    if (this.state.currentPlayerId !== playerId) {
      return { success: false, error: 'نوبت شما نیست' };
    }

    const player = this.getPlayer(playerId);
    if (!player) {
      return { success: false, error: 'بازیکن یافت نشد' };
    }

    // پیدا کردن کارت
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, error: 'کارت در دست شما نیست' };
    }

    const card = player.hand[cardIndex];

    // بررسی قانون خال
    if (!this.isValidPlay(player, card)) {
      return { success: false, error: 'باید از خال درخواستی بازی کنید' };
    }

    // بازی کردن کارت
    player.hand.splice(cardIndex, 1);

    // اگر اولین کارت دست است، خال را تعیین کن
    if (this.state.currentTrick.cards.length === 0) {
      this.state.currentTrick.leadSuit = card.suit;
    }

    this.state.currentTrick.cards.push({ playerId, card });

    // اگر 4 کارت بازی شده، برنده دست را تعیین کن
    if (this.state.currentTrick.cards.length === 4) {
      this.resolveTrick();
    } else {
      // نفر بعدی (خلاف عقربه ساعت)
      this.state.currentPlayerId = this.getNextPlayerId(playerId);
    }

    return { success: true };
  }

  private isValidPlay(player: Player, card: Card): boolean {
    // اگر اولین کارت دست است، هر کارتی مجاز است
    if (this.state.currentTrick.cards.length === 0) {
      return true;
    }

    const leadSuit = this.state.currentTrick.leadSuit!;

    // اگر کارت از خال درخواستی است، مجاز است
    if (card.suit === leadSuit) {
      return true;
    }

    // اگر بازیکن از خال درخواستی ندارد، هر کارتی مجاز است
    const hasLeadSuit = player.hand.some(c => c.suit === leadSuit);
    return !hasLeadSuit;
  }

  private resolveTrick(): void {
    const winnerId = this.determineTrickWinner();
    this.state.currentTrick.winnerId = winnerId;
    this.state.lastTrickWinner = winnerId;

    const winner = this.getPlayer(winnerId)!;

    // افزایش امتیاز تیم برنده
    if (winner.team === 'team1') {
      this.state.roundScore.team1++;
    } else {
      this.state.roundScore.team2++;
    }

    this.state.trickNumber++;

    // بررسی پایان دست
    if (this.state.roundScore.team1 >= TRICKS_TO_WIN_ROUND ||
      this.state.roundScore.team2 >= TRICKS_TO_WIN_ROUND) {
      this.endRound();
    } else if (this.state.trickNumber > 13) {
      this.endRound();
    } else {
      // شروع دست جدید
      this.state.currentTrick = { cards: [], leadSuit: null, winnerId: null };
      this.state.currentPlayerId = winnerId;
      this.state.leadPlayerId = winnerId;
    }
  }

  private determineTrickWinner(): string {
    const { cards, leadSuit } = this.state.currentTrick;
    const hokm = this.state.hokm!;

    let winningPlay = cards[0];
    let winningValue = this.getCardValue(winningPlay.card, leadSuit!, hokm);

    for (let i = 1; i < cards.length; i++) {
      const play = cards[i];
      const value = this.getCardValue(play.card, leadSuit!, hokm);

      if (value > winningValue) {
        winningPlay = play;
        winningValue = value;
      }
    }

    return winningPlay.playerId;
  }

  private getCardValue(card: Card, leadSuit: Suit, hokm: Suit): number {
    const baseValue = RANK_VALUES[card.rank];

    // حکم بالاترین ارزش را دارد
    if (card.suit === hokm) {
      return 100 + baseValue;
    }

    // خال درخواستی
    if (card.suit === leadSuit) {
      return baseValue;
    }

    // سایر خال‌ها ارزشی ندارند
    return 0;
  }

  // ============================================
  // پایان دست و بازی
  // ============================================

  /**
   * پایان دست - امتیازدهی بر اساس قوانین کُت
   * حاکم کُت (حریف 7-0 ببرد) = 3 امتیاز
   * کُت (حاکم 7-0 ببرد) = 2 امتیاز
   * عادی = 1 امتیاز
   */
  private endRound(): void {
    this.state.phase = 'roundEnd';

    // تعیین برنده دست
    const winningTeam: TeamId = this.state.roundScore.team1 >= TRICKS_TO_WIN_ROUND
      ? 'team1'
      : 'team2';

    // تعیین تیم حاکم
    const hakem = this.getPlayer(this.state.hakemId!)!;
    const hakemTeam = hakem.team;

    // امتیاز تیم بازنده
    const losingScore = winningTeam === 'team1'
      ? this.state.roundScore.team2
      : this.state.roundScore.team1;

    let points: number;
    let resultType: RoundResultType;

    if (losingScore === 0) {
      // کُت شده (7-0)
      if (winningTeam !== hakemTeam) {
        // تیم حریف حاکم را کُت کرده = حاکم کُت = 3 امتیاز
        points = 3;
        resultType = 'hakemKut';
      } else {
        // تیم حاکم حریف را کُت کرده = کُت = 2 امتیاز
        points = 2;
        resultType = 'kut';
      }
    } else {
      points = 1;
      resultType = 'normal';
    }

    this.state.lastRoundResult = resultType;
    this.state.lastRoundPoints = points;

    if (winningTeam === 'team1') {
      this.state.gameScore.team1 += points;
    } else {
      this.state.gameScore.team2 += points;
    }

    // بررسی پایان بازی
    if (this.state.gameScore.team1 >= this.state.roundsToWin ||
      this.state.gameScore.team2 >= this.state.roundsToWin) {
      this.endGame();
    }
    // اگر بازی تمام نشده، socket handler بعد از چند ثانیه startNextRound را صدا می‌زند
  }

  /**
   * شروع دست بعدی - توسط socket handler بعد از نمایش نتیجه صدا زده می‌شود
   */
  startNextRound(): void {
    if (this.state.phase !== 'roundEnd') return;

    // تعیین برنده دست قبلی
    const lastWinningTeam: TeamId = this.state.roundScore.team1 >= TRICKS_TO_WIN_ROUND
      ? 'team1'
      : 'team2';

    this.prepareNextRound(lastWinningTeam);
  }

  private prepareNextRound(lastWinningTeam: TeamId): void {
    // حاکم جدید: اگر تیم حاکم باخت، حاکم به تیم برنده می‌رود
    const currentHakem = this.getPlayer(this.state.hakemId!);

    if (currentHakem && currentHakem.team !== lastWinningTeam) {
      // حاکم عوض می‌شود - به نفر بعد (خلاف عقربه ساعت) از حاکم فعلی
      const hakemPosition = currentHakem.position;
      const nextPosition = ((hakemPosition + 3) % 4) as PlayerPosition; // خلاف عقربه ساعت
      const nextHakem = this.state.players.find(p => p.position === nextPosition);
      if (nextHakem) {
        this.state.hakemId = nextHakem.id;
      }
    }
    // اگر تیم حاکم برد، حاکم همان می‌ماند

    // بازنشانی برای دست جدید
    this.state.roundScore = { team1: 0, team2: 0 };
    this.state.roundNumber++;
    this.state.trickNumber = 1;
    this.state.currentTrick = { cards: [], leadSuit: null, winnerId: null };
    this.state.hokm = null;
    this.state.hakemCards = [];
    this.state.dealingStage = null;
    this.state.hakemDeterminationCards = [];
    this.state.lastRoundResult = null;
    this.state.lastRoundPoints = null;

    // پخش کارت جدید
    this.state.phase = 'dealing';
    this.dealCards();
  }

  private endGame(): void {
    this.state.phase = 'gameEnd';
    this.state.winningTeam = this.state.gameScore.team1 >= this.state.roundsToWin
      ? 'team1'
      : 'team2';
  }

  // ============================================
  // توابع کمکی
  // ============================================

  getPlayer(playerId: string): Player | undefined {
    return this.state.players.find(p => p.id === playerId);
  }

  /**
   * نفر بعدی خلاف جهت عقربه ساعت
   * 0 -> 3 -> 2 -> 1 -> 0
   */
  private getNextPlayerId(currentPlayerId: string): string {
    const currentPlayer = this.getPlayer(currentPlayerId)!;
    const nextPosition = ((currentPlayer.position + 3) % 4) as PlayerPosition;
    const nextPlayer = this.state.players.find(p => p.position === nextPosition);
    return nextPlayer!.id;
  }

  /**
   * لیست بازیکنان به ترتیب خلاف عقربه ساعت از یک موقعیت
   */
  private getPlayersInOrder(startPosition: PlayerPosition): Player[] {
    const result: Player[] = [];
    const positions: PlayerPosition[] = [
      startPosition,
      ((startPosition + 3) % 4) as PlayerPosition,
      ((startPosition + 2) % 4) as PlayerPosition,
      ((startPosition + 1) % 4) as PlayerPosition
    ];
    for (const pos of positions) {
      const player = this.state.players.find(p => p.position === pos);
      if (player) result.push(player);
    }
    return result;
  }

  getState(): GameState {
    return { ...this.state };
  }

  getStateForPlayer(playerId: string): GameState {
    // برگرداندن state با فیلتر کردن دست سایر بازیکنان
    const state = this.getState();
    state.players = state.players.map(p => ({
      ...p,
      hand: p.id === playerId ? p.hand : [] // فقط دست خود بازیکن را نشان بده
    }));

    // hakemCards فقط برای حاکم نشان داده شود
    if (playerId !== this.state.hakemId) {
      state.hakemCards = [];
    }

    return state;
  }

  // برای دیباگ و تست
  getFullState(): GameState {
    return this.state;
  }

  // بازنشانی بازی
  reset(): void {
    const gameId = this.state.id;
    this.state = this.createInitialState(gameId);
    this.remainingDeck = [];
  }

  // ============================================
  // Bot Methods - بازی توسط کامپیوتر
  // ============================================

  /**
   * بررسی آیا نوبت بازیکن Bot است یا disconnect شده
   */
  shouldBotPlay(): boolean {
    if (!this.state.currentPlayerId) return false;
    if (this.state.phase !== 'playing') return false;

    const currentPlayer = this.getPlayer(this.state.currentPlayerId);
    if (!currentPlayer) return false;

    // اگر بازیکن Bot است یا disconnect شده، Bot باید بازی کند
    return currentPlayer.isBot || !currentPlayer.isConnected;
  }

  /**
   * بررسی آیا حاکم Bot است یا disconnect شده و باید Bot حکم انتخاب کند
   */
  shouldBotSelectHokm(): boolean {
    if (this.state.phase !== 'choosingHokm') return false;
    if (!this.state.hakemId) return false;

    const hakem = this.getPlayer(this.state.hakemId);
    if (!hakem) return false;

    // اگر حاکم Bot است یا disconnect شده، Bot باید حکم انتخاب کند
    return hakem.isBot || !hakem.isConnected;
  }

  /**
   * Bot حکم را انتخاب می‌کند
   */
  botSelectHokm(): Suit | null {
    if (!this.shouldBotSelectHokm()) return null;

    const hakem = this.getPlayer(this.state.hakemId!);
    if (!hakem) return null;

    const selectedSuit = botPlayer.selectHokm(hakem.hand);
    this.selectHokm(hakem.id, selectedSuit);

    return selectedSuit;
  }

  /**
   * Bot کارت بازی می‌کند
   */
  botPlayCard(): { success: boolean; cardId?: string; playerId?: string } {
    if (!this.shouldBotPlay()) {
      return { success: false };
    }

    const currentPlayer = this.getPlayer(this.state.currentPlayerId!);
    if (!currentPlayer || currentPlayer.hand.length === 0) {
      return { success: false };
    }

    const selectedCard = botPlayer.selectCard(
      currentPlayer.hand,
      this.state,
      currentPlayer.id
    );

    const result = this.playCard(currentPlayer.id, selectedCard.id);

    if (result.success) {
      return {
        success: true,
        cardId: selectedCard.id,
        playerId: currentPlayer.id
      };
    }

    return { success: false };
  }

  /**
   * لیست بازیکنان disconnect شده
   */
  getDisconnectedPlayers(): Player[] {
    return this.state.players.filter(p => !p.isConnected);
  }

  /**
   * بررسی آیا بازی قابل ادامه است
   */
  canContinueGame(): boolean {
    // حداقل باید 1 بازیکن متصل باشد
    return this.state.players.some(p => p.isConnected);
  }
}
