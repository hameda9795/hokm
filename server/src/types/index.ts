// ============================================
// انواع کارت‌ها و خال‌ها
// ============================================

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // unique identifier
}

// ============================================
// بازیکن و تیم
// ============================================

export type TeamId = 'team1' | 'team2';
export type PlayerPosition = 0 | 1 | 2 | 3; // 0-2 تیم یک، 1-3 تیم دو

export interface Player {
  id: string;
  name: string;
  telegramId?: string;
  position: PlayerPosition;
  team: TeamId;
  hand: Card[];
  isReady: boolean;
  isConnected: boolean;
  isBot: boolean; // آیا این بازیکن یک Bot است
}

// ============================================
// وضعیت بازی
// ============================================

export type GamePhase =
  | 'waiting'            // منتظر بازیکنان
  | 'determiningHakem'   // تعیین حاکم با کارت پیک
  | 'dealing'            // در حال پخش کارت
  | 'choosingHokm'       // حاکم در حال انتخاب حکم
  | 'playing'            // بازی در جریان
  | 'roundEnd'           // پایان یک دست
  | 'gameEnd';           // پایان بازی

export type DealingStage = 'hakemFirst5' | 'othersFirst5' | 'remaining' | 'complete';
export type RoundResultType = 'normal' | 'kut' | 'hakemKut';
export type RoundsToWinOption = 1 | 3 | 7;

export interface Trick {
  cards: { playerId: string; card: Card }[];
  leadSuit: Suit | null;
  winnerId: string | null;
}

export interface RoundScore {
  team1: number;
  team2: number;
}

export interface GameScore {
  team1: number;
  team2: number;
}

export interface GameState {
  id: string;
  phase: GamePhase;
  players: Player[];
  hakemId: string | null;       // حاکم (کسی که حکم انتخاب می‌کند)
  hokm: Suit | null;            // خال حکم
  currentTrick: Trick;
  currentPlayerId: string | null;
  roundScore: RoundScore;       // امتیاز دست جاری (تعداد دست‌های برده شده)
  gameScore: GameScore;         // امتیاز کل بازی
  roundNumber: number;
  trickNumber: number;
  leadPlayerId: string | null;  // اولین بازیکن دست فعلی
  lastTrickWinner: string | null;
  winningTeam: TeamId | null;
  hakemCards: Card[];           // 5 کارت اول برای حاکم جهت انتخاب حکم
  roundsToWin: RoundsToWinOption;         // هدف بازی: 1، 3، یا 7
  dealingStage: DealingStage | null;      // مرحله پخش کارت
  hakemDeterminationCards: { playerId: string; card: Card }[]; // کارت‌های پیک برای تعیین حاکم
  lastRoundResult: RoundResultType | null; // نتیجه آخرین دست
  lastRoundPoints: number | null;          // امتیاز آخرین دست
}

// ============================================
// رویدادهای Socket
// ============================================

export interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'game:playerJoined': (player: Player) => void;
  'game:playerLeft': (playerId: string) => void;
  'game:cardPlayed': (playerId: string, card: Card) => void;
  'game:trickWon': (winnerId: string, team: TeamId) => void;
  'game:roundEnd': (roundScore: RoundScore, gameScore: GameScore) => void;
  'game:gameEnd': (winningTeam: TeamId, finalScore: GameScore) => void;
  'game:hokmSelected': (hokm: Suit) => void;
  'game:yourTurn': () => void;
  'game:error': (message: string) => void;
  'player:hand': (cards: Card[]) => void;
  'player:hakemCards': (cards: Card[]) => void;
  'game:hakemDetermined': (hakemId: string, cards: { playerId: string; card: Card }[]) => void;
}

export interface ClientToServerEvents {
  'game:join': (gameId: string, playerName: string, telegramId?: string) => void;
  'game:leave': () => void;
  'game:playCard': (cardId: string) => void;
  'game:selectHokm': (suit: Suit) => void;
  'game:ready': () => void;
  'game:create': (playerName: string, telegramId?: string) => void;
  'game:setRoundsToWin': (roundsToWin: RoundsToWinOption) => void;
  'game:startGame': () => void;
  'game:addBot': () => void;
  'game:removeBot': (botId: string) => void;
}

// ============================================
// ثابت‌های بازی
// ============================================

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14
};

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const TRICKS_TO_WIN_ROUND = 7;  // برای بردن دست باید 7 تریک برد
export const DEFAULT_ROUNDS_TO_WIN: RoundsToWinOption = 7;  // پیش‌فرض: 7 دست برای برد بازی

// ============================================
// نام‌های فارسی
// ============================================

export const SUIT_NAMES_FA: Record<Suit, string> = {
  'hearts': 'دل',
  'diamonds': 'خشت',
  'clubs': 'گشنیز',
  'spades': 'پیک'
};

export const RANK_NAMES_FA: Record<Rank, string> = {
  '2': '۲',
  '3': '۳',
  '4': '۴',
  '5': '۵',
  '6': '۶',
  '7': '۷',
  '8': '۸',
  '9': '۹',
  '10': '۱۰',
  'J': 'سرباز',
  'Q': 'بی‌بی',
  'K': 'شاه',
  'A': 'آس'
};
