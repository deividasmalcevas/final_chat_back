const mongoose = require('mongoose');
const {conversation} = require("../../../schemas/allSchemas")

const messageSchema = new mongoose.Schema(conversation, { collection: 'Conversations' });

const message = mongoose.model('Conversation', messageSchema);

module.exports = message;