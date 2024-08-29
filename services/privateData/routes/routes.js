const express = require("express");
const router = express.Router();
const {
     protected, getUser, logout, changeAvatar, changeBio, changeUsername, changeEmail, verifyEmailChange, changePassword,
    deleteUser, verifyDelChange
} = require("../controllers/controller");

const {
    tokenValid, bioValid, usernameValid, emailValid, codeValid, passwordValid
} = require("../middleware/middle");
const {uploadAvatar} = require("../plugins/multer");

router.get("/protected", tokenValid, protected);
router.get("/get-user", tokenValid, getUser);
router.post("/logout", tokenValid, logout);
router.post("/change-avatar", tokenValid, uploadAvatar, changeAvatar);
router.post("/change-bio", tokenValid, bioValid, changeBio);
router.post("/change-username", tokenValid, usernameValid , changeUsername);
router.post("/change-email", tokenValid, emailValid , changeEmail);
router.post("/verify-email-code", tokenValid, codeValid , verifyEmailChange);
router.post("/change-password", tokenValid, passwordValid , changePassword);
router.post("/delete-user", tokenValid, deleteUser);
router.post("/delete-user-code", tokenValid, verifyDelChange);

module.exports = router;