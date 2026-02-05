import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import { Card, GameState, Player, Suit, TeamId, RoundScore, GameScore, RoundsToWinOption } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);

  const {
    setGameState,
    setMyHand,
    setHakemCards,
    setIsMyTurn,
    setError,
    addPlayedCard,
    setConnected,
    setPlayerId
  } = useGameStore();

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      setPlayerId(socket.id || '');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    socket.on('game:state', (state: GameState) => {
      setGameState(state);
    });

    socket.on('player:hand', (cards: Card[]) => {
      setMyHand(cards);
    });

    socket.on('player:hakemCards', (cards: Card[]) => {
      setHakemCards(cards);
    });

    socket.on('game:yourTurn', () => {
      setIsMyTurn(true);
    });

    socket.on('game:cardPlayed', (playerId: string, card: Card) => {
      addPlayedCard(playerId, card);
    });

    socket.on('game:hokmSelected', (hokm: Suit) => {
      console.log('Hokm selected:', hokm);
    });

    socket.on('game:hakemDetermined', (hakemId: string, cards: { playerId: string; card: Card }[]) => {
      console.log('Hakem determined:', hakemId, cards);
    });

    socket.on('game:trickWon', (winnerId: string, team: TeamId) => {
      console.log('Trick won by:', winnerId, 'Team:', team);
    });

    socket.on('game:roundEnd', (roundScore: RoundScore, gameScore: GameScore) => {
      console.log('Round ended:', roundScore, gameScore);
    });

    socket.on('game:gameEnd', (winningTeam: TeamId, finalScore: GameScore) => {
      console.log('Game ended! Winner:', winningTeam, finalScore);
    });

    socket.on('game:error', (message: string) => {
      setError(message);
      console.error('Game error:', message);
    });

    socket.on('game:playerJoined', (player: Player) => {
      console.log('Player joined:', player.name);
    });

    socket.on('game:playerLeft', (playerId: string) => {
      console.log('Player left:', playerId);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createGame = useCallback((playerName: string, telegramId?: string) => {
    socketRef.current?.emit('game:create', playerName, telegramId);
  }, []);

  const joinGame = useCallback((gameId: string, playerName: string, telegramId?: string) => {
    socketRef.current?.emit('game:join', gameId, playerName, telegramId);
  }, []);

  const leaveGame = useCallback(() => {
    socketRef.current?.emit('game:leave');
  }, []);

  const setReady = useCallback(() => {
    socketRef.current?.emit('game:ready');
  }, []);

  const selectHokm = useCallback((suit: Suit) => {
    socketRef.current?.emit('game:selectHokm', suit);
  }, []);

  const playCard = useCallback((cardId: string) => {
    socketRef.current?.emit('game:playCard', cardId);
    setIsMyTurn(false);
  }, []);

  const setRoundsToWin = useCallback((roundsToWin: RoundsToWinOption) => {
    socketRef.current?.emit('game:setRoundsToWin', roundsToWin);
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('game:startGame' as any);
  }, []);

  const addBot = useCallback(() => {
    console.log('Sending game:addBot event...');
    socketRef.current?.emit('game:addBot' as any);
  }, []);

  const removeBot = useCallback((botId: string) => {
    socketRef.current?.emit('game:removeBot' as any, botId);
  }, []);

  return {
    createGame,
    joinGame,
    leaveGame,
    setReady,
    selectHokm,
    playCard,
    setRoundsToWin,
    startGame,
    addBot,
    removeBot,
    socket: socketRef.current
  };
};
