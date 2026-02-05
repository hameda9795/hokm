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

  // Trick display state
  showingTrickResult: boolean;
  trickWinnerId: string | null;
  pendingGameState: GameState | null;

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
  setTrickWinner: (winnerId: string) => void;
  clearTrickDisplay: () => void;
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
  showHokmSelector: false,
  showingTrickResult: false,
  trickWinnerId: null,
  pendingGameState: null
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setConnected: (connected) => set({ isConnected: connected }),

  setPlayerId: (id) => set({ playerId: id }),

  setGameState: (state) => {
    const { showingTrickResult, gameState: currentState } = get();

    // If we're showing trick result, queue the state update
    if (showingTrickResult) {
      set({ pendingGameState: state });
      return;
    }

    // Check if a trick just completed (4 cards were on table, now cleared)
    const hadFourCards = currentState?.currentTrick?.cards?.length === 4;
    const newHasNoCards = state.currentTrick?.cards?.length === 0;

    if (hadFourCards && newHasNoCards && state.phase === 'playing') {
      // Trick just completed - delay the update
      set({ pendingGameState: state, showingTrickResult: true });
      return;
    }

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

  setTrickWinner: (winnerId) => {
    set({ trickWinnerId: winnerId });
  },

  clearTrickDisplay: () => {
    const { pendingGameState, playerId } = get();

    if (pendingGameState) {
      // Apply the pending state
      set({
        gameState: pendingGameState,
        showingTrickResult: false,
        trickWinnerId: null,
        pendingGameState: null
      });

      // Update turn and hokm selector
      if (pendingGameState.phase === 'choosingHokm' && pendingGameState.hakemId === playerId) {
        set({ showHokmSelector: true });
      } else {
        set({ showHokmSelector: false });
      }

      if (pendingGameState.currentPlayerId === playerId && pendingGameState.phase === 'playing') {
        set({ isMyTurn: true });
      } else if (pendingGameState.phase !== 'playing') {
        set({ isMyTurn: false });
      }
    } else {
      set({ showingTrickResult: false, trickWinnerId: null });
    }
  },

  reset: () => set(initialState)
}));
