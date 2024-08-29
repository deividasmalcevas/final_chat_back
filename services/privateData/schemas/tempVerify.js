const mongoose = require('mongoose');
const {tempVerify} = require("../../../schemas/allSchemas")

const userSchema = new mongoose.Schema(tempVerify, { collection: 'tempVerify' });

const verify = mongoose.model('tempVerify', userSchema);

module.exports = verify;