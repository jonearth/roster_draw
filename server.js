// server.js
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const http = createServer(app);
const io = new Server(http);

// Store game state
let gameState = {
  participants: [],
  winners: [],
  remainingPrizes: 15,
  isDrawing: false,
  hostSocketId: null // Store the host's socket ID
};

app.use(express.static(join(__dirname, 'dist')));

io.on('connection', (socket) => {
  console.log('A user connected');
  
  // If this is the first connection, make them the host
  if (!gameState.hostSocketId) {
    gameState.hostSocketId = socket.id;
  }
  
  // Send current game state and whether this client is the host
  socket.emit('gameState', {
    ...gameState,
    isHost: socket.id === gameState.hostSocketId
  });

  // Handle host disconnection
  socket.on('disconnect', () => {
    if (socket.id === gameState.hostSocketId) {
      // If host disconnects, assign host role to next connected client
      const clients = Array.from(io.sockets.sockets.keys());
      if (clients.length > 0) {
        gameState.hostSocketId = clients[0];
        io.to(clients[0]).emit('gameState', {
          ...gameState,
          isHost: true
        });
      } else {
        gameState.hostSocketId = null;
      }
    }
  });

  // Handle new participant
  socket.on('addParticipant', (name) => {
    if (!gameState.participants.includes(name) && gameState.participants.length < 15) {
      gameState.participants.push(name);
      // Broadcast updated state to all clients
      io.sockets.sockets.forEach((clientSocket) => {
        clientSocket.emit('gameState', {
          ...gameState,
          isHost: clientSocket.id === gameState.hostSocketId
        });
      });
    }
  });

  // Handle draw (only allow if request comes from host)
  socket.on('draw', () => {
    if (socket.id === gameState.hostSocketId && !gameState.isDrawing && gameState.remainingPrizes > 0) {
      const eligibleParticipants = gameState.participants.filter(
        name => !gameState.winners.includes(name)
      );

      if (eligibleParticipants.length > 0) {
        gameState.isDrawing = true;
        io.emit('gameState', {
          ...gameState,
          isHost: socket.id === gameState.hostSocketId
        });

        setTimeout(() => {
          const winner = eligibleParticipants[
            Math.floor(Math.random() * eligibleParticipants.length)
          ];
          gameState.winners.push(winner);
          gameState.remainingPrizes--;
          gameState.isDrawing = false;
          
          io.sockets.sockets.forEach((clientSocket) => {
            clientSocket.emit('gameState', {
              ...gameState,
              isHost: clientSocket.id === gameState.hostSocketId
            });
          });
          io.emit('winner', winner);
        }, 2000);
      }
    }
  });

  // Handle reset (only allow if request comes from host)
  socket.on('reset', () => {
    if (socket.id === gameState.hostSocketId) {
      const currentHostId = gameState.hostSocketId;
      gameState = {
        participants: [],
        winners: [],
        remainingPrizes: 15,
        isDrawing: false,
        hostSocketId: currentHostId
      };
      
      io.sockets.sockets.forEach((clientSocket) => {
        clientSocket.emit('gameState', {
          ...gameState,
          isHost: clientSocket.id === gameState.hostSocketId
        });
      });
    }
  });

  // Handle participant removal
  socket.on('removeParticipant', (name) => {
    if (socket.id === gameState.hostSocketId) {
      gameState.participants = gameState.participants.filter(p => p !== name);
      io.sockets.sockets.forEach((clientSocket) => {
        clientSocket.emit('gameState', {
          ...gameState,
          isHost: clientSocket.id === gameState.hostSocketId
        });
      });
    }
  });

});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
