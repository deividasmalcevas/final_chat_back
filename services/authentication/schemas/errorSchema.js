const mongoose = require('mongoose');
const {errorDb} = require("../../../schemas/allSchemas")

const errorSchema = new mongoose.Schema(errorDb, { collection: 'errors' });

const error = mongoose.model('error', errorSchema);

module.exports = error;