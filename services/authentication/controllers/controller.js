const User = require('../schemas/userSchemas');
const TempUser = require('../schemas/tempSchema');
const logError = require('../plugins/errSaver')
const bcrypt = require('bcrypt');
const {sendVerifyEmail} = require("../plugins/sendEmail");
const generateVerificationCode = require('../plugins/gen8code');
const jwt = require('jsonwebtoken');

module.exports = {
    login: async (req,res) => {
        const { identifier, password } = req.body;

        try {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            let user;

            if (emailRegex.test(identifier)) user = await User.findOne({ email: identifier });
            else user = await User.findOne({ username: identifier });

            if (!user) return res.status(400).json({ error: "User not found." });

            // Check if the password is correct
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(400).json({ error: "Invalid password." });

            await User.findOneAndUpdate(
                {_id: user._id},
                { $set: { timeUpdated: Date.now() } }
            )
            const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_KEY);

            return res.status(200).json({ success: true, token, data: {
                    username: user.username
                },
                message: 'Login Success' });
        } catch (error) {
            await logError({
                service: 'Authentication',
                file: 'controller',
                place: 'login',
                error: error
            })
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
            password: tempUser.passwordHash
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
    }
}