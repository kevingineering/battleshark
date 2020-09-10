/* TODO 
  Loading spinner
  Allow users to reset sharks if opponent leaves
  Count sharks on board rather than not in tank
  Leave room
  Game over modal
*/

//#region GLOBAL VARIABLES AND DOM ELEMENTS
//CSS pixel widths - used for determining shark locations

const localhost = window.location.hostname;

//DOM ELEMENTS
const leaveButton = document.getElementById('leave-btn');
const resetButton = document.getElementById('reset-btn');
const gameOverMessage = document.getElementById('game-over-message');

//userName modal
const userNameModal = document.getElementById('user-name-modal');
const userNameInput = document.getElementById('user-name');
const modalMessage = document.getElementById('modal-message');
const nameButton = document.getElementById('name-btn');

//chat
const tankHeaderButton = document.getElementById('tank-header-btn');
const chatHeaderButton = document.getElementById('chat-header-btn');
const tankContainer = document.getElementById('shark-container');
const chatContainer = document.getElementById('chat-container');
const chatMessages = document.getElementById('chat-messages');
const chatNotification = document.getElementById('chat-notification');
const chatEntry = document.getElementById('chat-entry');
const chatSendButton = document.getElementById('chat-send-btn');

//game boards
const boardUserName = document.getElementById('board-user-name');
const boardOpponentName = document.getElementById('board-opponent-name');
const userBoard = document.getElementById('user-board');
const opponentBoard = document.getElementById('opponent-board');
const userLockButton = document.getElementById('user-lock-btn');
const userLock = document.getElementById('user-lock');
const opponentLock = document.getElementById('opponent-lock');
const opponentWaiting = document.getElementById('opponent-waiting');

//GLOBAL VARIABLES
const socket = io('/room');

let roomName = unescape(window.location.href.split('?room=')[1]);
let userName = '';
let opponentName = '';
const botName = 'Poseidon';

let isTank = true; //if tank or chat is visible
let isUserLocked = false; //user has submitted board
let isOpponentLocked = false; //opponent has submitted board
let isStarted = false; //game has started
let isUserTurn = false;

//#endregion

//if room is already full, push user back to lobby - should never happen
socket.on('roomFull', () => window.location.assign('/'));

//STARTUP
socket.emit('joinRoom', roomName);
addToChat(`Welcome to ${roomName}!`, botName, 0);
createUserBoard(userBoard);
createOpponentBoard(opponentBoard);
addSharkEventListeners();
userNameInput.focus();

//#region NAME MODAL
nameButton.addEventListener('click', () => {
  submitUserName();
});

userNameInput.addEventListener('keyup', (e) => {
  if (e.keyCode === 13) {
    submitUserName();
  }
});

function submitUserName() {
  userName = userNameInput.value;
  if (userName.trim() === '') {
    modalMessage.innerText = 'Please enter a name';
    return;
  }
  userNameModal.classList.remove('unhide');
  boardUserName.innerText = userName;
  socket.emit('userName', userName, roomName);
}
//#endregion

//#region LOCK BOARDS AND START GAME
userLockButton.addEventListener('click', lockUserBoard); //only visible when all sharks on board

function lockUserBoard() {
  isUserLocked = true;
  removeSharkEventListeners();

  userLockButton.classList.remove('unhide');
  tankContainer.classList.remove('unhide');
  isTank = false;
  chatContainer.classList.add('unhide');
  chatNotification.classList.remove('unhide');

  //send board array to backend
  socket.emit('userBoard', roomName, getUserBoardArray());

  if (!isOpponentLocked) {
    userBoard.classList.add('faded');
    userLock.classList.add('unhide');
  }
  if (isOpponentLocked) {
    gameStart();
  }
}

function gameStart() {
  //clean up UI
  cleanUserBoard();
  cleanOpponentBoard();
  //reenable buttons
  isStarted = true;
}

socket.on('userTurn', (isTurn) => {
  if (isTurn) {
    isUserTurn = isTurn;
    userTurn();
  } else {
    opponentTurn();
  }
});

function userTurn() {
  userBoard.classList.add('faded');
  opponentBoard.classList.remove('faded');
}

function opponentTurn() {
  userBoard.classList.remove('faded');
  opponentBoard.classList.add('faded');
}

//#endregion

//#region CHAT AND CHAT/TANK TOGGLE
tankHeaderButton.addEventListener('click', () => {
  if (isTank) return;
  isTank = true;
  tankContainer.classList.add('unhide');
  chatContainer.classList.remove('unhide');
});

chatHeaderButton.addEventListener('click', () => {
  if (!isTank) return;
  isTank = false;
  tankContainer.classList.remove('unhide');
  chatContainer.classList.add('unhide');
  chatNotification.classList.remove('unhide');
});

chatEntry.addEventListener('keyup', (e) => {
  if (e.keyCode === 13) {
    submitChat();
  }
});

chatSendButton.addEventListener('click', () => submitChat());

function submitChat() {
  addToChat(chatEntry.value, userName, 1);
  socket.emit('chatMessage', chatEntry.value, roomName);
  chatEntry.value = '';
}

socket.on('chatReceived', (message) => addToChat(message, opponentName, 2));

function addToChat(message, sender, id) {
  const div = document.createElement('div');
  let chatClass =
    (id === 0 && 'chat-bot-style') ||
    (id === 1 && 'chat-user-style') ||
    'chat-opp-style';
  div.innerHTML = `<div><p ${
    id === 0 && 'class=chat-bot-italic'
  }><span class="${chatClass} chat-bold">${sender}: </span>${message}</p></div>`;
  chatMessages.appendChild(div);
  //scroll down
  chatMessages.scrollTop = chatMessages.scrollHeight;
  if (sender !== userName && isTank) {
    chatNotification.classList.add('unhide');
  }
}
//#endregion

//#region USER LEAVES
leaveButton.addEventListener('click', () => {
  //socket automatically disconnects
  window.location.assign('/');
});
//#endregion

//#region SOCKET.ON
socket.on('opponentName', (name) => {
  opponentName = name;
  boardOpponentName.innerText = name;
  opponentWaiting.classList.add('unhide');
});

socket.on('opponentLocked', () => {
  if (resetButton.classList.contains('unhide')) {
    resetBoard();
    gameOverMessage.innerText = '';
    resetButton.classList.remove('unhide');
  }
  isOpponentLocked = true;
  if (isUserLocked) {
    gameStart();
  } else {
    opponentLock.classList.add('unhide');
    opponentWaiting.classList.remove('unhide');
  }
});

socket.on('opponentLeft', () => {
  cleanOpponentBoard();
  isStarted && resetBoard();
  isStarted = false;
  opponentBoard.classList.add('faded');
  chatMessages.innerText = '';
  boardOpponentName.innerText = 'Waiting...';

  addToChat(`${opponentName} left the room`, botName, 0);
});

socket.on('userHit', (location) => {
  let square = document.getElementById(location);
  square.innerHTML += '<img src="images/hit.png" class="marker"></img>';
  opponentTurn();
});
socket.on('opponentHit', (location) => {
  isUserTurn = true;
  location = location.substring(0, 4) + 'U';
  let square = document.getElementById(location);
  square.innerHTML += '<img src="images/hit.png" class="marker"></img>';
  userTurn();
});
socket.on('userMiss', (location) => {
  let square = document.getElementById(location);
  square.innerHTML += '<img src="images/miss.png" class="marker"></img>';
  opponentTurn();
});
socket.on('opponentMiss', (location) => {
  isUserTurn = true;
  location = location.substring(0, 4) + 'U';
  let square = document.getElementById(location);
  square.innerHTML += '<img src="images/miss.png" class="marker"></img>';
  userTurn();
});
socket.on('userWins', () => {
  addToChat(`Congratulations, ${userName}!`, botName, 0);
  gameOverMessage.innerText = 'You win :)';
  gameOverMessage.classList.add('unhide');
  endGame();
});
socket.on('userLoses', () => {
  addToChat(`Better luck next time, ${userName}!`, botName, 0);
  gameOverMessage.innerText = 'You lose :/';
  gameOverMessage.classList.add('unhide');
  endGame();
});

function endGame() {
  isStarted = false;
  isUserTurn = false;
  isUserLocked = false; //user has submitted board
  isOpponentLocked = false; //opponent has submitted board
  resetButton.classList.add('unhide');
  userBoard.classList.remove('faded');
  opponentBoard.classList.remove('faded');
}

resetButton.addEventListener('click', () => {
  resetBoard();
  gameOverMessage.innerText = '';
  resetButton.classList.remove('unhide');
});

function resetBoard() {
  //put sharks in tanks
  let ids = ['5', '4', '3a', '3b', '2'];
  ids.forEach((id) => putSharkInTank(id));

  //clear markers
  let markers = document.querySelectorAll('.marker');
  markers.forEach((e) => {
    e.parentNode.removeChild(e);
  });

  //remove clicked class from elements
  const clicked = document.getElementsByClassName('clicked');
  while (clicked.length > 0) {
    clicked[0].classList.remove('clicked');
  }

  //boards as in beginning
  cleanUserBoard();
  cleanOpponentBoard();
  opponentBoard.classList.add('faded');
  addSharkEventListeners();

  //reset variables
  isUserLocked = false;
  isOpponentLocked = false;
  isUserTurn = false;

  //set to tanks
  isTank = true;
  tankContainer.classList.add('unhide');
  chatContainer.classList.remove('unhide');
}

function cleanUserBoard() {
  userLock.classList.remove('unhide');
  userLockButton.classList.remove('unhide');
  userBoard.classList.remove('faded');
}

function cleanOpponentBoard() {
  opponentLock.classList.remove('unhide');
  opponentWaiting.classList.remove('unhide');
  opponentBoard.classList.remove('faded');
  isOpponentLocked = false;
}

//#endregion
