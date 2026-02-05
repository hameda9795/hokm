import React from 'react';
import { RoundScore, GameScore, Suit, RoundsToWinOption, SUIT_SYMBOLS } from '../types';
import './ScoreBoard.css';

interface ScoreBoardProps {
  roundScore: RoundScore;
  gameScore: GameScore;
  roundNumber: number;
  trickNumber: number;
  hokm: Suit | null;
  roundsToWin: RoundsToWinOption;
  myTeam?: 'team1' | 'team2';
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  roundScore,
  gameScore,
  roundNumber: _roundNumber,
  trickNumber: _trickNumber,
  hokm,
  roundsToWin: _roundsToWin,
  myTeam = 'team1'
}) => {
  // Calculate scores based on which team the player is on
  const myRoundScore = myTeam === 'team1' ? roundScore.team1 : roundScore.team2;
  const opponentRoundScore = myTeam === 'team1' ? roundScore.team2 : roundScore.team1;
  const myGameScore = myTeam === 'team1' ? gameScore.team1 : gameScore.team2;
  const opponentGameScore = myTeam === 'team1' ? gameScore.team2 : gameScore.team1;

  return (
    <header className="game-header">
      {/* Left side - Round Score (current hand) */}
      <div className="header-section header-left">
        <div className="score-box round-score">
          <span className="score-label">امتیاز دست</span>
          <div className="score-display">
            <span className="my-score">{myRoundScore}</span>
            <span className="score-separator">:</span>
            <span className="opponent-score">{opponentRoundScore}</span>
          </div>
          <div className="score-teams">
            <span className="team-label">ما</span>
            <span className="team-label">حریف</span>
          </div>
        </div>
      </div>

      {/* Center - Logo and Hokm */}
      <div className="header-section header-center">
        <h1 className="game-title">Hokmgeram</h1>
        <p className="game-subtitle">بازی حکم تلگرام</p>
        {hokm && (
          <div className="hokm-display">
            <span className="hokm-label">حکم:</span>
            <span
              className="hokm-suit"
              style={{ color: hokm === 'hearts' || hokm === 'diamonds' ? '#ef4444' : '#1e1b4b' }}
            >
              {SUIT_SYMBOLS[hokm]}
            </span>
          </div>
        )}
      </div>

      {/* Right side - Game Score (rounds won) */}
      <div className="header-section header-right">
        <div className="score-box game-score">
          <span className="score-label">دست‌های برده</span>
          <div className="score-display">
            <span className="my-score">{myGameScore}</span>
            <span className="score-separator">:</span>
            <span className="opponent-score">{opponentGameScore}</span>
          </div>
          <div className="score-teams">
            <span className="team-label">ما</span>
            <span className="team-label">حریف</span>
          </div>
        </div>
      </div>
    </header>
  );
};
