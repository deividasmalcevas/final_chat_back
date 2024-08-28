const express = require("express");
const router = express.Router();
const {
     protected
} = require("../controllers/controller");

const {
    tokenValid
} = require("../middleware/middle");

router.get("/protected", tokenValid ,protected);

module.exports = router;