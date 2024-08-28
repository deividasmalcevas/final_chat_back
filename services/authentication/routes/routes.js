const express = require("express");
const router = express.Router();
const {
    register, verifyEmail, login, protected
} = require("../controllers/controller");

const {
    registerValid, registerToken, loginValid,
} = require("../middleware/middle");

router.post("/register", registerValid , register);
router.post("/register-token", registerToken , verifyEmail);
router.post("/login", loginValid , login);

module.exports = router;