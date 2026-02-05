import React from 'react';
import { Game } from './components/Game';
import { useTelegram } from './hooks/useTelegram';
import './App.css';

const App: React.FC = () => {
  const { isReady, colorScheme } = useTelegram();

  return (
    <div className={`app ${colorScheme}`}>
      {isReady ? (
        <Game />
      ) : (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>در حال بارگذاری...</p>
        </div>
      )}
    </div>
  );
};

export default App;
