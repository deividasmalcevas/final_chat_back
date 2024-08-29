const mongoose = require('mongoose');
const {user} = require("../../../schemas/allSchemas")

const userSchema = new mongoose.Schema(user, { collection: 'Users' });

const User = mongoose.model('User', userSchema);

module.exports = User;