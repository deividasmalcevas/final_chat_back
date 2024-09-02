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

console.log(process.env.ORIGIN);

// Store connected users and their sockets
const userSockets = new Map();

io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    socket.on('user_login', (user) => {
        userSockets.set(user._id, socket.id);
    });

    socket.on('user_logout', (data) => {
        userSockets.delete(data._id);
    });

    // Handle joining a room
    socket.on('join_room', (roomId) => {
        socket.join(roomId); // Join the room specified by roomId
    });

    // Message handling
    socket.on('message', (messageData) => {
        // Send message to other users in the room
        socket.to(messageData.conID).emit('message', messageData); // Send only to the room
    });

    // Reaction handling
    socket.on('reaction', (updatedMessage) => {
        console.log(updatedMessage);
        // Send the updated message with reactions to the room
        socket.to(updatedMessage.conID).emit('message', updatedMessage); // Send the updated message to the room
    });
    
    // Message deletion handling
    socket.on('delete_message', ({ conID, messageId }) => {
        // Send the message ID to the room so others can handle it
        socket.to(conID).emit('message_deleted', messageId); // Send the message ID to the room
    });
    
    socket.on('check_user_status', ({ userId, conID }, callback) => {
        const socketId = userSockets.get(userId); // Get the user's socket ID
    
        if (socketId) {
            
            const isConnected = io.sockets.sockets.get(socketId)?.rooms.has(conID);
    
            callback(isConnected); // Send back the connection status specific to the room
        } else {
            callback(false); // User is not connected at all
        }
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
