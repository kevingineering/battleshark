//#region VARIABLES AND INTERFACES

const rooms: IRoomDictionary = {
  ['Great White']: { roomName: 'Great White' },
  ['Hammerhead']: { roomName: 'Hammerhead' },
  ['Basking']: { roomName: 'Basking' },
  ['Tiger']: { roomName: 'Tiger' },
  ['Baby']: { roomName: 'Baby' },
};

const users: IUserDictionary = {};

interface IRoomDictionary {
  [index: string]: IRoom;
}

interface IUserDictionary {
  [index: string]: IUser;
}

interface IRoom {
  roomName: string;
  user1Id?: string | null | undefined;
  user2Id?: string | null | undefined;
}

interface IUser {
  name?: string;
  board?: string[];
  guessBoard?: any[];
}

//#endregion

exports = module.exports = function (
  io: SocketIO.Server,
  roomIo: SocketIO.Namespace
) {
  //Lobby sockets
  io.on('connection', function (socket) {
    socket.emit('roomList', getOpenRooms());

    socket.on('createRoom', (roomName: string) => createRoom(socket, roomName));

    socket.on('requestRoom', (roomName: string) =>
      requestRoom(socket, roomName)
    );
  });

  //Room sockets
  roomIo.on('connection', (socket) => {
    //must pass io to functions because socket.to(socket.id).emit() does not work
    socket.on('joinRoom', (roomName: string) => {
      joinRoom(socket, roomName);
      //emit to default namespace
      io.emit('roomList', getOpenRooms());
    });

    socket.on('userName', (name: string, roomName: string) =>
      addUserName(socket, name, roomName)
    );

    socket.on('userBoard', (roomName: string, board: []) =>
      lockUserBoard(socket, roomName, board)
    );

    socket.on('userGuess', (location: string, roomName: string) =>
      userGuess(socket, location, roomName)
    );

    socket.on('chatMessage', (message: string, roomName: string) =>
      chatMessage(socket, message, roomName)
    );

    socket.on('disconnecting', () => {
      userDisconnect(socket);
      io.emit('roomList', getOpenRooms());
    });
  });
};

//#region LOBBY SOCKET FUNCTIONS
const getOpenRooms = () => {
  let openRooms = [];
  for (let key of Object.getOwnPropertyNames(rooms)) {
    if (!(rooms[key].user1Id && rooms[key].user2Id)) {
      openRooms.push(key);
    }
  }
  return openRooms;
};

const createRoom = (socket: SocketIO.Socket, roomName: string) => {
  //check if room name already used
  //if not, create room and tell everyone about it
  if (rooms[roomName]) {
    socket.emit('nameUsed');
  } else {
    rooms[roomName] = { roomName };
    socket.emit('roomAvailable', roomName);
    socket.broadcast.emit('roomAdded', roomName);
  }
};

const requestRoom = (socket: SocketIO.Socket, roomName: string) => {
  //tell user if room is full
  if (!(rooms[roomName].user1Id && rooms[roomName].user2Id)) {
    socket.emit('roomAvailable', roomName);
  } else {
    socket.emit('roomFull');
  }
};

//#endregion

//#region ROOM SOCKET FUNCTIONS
const joinRoom = (socket: SocketIO.Socket, roomName: string) => {
  let room = rooms[roomName];
  socket.join(roomName);
  //add user to room if less than two participants
  if (room && !room.user1Id) {
    room.user1Id = socket.id;
    users[socket.id] = {};
    // send user the opponent name and board locked status if they exist
    if (room.user2Id && users[room.user2Id].name) {
      socket.emit('opponentName', users[room.user2Id].name);
      if (users[room.user2Id].board) {
        socket.emit('opponentLocked');
      }
    }
  } else if (room && !room.user2Id) {
    room.user2Id = socket.id;
    users[socket.id] = {};
    // send user the opponent name and board locked status if they exist
    if (room.user1Id && users[room.user1Id].name) {
      socket.emit('opponentName', users[room.user1Id].name);
      if (users[room.user1Id].board) {
        socket.emit('opponentLocked');
      }
    }
  } else {
    socket.emit('roomFull', roomName);
  }
};

const addUserName = (
  socket: SocketIO.Socket,
  name: string,
  roomName: string
) => {
  users[socket.id].name = name;
  socket.to(roomName).emit('opponentName', name);
};

//save
//tell other user
const lockUserBoard = (
  socket: SocketIO.Socket,
  roomName: string,
  board: string[]
) => {
  users[socket.id].board = board;

  //initialize empty guess array for user
  //method below causes issues - still not sure why
  // let guessBoard: any[] = new Array(10).fill(new Array(10).fill(false));
  let guessBoard = new Array(10);
  for (let row = 0; row < 10; row++) {
    let rowArray = new Array(10);
    for (let col = 0; col < 10; col++) {
      rowArray[col] = '';
    }
    guessBoard[row] = rowArray;
  }

  users[socket.id].guessBoard = guessBoard;
  socket.to(roomName).emit('opponentLocked');
  let room = rooms[roomName];
  //begin game if two users with locked boards
  if (
    room.user1Id &&
    users[room.user1Id].board &&
    room.user2Id &&
    users[room.user2Id].board
  ) {
    socket.to(roomName).emit('userTurn', true);
    socket.emit('userTurn', false);
  }
};

//determine if hit or miss
//tell both users location and status
const userGuess = (
  socket: SocketIO.Socket,
  location: string,
  roomName: string
) => {
  let xLoc = +location[1];
  let yLoc = +location[3];
  let opponent = getOpponent(socket.id, roomName)!;
  if (users[opponent].board![xLoc][yLoc]) {
    socket.emit('userHit', location);
    socket.to(roomName).emit('opponentHit', location);
    users[socket.id].guessBoard![xLoc][yLoc] = true;
    let count = 0;
    users[socket.id].guessBoard!.forEach((row) => {
      row.forEach((item: any) => {
        if (item) count++;
      });
    });
    if (count === 17) {
      socket.emit('userWins');
      socket.to(roomName).emit('userLoses');
    }
  } else {
    socket.emit('userMiss', location);
    socket.to(roomName).emit('opponentMiss', location);
  }
};

//send to other user
const chatMessage = (
  socket: SocketIO.Socket,
  message: string,
  roomName: string
) => {
  let opponent = getOpponent(socket.id, roomName);
  opponent && socket.to(roomName).emit('chatReceived', message);
};

//tell other person
//reset gameboards
//clear chat?
//destroy room if no one
//clear frontend variables
const userDisconnect = (socket: SocketIO.Socket) => {
  delete users[socket.id];
  for (let key of Object.getOwnPropertyNames(rooms)) {
    if (rooms[key].user1Id === socket.id || rooms[key].user2Id === socket.id) {
      socket.to(key).emit('opponentLeft');
      let opponent = getOpponent(socket.id, key);
      if (opponent) {
        users[opponent].guessBoard = [];
        users[opponent].board = [];
        if (rooms[key].user1Id === socket.id) {
          rooms[key].user1Id = undefined;
        } else {
          rooms[key].user2Id = undefined;
        }
      } else {
        !opponent && delete rooms[key];
      }
      break;
    }
  }
};

//helper function
const getOpponent = (id: string, roomName: string) => {
  let room = rooms[roomName];
  if (room && room.user1Id === id) {
    return room.user2Id;
  } else if (room && room.user2Id === id) {
    return room.user1Id;
  } else {
    return undefined;
  }
};

//#endregion
