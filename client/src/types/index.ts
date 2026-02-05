// ============================================
// انواع کارت‌ها و خال‌ها
// ============================================

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

// ============================================
// بازیکن و تیم
// ============================================

export type TeamId = 'team1' | 'team2';
export type PlayerPosition = 0 | 1 | 2 | 3;

export interface Player {
  id: string;
  name: string;
  telegramId?: string;
  position: PlayerPosition;
  team: TeamId;
  hand: Card[];
  isReady: boolean;
  isConnected: boolean;
  isBot?: boolean;
}

// ============================================
// وضعیت بازی
// ============================================

export type GamePhase =
  | 'waiting'
  | 'determiningHakem'
  | 'dealing'
  | 'choosingHokm'
  | 'playing'
  | 'roundEnd'
  | 'gameEnd';

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
  hakemId: string | null;
  hokm: Suit | null;
  currentTrick: Trick;
  currentPlayerId: string | null;
  roundScore: RoundScore;
  gameScore: GameScore;
  roundNumber: number;
  trickNumber: number;
  leadPlayerId: string | null;
  lastTrickWinner: string | null;
  winningTeam: TeamId | null;
  hakemCards: Card[];
  roundsToWin: RoundsToWinOption;
  dealingStage: DealingStage | null;
  hakemDeterminationCards: { playerId: string; card: Card }[];
  lastRoundResult: RoundResultType | null;
  lastRoundPoints: number | null;
}

// ============================================
// ثابت‌ها
// ============================================

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
};

export const SUIT_COLORS: Record<Suit, string> = {
  hearts: '#ef4444',
  diamonds: '#f97316',
  clubs: '#1e1b4b',
  spades: '#312e81'
};

export const SUIT_NAMES_FA: Record<Suit, string> = {
  hearts: 'دل',
  diamonds: 'خشت',
  clubs: 'گشنیز',
  spades: 'پیک'
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
