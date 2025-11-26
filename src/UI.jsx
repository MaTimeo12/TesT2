import React from 'react';

export default function UI({ onStartGame }) {
  return (
    <div className="ui-overlay">
      <header className="header">
        <div className="logo">ARMA REFORGER STYLE</div>
        <nav className="nav">
          <a href="#">OPERATIONS</a>
          <a href="#">FACTIONS</a>
          <a href="#">COMMUNITY</a>
        </nav>
      </header>

      <main className="main-content">
        <h1 className="title">CONFLICT <br/> ESCALATION</h1>
        <p className="subtitle">JOIN THE BATTLE ON EVERON</p>
        <button className="cta-button" onClick={onStartGame}>DEPLOY TO TACTICAL MAP</button>
      </main>

      <footer className="footer">
        <div className="status-panel">
          <div className="status-item">
            <span className="label">SERVER STATUS</span>
            <span className="value online">ONLINE</span>
          </div>
          <div className="status-item">
            <span className="label">PLAYERS</span>
            <span className="value">12,405</span>
          </div>
          <div className="status-item">
            <span className="label">REGION</span>
            <span className="value">EU-WEST</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
