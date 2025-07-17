const socket = io();

// --- Login and Session ---
const loginWindow = document.getElementById('loginWindow');
const mainWindow = document.getElementById('mainWindow');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

let username = '';

function showMain() {
  loginWindow.style.display = 'none';
  mainWindow.style.display = '';
}

// Check session on load
fetch('/session').then(async res => {
  if (res.ok) {
    const data = await res.json();
    username = data.username;
    showMain();
  }
});

loginBtn.onclick = async () => {
  username = loginUsername.value.trim();
  const password = loginPassword.value;
  if (!username || !password) {
    loginError.textContent = 'Please enter username and password.';
    return;
  }
  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (res.ok) {
    showMain();
  } else {
    const data = await res.json();
    loginError.textContent = data.error || 'Login failed.';
  }
};

// --- Chessboard ---
const chessboardDiv = document.getElementById('chessboard');
const gameStatus = document.getElementById('gameStatus');

let board = [
  ['♜','♞','♝','♛','♚','♝','♞','♜'],
  ['♟','♟','♟','♟','♟','♟','♟','♟'],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['♙','♙','♙','♙','♙','♙','♙','♙'],
  ['♖','♘','♗','♕','♔','♗','♘','♖']
];
let selected = null;
let myTurn = true;
let gameId = 'default'; // For demo, single room

function renderBoard() {
  chessboardDiv.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      sq.className = 'chess-square ' + ((r+c)%2===0 ? 'light' : 'dark');
      if (selected && selected[0] === r && selected[1] === c) sq.classList.add('selected');
      sq.textContent = board[r][c];
      sq.onclick = () => onSquareClick(r, c);
      chessboardDiv.appendChild(sq);
    }
  }
}
function onSquareClick(r, c) {
  if (!myTurn) return;
  if (selected) {
    socket.emit('move', { from: selected, to: [r, c], gameId });
    selected = null;
  } else if (board[r][c]) {
    selected = [r, c];
  }
  renderBoard();
}
socket.on('move', move => {
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  board[tr][tc] = board[fr][fc];
  board[fr][fc] = '';
  myTurn = !myTurn;
  renderBoard();
  gameStatus.textContent = myTurn ? 'Your turn' : "Opponent's turn";
});
socket.on('gameState', state => {
  board = [
    ['♜','♞','♝','♛','♚','♝','♞','♜'],
    ['♟','♟','♟','♟','♟','♟','♟','♟'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['♙','♙','♙','♙','♙','♙','♙','♙'],
    ['♖','♘','♗','♕','♔','♗','♘','♖']
  ];
  selected = null;
  myTurn = true;
  renderBoard();
  gameStatus.textContent = myTurn ? 'Your turn' : "Opponent's turn";
});
renderBoard();

// --- Chat and Emoji ---
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');

const EMOJIS = ['😀','😂','😍','😎','😢','😡','👍','🙏','🎉','🔥','💯','♟️','♔','♕','♛','🏆'];

emojiBtn.onclick = () => {
  emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'flex' : 'none';
  if (emojiPicker.innerHTML === '') {
    EMOJIS.forEach(e => {
      const span = document.createElement('span');
      span.textContent = e;
      span.onclick = () => {
        socket.emit('emoji', e);
        emojiPicker.style.display = 'none';
      };
      emojiPicker.appendChild(span);
    });
  }
};

sendBtn.onclick = () => {
  const msg = messageInput.value.trim();
  if (msg) {
    socket.emit('chat', msg);
    addMessage(username, msg, true);
    messageInput.value = '';
  }
};

socket.on('chat', ({sender, msg}) => {
  addMessage(sender, msg, sender === username);
});

socket.on('emoji', ({sender, emoji}) => {
  addMessage(sender, emoji, sender === username, true);
});

function addMessage(sender, text, self = false, emoji = false) {
  const div = document.createElement('div');
  div.className = 'message ' + (self ? 'self' : 'peer');
  div.innerHTML = emoji ? `<b>${sender} sent ${text}</b>` : `<b>${sender}:</b> ${text}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
} 
