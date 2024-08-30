const express = require("express");
const router = express.Router();
const {
     protected, getUser, logout, changeAvatar, changeBio, changeUsername, changeEmail, verifyEmailChange, changePassword,
    deleteUser, verifyDelChange, getUsers, getSingleUser, sendPrivateMsg, getConversation
} = require("../controllers/controller");

const {
    tokenValid, bioValid, usernameValid, emailValid, codeValid, passwordValid, privateMsgValid
} = require("../middleware/middle");
const {uploadAvatar} = require("../plugins/multer");

router.get("/protected", tokenValid, protected);
router.get("/get-user", tokenValid, getUser);
router.get("/users", tokenValid, getUsers);
router.get("/users/:username", tokenValid, getSingleUser);
router.get("/get-private-con/:username", tokenValid, getConversation);

router.post("/logout", tokenValid, logout);
router.post("/change-avatar", tokenValid, uploadAvatar, changeAvatar);
router.post("/change-bio", tokenValid, bioValid, changeBio);
router.post("/change-username", tokenValid, usernameValid , changeUsername);
router.post("/change-email", tokenValid, emailValid , changeEmail);
router.post("/verify-email-code", tokenValid, codeValid , verifyEmailChange);
router.post("/change-password", tokenValid, passwordValid , changePassword);
router.post("/delete-user", tokenValid, deleteUser);
router.post("/delete-user-code", tokenValid, verifyDelChange);
router.post("/send-private-msg", tokenValid, privateMsgValid ,sendPrivateMsg);


module.exports = router;