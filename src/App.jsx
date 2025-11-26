import React, { Suspense, useState } from 'react';
import Scene from './Scene';
import UI from './UI';
import RTSGame from './RTSGame';
import './App.css';

function App() {
  const [view, setView] = useState('menu'); // 'menu' or 'game'

  return (
    <div className="app-container">
      {view === 'menu' ? (
        <>
          <Suspense fallback={<div className="loading">LOADING ASSETS...</div>}>
            <Scene />
          </Suspense>
          <UI onStartGame={() => setView('game')} />
        </>
      ) : (
        <RTSGame onBack={() => setView('menu')} />
      )}
    </div>
  );
}

export default App;
