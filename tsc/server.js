"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var http_1 = __importDefault(require("http"));
var socket_io_1 = __importDefault(require("socket.io"));
var path_1 = __importDefault(require("path"));
//initialize express and socket
var app = express_1.default();
//TODO - CORS
//serve static assets - ../ because we compile to tsc folder
app.use(express_1.default.static(path_1.default.join(__dirname, '../', 'public')));
var server = http_1.default.createServer(app);
var io = socket_io_1.default(server);
var roomIo = io.of('/room');
require('./socketMethods')(io, roomIo);
//configure and listen on port
var port = process.env.PORT || 5000;
console.log(process.env.PORT);
server.listen(port, function () { return console.log("Listening on port " + port); });
