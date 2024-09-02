const express = require("express");
const router = express.Router();
const {
     protected, getUser, logout, changeAvatar, changeBio, changeUsername, changeEmail, verifyEmailChange, changePassword,
    deleteUser, verifyDelChange, getUsers, getSingleUser, sendPrivateMsg, addReactionMsg, getPrivateCon, deleteMessage,
    deleteConversation, getPublicConversations, createPublicRoom, getSingleRoom, sendPublicMsg, deleteRoom,
    getUserConversations,
    addFriend,
    sendNotification,
    checkFriend,
    getFriends,
    getNotifications,
    viewAllNotifications,
    deleteNotification,
    rejectFriend
} = require("../controllers/controller");

const {
    tokenValid, bioValid, usernameValid, emailValid, codeValid, passwordValid, privateMsgValid, addMsgReactValid,
    delMsgValid, delConvoValid, createRoomValid, getRoomValid, publicMsgValid, deleteRoomValid
} = require("../middleware/middle");
const {uploadAvatar} = require("../plugins/multer");

router.get("/protected", tokenValid, protected);
router.get("/get-user", tokenValid, getUser);
router.get("/users", tokenValid, getUsers);
router.get("/users/:username", tokenValid, getSingleUser);
router.get("/get-private-con/:userId", tokenValid, getPrivateCon);
router.get("/conversations", tokenValid, getPublicConversations);
router.get("/get-room/:roomId", tokenValid, getRoomValid , getSingleRoom);
router.get("/user-conversations", tokenValid, getUserConversations);
router.get("/get-friends", tokenValid, getFriends);
router.get("/get-notifications", tokenValid, getNotifications);

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
router.post("/add-msg-reaction", tokenValid, addMsgReactValid , addReactionMsg);
router.post("/del-msg", tokenValid, delMsgValid , deleteMessage);
router.post("/del-convo", tokenValid, delConvoValid , deleteConversation);
router.post("/create-room", tokenValid, createRoomValid , createPublicRoom);
router.post("/send-prublic-msg", tokenValid, publicMsgValid , sendPublicMsg);
router.post("/delete-room", tokenValid, deleteRoomValid, deleteRoom);
router.post("/add-friend", tokenValid, addFriend);
router.post("/check-friend", tokenValid, checkFriend);
router.post("/send-notification", tokenValid, sendNotification);
router.post("/view-notifications", tokenValid, viewAllNotifications);
router.post("/del-notification", tokenValid,  deleteNotification);
router.post("/reject-friend", tokenValid,  rejectFriend);

module.exports = router;