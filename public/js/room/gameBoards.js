//#region Create Boards
function createUserBoard(userBoard) {
  let boardHtml = '';
  for (let row = 0; row < 10; row++) {
    let rowHtml = '';
    for (let col = 0; col < 10; col++) {
      rowHtml += `<div class="board-unit droppable" id="R${row}C${col}U" ></div>`;
    }
    boardHtml += '<div class="board-row">' + rowHtml + '</div>';
  }
  userBoard.innerHTML += boardHtml;
}

function createOpponentBoard(opponentBoard) {
  let boardHtml = '';
  for (let row = 0; row < 10; row++) {
    let rowHtml = '';
    for (let col = 0; col < 10; col++) {
      rowHtml += `<div class="board-unit" onclick="handleOpponentBoardClick(this, event)" id="R${row}C${col}O" ></div>`;
    }
    boardHtml += '<div class="board-row">' + rowHtml + '</div>';
  }
  opponentBoard.innerHTML += boardHtml;
}

//button handler for opponent board
const handleOpponentBoardClick = (element) => {
  if (!isStarted || !isUserTurn) return;
  if (!element.classList.contains('clicked')) {
    isUserTurn = false;
    element.classList.add('clicked');
    socket.emit('userGuess', element.id, roomName);
  }
};
