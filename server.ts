import express from 'express';
import http from 'http';
import socketio from 'socket.io';
import path from 'path';

//initialize express and socket
const app = express();

//TODO - CORS
//serve static assets - ../ because we compile to tsc folder
app.use(express.static(path.join(__dirname, '../', 'public')));

const server = http.createServer(app);
const io = socketio(server);
const roomIo = io.of('/room');

require('./socketMethods')(io, roomIo);

//configure and listen on port
const PORT = process.env.port || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
