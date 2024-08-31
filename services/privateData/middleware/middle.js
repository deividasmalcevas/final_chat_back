const jwt = require('jsonwebtoken');

module.exports = {
    tokenValid: (req, res, next) => {
        try {
            const token = req.cookies.token; // Extract token from cookies
            if (!token) {
                res.clearCookie('isLoggedIn'); // Clear cookie if token is missing
                return res.status(401).json({ success: false, message: 'Session ended. Please log in again.' });
            }

            jwt.verify(token, process.env.JWT_KEY, (err, decoded) => {
                if (err) {
                    res.clearCookie('token');
                    res.clearCookie('isLoggedIn');
                    return res.status(401).json({ success: false, message: 'Session ended. Please log in again.' });
                }
                req.user = decoded; // Store user info in req.user
                next(); // Proceed to the next middleware or route handler
            });
        } catch (error) {
            res.clearCookie('token');
            res.clearCookie('isLoggedIn');
            return res.status(401).json({ success: false, message: 'Session ended. Please log in again.' });
        }
    },
    bioValid: (req, res, next) => {
        const { bio } = req.body;
        if (!bio) { return res.status(404).json({ success: false, message: 'Bio not found.' });}
        if(bio.length >= 1000) return res.send({error: "Bio should be less than 1000 characters long." })
        next();
    },
    usernameValid: (req, res, next) => {
        const { username } = req.body;
        if (username.length < 5 || username.length > 25) {
            return res.send({ error: "Username must be between 5 and 25 characters long." });
        }
        next();
    },
    emailValid: (req, res, next) => {
        const { email } = req.body;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return res.send({ error: "Invalid email address." });
        }
        next();
    },
    codeValid: (req, res, next) => {
        const { code } = req.body;
        if (!code || code.length !== 8) {
            return res.send({ error: "Invalid code" });
        }
        next();
    },
    passwordValid: (req, res, next) => {
        const { newPassword, password } = req.body;
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.send({error: "Password must be at least 8 characters long, contain at least one uppercase letter, and one number.",});
        }
        next();
    },
    privateMsgValid: (req, res, next) => {
        const { username, msg } = req.body;
        if (!username || !msg) {
            return res.status(400).send({ error: "Missing username or message." });
        }
        if (msg.length > 2000) {
            return res.status(400).send({ error: "Message too long 2000 character max." });
        }
        next();
    },
    addMsgReactValid: (req, res, next) => {
        const { conID, messageId, reaction } = req.body;
        if (!conID || !messageId || !reaction) {
            return res.send({ error: "Missing conversation, message or reaction" });
        }
        next();
    },
    delMsgValid: (req, res, next) => {
        const { conID, messageId } = req.body;
        if (!conID || !messageId) {
            return res.send({ error: "Missing conversation or message" });
        }
        next();
    },
    delConvoValid: (req, res, next) => {
        const { conID, messageId } = req.body;
        if (!conID) {
            return res.send({ error: "Missing conversation." });
        }
        next();
    },
    createRoomValid: (req, res, next) => {
        const {roomName, bio} = req.body;
        if (!roomName || !bio) {
            return res.send({ error: "Missing room name or bio." });
        }
        if(roomName.length < 5 || roomName.length > 50) {
            return res.send({ error: "Room name must be between 5 - 50 characters long." });
        }
        if(bio.length < 5 || bio.length > 100) {
            return res.send({ error: "Bio name must be between 5 - 100 characters long." });
        }
        next();
    },
    getRoomValid: (req, res, next) => {
        const {roomId} = req.params;
        if (!roomId) {
            return res.send({ error: "Missing room." });
        }
        next();
    },
    publicMsgValid: (req, res, next) => {
        const { roomId, msg } = req.body;

        if (!roomId || !msg) {
            return res.status(400).send({ error: "Missing room or message." });
        }
        if (msg.length > 2000) {
            return res.status(400).send({ error: "Message too long 2000 character max." });
        }
        next();
    },
    deleteRoomValid: (req, res, next) => {
        const {roomId} = req.body;
        if (!roomId) {
            return res.send({ error: "Missing room." });
        }
        next();
    },
};
