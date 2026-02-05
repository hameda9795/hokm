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

  // Local trick cards - built from cardPlayed events
  localTrickCards: TrickCard[];

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
  pendingGameState: null as GameState | null,
  localTrickCards: [] as TrickCard[]
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setConnected: (connected) => set({ isConnected: connected }),

  setPlayerId: (id) => set({ playerId: id }),

  setGameState: (state) => {
    const { showingTrickResult, displayedTrickCards, localTrickCards } = get();
    const serverCardCount = state.currentTrick?.cards?.length || 0;
    console.log('[setGameState] serverCards:', serverCardCount, 'localCards:', localTrickCards.length, 'showingResult:', showingTrickResult, 'phase:', state.phase);

    // If we're showing trick result, queue the state update but keep displayed cards
    if (showingTrickResult) {
      console.log('[setGameState] Queueing state (showingTrickResult)');
      set({ pendingGameState: state });
      return;
    }

    // If we have displayed cards (showing result), keep them and queue new state
    if (displayedTrickCards.length === 4) {
      console.log('[setGameState] Queueing state (displayedTrickCards)');
      set({ pendingGameState: state });
      return;
    }

    // Sync local trick cards with server state when server has more cards
    // This handles the case when we miss a cardPlayed event
    if (serverCardCount > localTrickCards.length && state.phase === 'playing') {
      console.log('[setGameState] Syncing from server, server has more cards');
      set({ localTrickCards: [...state.currentTrick.cards] });
    }

    // DON'T clear local trick cards here - let clearTrickDisplay handle it
    // This was causing the 4th card to be lost when state arrives before cardPlayed event

    // Clear local trick cards when phase changes away from playing
    if (state.phase !== 'playing' && localTrickCards.length > 0) {
      console.log('[setGameState] Clearing localTrickCards (phase changed)');
      set({ localTrickCards: [] });
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
    const { gameState, localTrickCards, showingTrickResult } = get();
    console.log('[addPlayedCard] Card:', card.rank, card.suit, 'from:', playerId);
    console.log('[addPlayedCard] Current localTrickCards:', localTrickCards.length, 'showingTrickResult:', showingTrickResult);

    if (!gameState) {
      console.log('[addPlayedCard] No gameState, returning');
      return;
    }

    // Remove card from hand if it's mine
    const { playerId: myId, myHand } = get();
    if (playerId === myId) {
      set({
        myHand: myHand.filter(c => c.id !== card.id),
        selectedCard: null
      });
    }

    // Add card to local trick (if not showing result and card not already there)
    if (!showingTrickResult) {
      const alreadyExists = localTrickCards.some(t => t.card.id === card.id);
      if (!alreadyExists) {
        const newLocalTrickCards = [...localTrickCards, { playerId, card }];
        set({ localTrickCards: newLocalTrickCards });
        console.log('[addPlayedCard] Added card, new length:', newLocalTrickCards.length);

        // If this is the 4th card, start the 3-second display timer
        if (newLocalTrickCards.length === 4) {
          console.log('[addPlayedCard] 4 cards! Starting 3-second display');
          set({
            showingTrickResult: true,
            displayedTrickCards: newLocalTrickCards
          });

          setTimeout(() => {
            console.log('[addPlayedCard] 3 seconds passed, clearing display');
            get().clearTrickDisplay();
          }, 3000);
        }
      } else {
        console.log('[addPlayedCard] Card already exists, skipping');
      }
    } else {
      console.log('[addPlayedCard] showingTrickResult is true, skipping');
    }
  },

  setTrickWinner: (winnerId) => {
    const { localTrickCards, showingTrickResult } = get();

    // If we already have 4 cards displayed, just set the winner
    if (showingTrickResult) {
      set({ trickWinnerId: winnerId });
      return;
    }

    // If trick won and we have 4 cards locally, display them
    if (localTrickCards.length === 4) {
      set({
        trickWinnerId: winnerId,
        showingTrickResult: true,
        displayedTrickCards: [...localTrickCards]
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

    // Clear displayed cards and local trick cards, apply pending state
    set({
      showingTrickResult: false,
      trickWinnerId: null,
      displayedTrickCards: [],
      localTrickCards: []
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
