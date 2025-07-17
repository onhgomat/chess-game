const express = require('express');
const http = require('http');
const session = require('express-session');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'chess-secret',
  resave: false,
  saveUninitialized: true
}));

app.use(express.static(path.join(__dirname, 'client')));

// In-memory user store (for demo)
const users = {};

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  if (!users[username]) users[username] = { password };
  if (users[username].password !== password) return res.status(401).json({ error: 'Invalid credentials' });
  req.session.username = username;
  res.json({ success: true });
});

app.get('/session', (req, res) => {
  if (req.session.username) {
    res.json({ username: req.session.username });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

let games = {};

io.on('connection', (socket) => {
  socket.on('joinGame', (gameId, username) => {
    socket.join(gameId);
    socket.username = username;
    socket.gameId = gameId;
    if (!games[gameId]) {
      games[gameId] = { players: [], moves: [], chat: [] };
    }
    if (!games[gameId].players.includes(username)) {
      games[gameId].players.push(username);
    }
    io.to(gameId).emit('gameState', games[gameId]);
  });

  socket.on('move', (move) => {
    const game = games[socket.gameId];
    if (game) {
      game.moves.push(move);
      io.to(socket.gameId).emit('move', move);
    }
  });

  socket.on('chat', (msg) => {
    const game = games[socket.gameId];
    if (game) {
      game.chat.push({ sender: socket.username, msg });
      io.to(socket.gameId).emit('chat', { sender: socket.username, msg });
    }
  });

  socket.on('emoji', (emoji) => {
    io.to(socket.gameId).emit('emoji', { sender: socket.username, emoji });
  });

  socket.on('disconnect', () => {
    const game = games[socket.gameId];
    if (game) {
      game.players = game.players.filter(p => p !== socket.username);
      io.to(socket.gameId).emit('gameState', game);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chess server running on http://localhost:${PORT}`);
}); 
