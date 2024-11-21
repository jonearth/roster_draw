import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCw, UserPlus, Gift, Crown } from 'lucide-react';
import { io } from 'socket.io-client';
import QRCode from 'qrcode.react';

// Initialize socket connection
const socket = io(window.location.origin);

function App() {
  const [currentName, setCurrentName] = useState('');
  const [gameState, setGameState] = useState({
    participants: [],
    winners: [],
    remainingPrizes: 15,
    isDrawing: false,
    isHost: false
  });
  const [currentWinner, setCurrentWinner] = useState(null);
  const [showQR, setShowQR] = useState(true);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    // Listen for game state updates
    socket.on('gameState', (newGameState) => {
      setGameState(newGameState);
    });

    // Listen for winner announcements
    socket.on('winner', (winner) => {
      setCurrentWinner(winner);
    });

    return () => {
      socket.off('gameState');
      socket.off('winner');
    };
  }, []);

  const handleAddParticipant = () => {
    if (currentName.trim() && !joined) {
      socket.emit('addParticipant', currentName.trim());
      setCurrentName('');
      setShowQR(false);
      setJoined(true);
    }
  };

  const handleDraw = () => {
    if (gameState.isHost) {
      socket.emit('draw');
    }
  };

  const resetDraw = () => {
    if (gameState.isHost) {
      socket.emit('reset');
      setCurrentWinner(null);
      setShowQR(true);
      setJoined(false);
    }
  };

  // Get the current URL for QR code
  const currentUrl = window.location.href;

  return (
    <div className="max-w-md mx-auto p-4 min-h-screen bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
             OS Roster Draw
            {gameState.isHost && (
              <span className="flex items-center text-yellow-500">
                <Crown size={24} />
                <span className="text-sm">(Host)</span>
              </span>
            )}
          </h1>
          <p className="text-gray-600">Remaining Prizes: {gameState.remainingPrizes}</p>
        </div>

        {!joined && (
          <div className="text-center space-y-4">
            <QRCode value={currentUrl} size={256} className="mx-auto" />
            <button
              onClick={() => setShowQR(false)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Join Draw
            </button>
          </div>
        )}

        {!joined && !showQR && (
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              placeholder="Enter your name"
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={30}
            />
            <button
              onClick={handleAddParticipant}
              disabled={!currentName.trim() || gameState.participants.length >= 15}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 flex items-center gap-2"
            >
              <UserPlus size={20} />
              Add
            </button>
          </div>
        )}

        {/* Participants List */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Gift size={20} />
            Participants ({gameState.participants.length}/15)
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {gameState.participants.map((name, index) => (
              <div
                key={index}
                className={`p-2 rounded-lg text-sm flex items-center justify-between ${
                  gameState.winners.includes(name)
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100'
                }`}
              >
                <span>{name}</span>
                {gameState.winners.includes(name) && (
                  <Trophy size={16} className="text-yellow-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Draw Controls - Only visible to host */}
        {gameState.isHost && gameState.participants.length > 0 && (
          <div className="space-y-4">
            <button
              onClick={handleDraw}
              disabled={
                gameState.isDrawing ||
                gameState.remainingPrizes === 0 ||
                gameState.participants.filter(
                  name => !gameState.winners.includes(name)
                ).length === 0
              }
              className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
            >
              {gameState.isDrawing ? 'Drawing...' : 'Draw Winner'}
            </button>

            <button
              onClick={resetDraw}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              Reset Draw
            </button>
          </div>
        )}

        {/* Winner Display - Visible to all */}
        {currentWinner && (
          <div className="p-4 bg-yellow-100 rounded-lg flex items-center gap-2 my-4">
            <Trophy className="text-yellow-500" />
            <span>Latest Winner: <strong>{currentWinner}</strong></span>
          </div>
        )}

        {/* Winners List - Visible to all */}
        {gameState.winners.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Previous Winners:</h2>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              {gameState.winners.map((winner, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-500" />
                  <span>{winner}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
