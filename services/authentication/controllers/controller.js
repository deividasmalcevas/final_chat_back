const User = require('../schemas/userSchemas');
const TempUser = require('../schemas/tempSchema');
const tempVerify = require('../schemas/tempVerify');

const logError = require('../plugins/errSaver')
const bcrypt = require('bcrypt');
const {sendVerifyEmail} = require("../plugins/sendEmail");
const generateVerificationCode = require('../plugins/gen8code');
const jwt = require('jsonwebtoken');
const {user} = require("../../../schemas/allSchemas");

module.exports = {
    login: async (req, res) => {

        const { identifier, password } = req.body;

        try {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            let user;

            if (emailRegex.test(identifier)) {
                user = await User.findOne({ email: identifier });
            } else {
                user = await User.findOne({ username: identifier });
            }

            if (!user) {
                return res.status(400).json({ error: "Invalid email/username or password." });
            }

            // Check if the password is correct
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: "Invalid email/username or password." });
            }

            await User.findOneAndUpdate(
                { _id: user._id },
                { $set: { timeUpdated: Date.now() } }
            );

            // Create JWT token
            const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_KEY, {
                expiresIn: '1h',
            });

            // Set HttpOnly cookie
            res.cookie('token', token, {
                httpOnly: true,  // Prevents access via JavaScript
                // secure: false,   // Set to true if using HTTPS
                maxAge: 3600000, // 1 hour
            });
            //for log
            res.cookie('isLoggedIn', true, {
                maxAge: 3600000, // 1 hour
                path: '/', // Path where the cookie is available
            });

            return res.status(200).json({ success: true, message: 'Login Success' });
        } catch (error) {
            await logError({
                service: 'Authentication',
                file: 'controller',
                place: 'login',
                error: error
            });
            return res.status(500).json({ success: false, error: error.message });
        }
    },
    register: async (req, res) => {
        const { email, username, password1 } = req.body;

        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ error: "Email is already registered." });
        const existingUsername = await User.findOne({ username });
        if (existingUsername) return res.status(400).json({ error: "Username is already taken." });

        const verificationToken = generateVerificationCode();

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password1, salt);

        try {
            let tempUser = await TempUser.findOne({ email });

            if (tempUser) {
                tempUser.verificationToken = verificationToken;
                tempUser.username = username;
                tempUser.passwordHash = passwordHash;
                await tempUser.save();
            } else {
                tempUser = new TempUser({
                    email,
                    username,
                    passwordHash,
                    verificationToken,
                });
                await tempUser.save();
            }
            await sendVerifyEmail(email, "Registration", username, verificationToken);

            res.status(200).json({ message: "Verification email sent. Please check your inbox." });
        } catch (error) {
            await logError({
                service: 'Authentication',
                file: 'controller',
                place: 'register',
                error: error
            })
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    verifyEmail: async (req, res) => {
        const { token } = req.body;
        const tempUser = await TempUser.findOne({ verificationToken: token });
        if (!tempUser)  return res.status(400).json({ error: "Invalid or expired token." });

        const user = new User({
            email: tempUser.email,
            username: tempUser.username,
            password: tempUser.passwordHash,
            avatar: "https://res.cloudinary.com/dayly4g5u/image/upload/v1724912561/user-avatars/pofpiiu7fodiqf6kkqxg.jpg"
        });

        try {
            await user.save();
            await TempUser.deleteOne({ _id: tempUser._id });

            res.status(200).json({ message: "Email verified successfully. You can now log in." });
        } catch (error) {
            await logError({
                service: 'Authentication',
                file: 'controller',
                place: 'verifyEmail',
                error: error
            })
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    passwordRecovery: async (req, res) => {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if(!user) return res.send({ error: "Email doesn't exist." });
        const verificationToken = generateVerificationCode();


        let temp = await tempVerify.findOne({ userId: user._id, delUser: false});

        if (temp) {
            temp.verificationToken = verificationToken;
            temp.createdAt = Date.now()
            await temp.save();
        } else {
            temp = new tempVerify({
                userId: user._id,
                verificationToken,
            });
            await temp.save();
        }
        await sendVerifyEmail(email, "Password Recovery", user.username, verificationToken);

        return res.send({ success: true ,message: "Verification code sent successfully." });
    },

    passwordReset: async (req, res) => {
        const { code, password, email } = req.body;
        const user = await User.findOne({ email });
        if(!user) return res.send({ error: "User doesn't exist." });
        let temp = await tempVerify.findOne({ userId: user._id, verificationToken: code});
        if (!temp) {return res.send({ error: "Invalid or expired token." });}

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        user.password = passwordHash
        await user.save()

        return res.send({ success: true ,message: "Password reset successfully." });
    }
}