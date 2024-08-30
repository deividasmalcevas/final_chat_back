const express = require("express");
const router = express.Router();
const {
    register, verifyEmail, login, protected, passwordRecovery, passwordReset
} = require("../controllers/controller");

const {
    registerValid, registerToken, loginValid, emailValid, codeValid, passwordValid,
} = require("../middleware/middle");

router.post("/register", registerValid , register);
router.post("/register-token", registerToken , verifyEmail);
router.post("/login", loginValid , login);
router.post("/password-recovery", emailValid , passwordRecovery);
router.post("/password-reset", codeValid, passwordValid , passwordReset);



module.exports = router;