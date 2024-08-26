const express = require("express");
const router = express.Router();
const {
    test, register, verifyEmail
} = require("../controllers/controller");

const {
    registerValid, registerToken,
} = require("../middleware/middle");

router.get("/test", test);
router.post("/register", registerValid , register);
router.post("/register-token", registerToken , verifyEmail);

module.exports = router;