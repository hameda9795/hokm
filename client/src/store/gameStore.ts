import { create } from 'zustand';
import { Card, GameState } from '../types';

interface GameStore {
  // Connection
  isConnected: boolean;
  playerId: string;

  // Game state
  gameState: GameState | null;
  myHand: Card[];
  hakemCards: Card[];
  isMyTurn: boolean;
  error: string | null;

  // UI state
  selectedCard: Card | null;
  showHokmSelector: boolean;

  // Actions
  setConnected: (connected: boolean) => void;
  setPlayerId: (id: string) => void;
  setGameState: (state: GameState) => void;
  setMyHand: (cards: Card[]) => void;
  setHakemCards: (cards: Card[]) => void;
  setIsMyTurn: (isMyTurn: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedCard: (card: Card | null) => void;
  setShowHokmSelector: (show: boolean) => void;
  addPlayedCard: (playerId: string, card: Card) => void;
  reset: () => void;
}

const initialState = {
  isConnected: false,
  playerId: '',
  gameState: null,
  myHand: [],
  hakemCards: [],
  isMyTurn: false,
  error: null,
  selectedCard: null,
  showHokmSelector: false
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setConnected: (connected) => set({ isConnected: connected }),

  setPlayerId: (id) => set({ playerId: id }),

  setGameState: (state) => {
    set({ gameState: state });

    // اگر در فاز انتخاب حکم هستیم و من حاکم هستم
    const { playerId } = get();
    if (state.phase === 'choosingHokm' && state.hakemId === playerId) {
      set({ showHokmSelector: true });
    } else {
      set({ showHokmSelector: false });
    }

    // بررسی نوبت
    if (state.currentPlayerId === playerId && state.phase === 'playing') {
      set({ isMyTurn: true });
    } else if (state.phase !== 'playing') {
      set({ isMyTurn: false });
    }
  },

  setMyHand: (cards) => set({ myHand: cards }),

  setHakemCards: (cards) => set({ hakemCards: cards }),

  setIsMyTurn: (isMyTurn) => set({ isMyTurn }),

  setError: (error) => set({ error }),

  setSelectedCard: (card) => set({ selectedCard: card }),

  setShowHokmSelector: (show) => set({ showHokmSelector: show }),

  addPlayedCard: (playerId, card) => {
    const { gameState } = get();
    if (!gameState) return;

    // Remove card from hand if it's mine
    const { playerId: myId, myHand } = get();
    if (playerId === myId) {
      set({
        myHand: myHand.filter(c => c.id !== card.id),
        selectedCard: null
      });
    }
  },

  reset: () => set(initialState)
}));
