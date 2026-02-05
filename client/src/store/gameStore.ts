import { create } from 'zustand';
import { Card, GameState } from '../types';

interface TrickCard {
  playerId: string;
  card: Card;
}

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

  // Trick display state - store cards separately for 3 second display
  showingTrickResult: boolean;
  trickWinnerId: string | null;
  displayedTrickCards: TrickCard[];
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
  gameState: null as GameState | null,
  myHand: [] as Card[],
  hakemCards: [] as Card[],
  isMyTurn: false,
  error: null as string | null,
  selectedCard: null as Card | null,
  showHokmSelector: false,
  showingTrickResult: false,
  trickWinnerId: null as string | null,
  displayedTrickCards: [] as TrickCard[],
  pendingGameState: null as GameState | null
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setConnected: (connected) => set({ isConnected: connected }),

  setPlayerId: (id) => set({ playerId: id }),

  setGameState: (state) => {
    const { showingTrickResult, displayedTrickCards } = get();

    // If we're showing trick result, queue the state update but keep displayed cards
    if (showingTrickResult) {
      set({ pendingGameState: state });
      return;
    }

    // Check if this state has 4 cards (trick just completed)
    const newCardCount = state.currentTrick?.cards?.length || 0;

    // When 4th card arrives - store cards separately and start the delay
    if (newCardCount === 4 && state.phase === 'playing') {
      // Store the 4 cards for display
      const cardsToDisplay = [...state.currentTrick.cards];

      set({
        gameState: state,
        showingTrickResult: true,
        displayedTrickCards: cardsToDisplay
      });

      // Start 3 second timer
      setTimeout(() => {
        get().clearTrickDisplay();
      }, 3000);
      return;
    }

    // If we have displayed cards (showing result), keep them and queue new state
    if (displayedTrickCards.length === 4) {
      set({ pendingGameState: state });
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
    const { gameState, showingTrickResult } = get();

    // If we already have 4 cards displayed, just set the winner
    if (showingTrickResult) {
      set({ trickWinnerId: winnerId });
      return;
    }

    // If trick won but we don't have cards displayed yet, store current trick cards
    if (gameState?.currentTrick?.cards?.length === 4) {
      set({
        trickWinnerId: winnerId,
        showingTrickResult: true,
        displayedTrickCards: [...gameState.currentTrick.cards]
      });

      // Start 3 second timer
      setTimeout(() => {
        get().clearTrickDisplay();
      }, 3000);
    } else {
      set({ trickWinnerId: winnerId });
    }
  },

  clearTrickDisplay: () => {
    const { pendingGameState, playerId } = get();

    // Clear displayed cards and apply pending state
    set({
      showingTrickResult: false,
      trickWinnerId: null,
      displayedTrickCards: []
    });

    if (pendingGameState) {
      // Apply the pending state
      set({
        gameState: pendingGameState,
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
    }
  },

  reset: () => set(initialState)
}));
