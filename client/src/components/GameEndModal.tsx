import React from 'react';
import { TeamId, GameScore } from '../types';
import './GameEndModal.css';

interface GameEndModalProps {
  winningTeam: TeamId;
  gameScore: GameScore;
  myTeam: TeamId;
  onPlayAgain: () => void;
  onExit: () => void;
}

export const GameEndModal: React.FC<GameEndModalProps> = ({
  winningTeam,
  gameScore,
  myTeam,
  onPlayAgain,
  onExit
}) => {
  const isWinner = winningTeam === myTeam;

  return (
    <div className="game-end-overlay">
      <div className={`game-end-modal ${isWinner ? 'winner' : 'loser'}`}>
        <div className="result-icon">
          {isWinner ? '🏆' : '😢'}
        </div>

        <h1 className="result-title">
          {isWinner ? 'تبریک! شما بردید!' : 'متأسفانه باختید!'}
        </h1>

        <div className="final-score">
          <div className={`team-score ${winningTeam === 'team1' ? 'winner' : ''}`}>
            <span className="team-name">تیم ۱</span>
            <span className="score">{gameScore.team1}</span>
          </div>
          <span className="score-divider">-</span>
          <div className={`team-score ${winningTeam === 'team2' ? 'winner' : ''}`}>
            <span className="score">{gameScore.team2}</span>
            <span className="team-name">تیم ۲</span>
          </div>
        </div>

        <div className="winning-team">
          برنده: {winningTeam === 'team1' ? 'تیم ۱' : 'تیم ۲'}
        </div>

        <div className="action-buttons">
          <button className="play-again-button" onClick={onPlayAgain}>
            🔄 بازی دوباره
          </button>
          <button className="exit-button" onClick={onExit}>
            🚪 خروج
          </button>
        </div>
      </div>
    </div>
  );
};
