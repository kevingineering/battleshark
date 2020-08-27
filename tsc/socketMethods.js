"use strict";
//#region VARIABLES AND INTERFACES
var rooms = {
// ['Great White']: { roomName: 'Great White' },
// ['Hammerhead']: { roomName: 'Hammerhead' },
// ['Basking']: { roomName: 'Basking' },
// ['Tiger']: { roomName: 'Tiger' },
// ['Baby']: { roomName: 'Baby' },
};
var users = {};
//#endregion
exports = module.exports = function (io, roomIo) {
    //Lobby sockets
    io.on('connection', function (socket) {
        socket.emit('roomList', getOpenRooms());
        socket.on('createRoom', function (roomName) { return createRoom(socket, roomName); });
        socket.on('requestRoom', function (roomName) {
            return requestRoom(socket, roomName);
        });
    });
    //Room sockets
    roomIo.on('connection', function (socket) {
        //must pass io to functions because socket.to(socket.id).emit() does not work
        socket.on('joinRoom', function (roomName) {
            joinRoom(socket, roomName);
            //emit to default namespace
            io.emit('roomList', getOpenRooms());
        });
        socket.on('userName', function (name, roomName) {
            return addUserName(socket, name, roomName);
        });
        socket.on('userBoard', function (roomName, board) {
            return lockUserBoard(socket, roomName, board);
        });
        socket.on('userGuess', function (location, roomName) {
            return userGuess(socket, location, roomName);
        });
        socket.on('chatMessage', function (message, roomName) {
            return chatMessage(socket, message, roomName);
        });
        socket.on('disconnecting', function () {
            userDisconnect(socket);
            io.emit('roomList', getOpenRooms());
        });
    });
};
//#region LOBBY SOCKET FUNCTIONS
var getOpenRooms = function () {
    var openRooms = [];
    for (var _i = 0, _a = Object.getOwnPropertyNames(rooms); _i < _a.length; _i++) {
        var key = _a[_i];
        if (!(rooms[key].user1Id && rooms[key].user2Id)) {
            openRooms.push(key);
        }
    }
    return openRooms;
};
var createRoom = function (socket, roomName) {
    //check if room name already used
    //if not, create room and tell everyone about it
    if (rooms[roomName]) {
        socket.emit('nameUsed');
    }
    else {
        rooms[roomName] = { roomName: roomName };
        socket.emit('roomAvailable', roomName);
        socket.broadcast.emit('roomAdded', roomName);
    }
};
var requestRoom = function (socket, roomName) {
    //tell user if room is full
    if (!(rooms[roomName].user1Id && rooms[roomName].user2Id)) {
        socket.emit('roomAvailable', roomName);
    }
    else {
        socket.emit('roomFull');
    }
};
//#endregion
//#region ROOM SOCKET FUNCTIONS
var joinRoom = function (socket, roomName) {
    var room = rooms[roomName];
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
    }
    else if (room && !room.user2Id) {
        room.user2Id = socket.id;
        users[socket.id] = {};
        // send user the opponent name and board locked status if they exist
        if (room.user1Id && users[room.user1Id].name) {
            socket.emit('opponentName', users[room.user1Id].name);
            if (users[room.user1Id].board) {
                socket.emit('opponentLocked');
            }
        }
    }
    else {
        socket.emit('roomFull', roomName);
    }
};
var addUserName = function (socket, name, roomName) {
    users[socket.id].name = name;
    socket.to(roomName).emit('opponentName', name);
};
//save
//tell other user
var lockUserBoard = function (socket, roomName, board) {
    users[socket.id].board = board;
    //initialize empty guess array for user
    //method below causes issues - still not sure why
    // let guessBoard: any[] = new Array(10).fill(new Array(10).fill(false));
    var guessBoard = new Array(10);
    for (var row = 0; row < 10; row++) {
        var rowArray = new Array(10);
        for (var col = 0; col < 10; col++) {
            rowArray[col] = '';
        }
        guessBoard[row] = rowArray;
    }
    users[socket.id].guessBoard = guessBoard;
    socket.to(roomName).emit('opponentLocked');
    var room = rooms[roomName];
    //begin game if two users with locked boards
    if (room.user1Id &&
        users[room.user1Id].board &&
        room.user2Id &&
        users[room.user2Id].board) {
        socket.to(roomName).emit('userTurn', true);
        socket.emit('userTurn', false);
    }
};
//determine if hit or miss
//tell both users location and status
var userGuess = function (socket, location, roomName) {
    var xLoc = +location[1];
    var yLoc = +location[3];
    var opponent = getOpponent(socket.id, roomName);
    if (users[opponent].board[xLoc][yLoc]) {
        socket.emit('userHit', location);
        socket.to(roomName).emit('opponentHit', location);
        users[socket.id].guessBoard[xLoc][yLoc] = true;
        var count_1 = 0;
        users[socket.id].guessBoard.forEach(function (row) {
            row.forEach(function (item) {
                if (item)
                    count_1++;
            });
        });
        if (count_1 === 17) {
            socket.emit('userWins');
            socket.to(roomName).emit('userLoses');
        }
    }
    else {
        socket.emit('userMiss', location);
        socket.to(roomName).emit('opponentMiss', location);
    }
};
//send to other user
var chatMessage = function (socket, message, roomName) {
    var opponent = getOpponent(socket.id, roomName);
    opponent && socket.to(roomName).emit('chatReceived', message);
};
//tell other person
//reset gameboards
//clear chat?
//destroy room if no one
//clear frontend variables
var userDisconnect = function (socket) {
    delete users[socket.id];
    for (var _i = 0, _a = Object.getOwnPropertyNames(rooms); _i < _a.length; _i++) {
        var key = _a[_i];
        if (rooms[key].user1Id === socket.id || rooms[key].user2Id === socket.id) {
            socket.to(key).emit('opponentLeft');
            var opponent = getOpponent(socket.id, key);
            if (opponent) {
                users[opponent].guessBoard = [];
                users[opponent].board = [];
                if (rooms[key].user1Id === socket.id) {
                    rooms[key].user1Id = undefined;
                }
                else {
                    rooms[key].user2Id = undefined;
                }
            }
            else {
                !opponent && delete rooms[key];
            }
            break;
        }
    }
};
//helper function
var getOpponent = function (id, roomName) {
    var room = rooms[roomName];
    if (room && room.user1Id === id) {
        return room.user2Id;
    }
    else if (room && room.user2Id === id) {
        return room.user1Id;
    }
    else {
        return undefined;
    }
};
//#endregion
