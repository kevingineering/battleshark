/* TODO
  tell user when they try to join full room
  add optional password to rooms and display lock on rooms with it
  open and close join-modal for rooms with password
  loading spinner
*/

//#region GLOBAL VARIABLES AND DOM ELEMENTS

//DOM ELEMENTS
const openCreateModalButton = document.getElementById('open-create-modal');
const createRoomModal = document.getElementById('create-modal');
const modalMessage = document.getElementById('modal-message');
const createRoomName = document.getElementById('room-name');
const closeButton = document.getElementById('close');

// const joinRoomModal = document.getElementById('join-modal');
// const joinRoomPassword = document.getElementById('room-password');

const createRoomButton = document.getElementById('create-btn');
const searchBar = document.getElementById('search-room');
const roomList = document.getElementById('room-list');
const emptySearchMessage = document.getElementById('empty-search-message');

//GLOBAL VARIABLES
const socket = io();
let rooms = [];
let isFiltered = false;

//#endregion

//STARTUP
// createRoomList(rooms);

//#region FUNCTIONS AND EVENT LISTENERS
function createRoomList(rooms) {
  if (rooms.length === 0) {
    if (isFiltered) {
      roomList.innerHTML =
        '<div class="empty-message"><h3>No rooms match your search.</h3></div>';
    } else {
      roomList.innerHTML =
        '<div class="empty-message"><h3>There are currently no open rooms. Create one!</h3></div>';
    }
  } else {
    roomList.innerHTML = `
      ${rooms
        .map(
          (room) =>
            `<li class="collection-item"><a onclick="handleRoomClicked('${room}')">${room}</a></li>`
        )
        .join('')}
    `;
  }
}

function goToRoom(roomName) {
  window.location.assign(`/room.html?room=${roomName}`);
}

searchBar.addEventListener('input', () => {
  if (searchBar.value !== '') {
    isFiltered = true;
  } else {
    isFiltered = false;
  }
  filterRooms(rooms, searchBar.value);
});

function filterRooms(rooms, input) {
  let filteredRooms = rooms.filter((room) => {
    //Regular expression (regex) is used for searching text, 'gi' makes it not case sensitive
    const regex = new RegExp(input, 'gi');
    return room.match(regex);
  });

  createRoomList(filteredRooms);
}

function handleRoomClicked(element) {
  socket.emit('requestRoom', element);
}

openCreateModalButton.addEventListener('click', () => {
  createRoomModal.classList.add('unhide');
  createRoomName.focus();
});

createRoomName.addEventListener('keyup', (e) => {
  if (e.keyCode === 13) {
    createRoom();
  }
});

function createRoom() {
  let roomName = createRoomName.value;
  if (roomName.trim() === '') {
    modalMessage.innerText = 'Please enter a room name';
    return;
  }
  //server checks if room name already taken and responds with socket, see region SOCKET.ON
  socket.emit('createRoom', roomName);
}

createRoomButton.addEventListener('click', () => createRoom());

closeButton.addEventListener('click', () => {
  createRoomName.value = '';
  modalMessage.innerText = '';
  createRoomModal.classList.remove('unhide');
});

//#endregion

//#region SOCKET.ON

//occurs immediately when hitting page
socket.on('roomList', (list) => {
  rooms = list;
  createRoomList(rooms);
});

//occurs when another user adds a room
socket.on('roomAdded', (room) => {
  rooms.push(room);
  !isFiltered && createRoomList(rooms);
});

//occurs after create room if room name already taken
socket.on(
  'nameUsed',
  () => (modalMessage.innerText = 'Room name already taken')
);

//occurs when user clicks room on list or after create room if room name not taken
socket.on('roomAvailable', (roomName) => {
  goToRoom(roomName);
});

socket.on('roomFull', (roomName) => {
  rooms = rooms.filter((room) => room !== roomName);
  createRoomList(rooms);
});

//#endregion
