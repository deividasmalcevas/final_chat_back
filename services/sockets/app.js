const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require("dotenv");
const path = require("path");
const app = express();

dotenv.config({ path: path.resolve(__dirname, '../../../final_chat_back/.env') });


app.use(cors({})); // Enable CORS for all routes

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.ORIGIN,
        methods: ["GET", "POST"]
    }
});
//a
console.log(process.env.ORIGIN)

// Store connected users and their sockets
const userSockets = new Map();

io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    // Handle user login
    socket.on('user_login', (user) => {
        userSockets.set(user._id, socket.id);
        console.log(`User logged in: ${user.username} with ID: ${user._id}`);
    });

    // Handle user logout
    socket.on('user_logout', (data) => {

        userSockets.delete(data._id);
        console.log(`User logged out with ID: ${data._id}`);
    });

    // Handle disconnect event
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        for (const [userId, socketId] of userSockets.entries()) {
            if (socketId === socket.id) {
                userSockets.delete(userId);
                console.log(`User with ID ${userId} removed from userSockets map after disconnect.`);
                break;
            }
        }
    });
});

const PORT = 1010;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
