const mongoose = require('mongoose');
const {tempUser} = require("../../../schemas/allSchemas")

const userSchema = new mongoose.Schema(tempUser, { collection: 'tempUser' });

const User = mongoose.model('tempUser', userSchema);

module.exports = User;