const User = require('../schemas/userSchemas');
const TempUser = require('../schemas/tempSchema');
const logError = require('../plugins/errSaver')
const bcrypt = require('bcrypt');
const {sendVerifyEmail} = require("../plugins/sendEmail");
const generateVerificationCode = require('../plugins/gen8code');

module.exports = {
    test: async (req,res) => {
        res.send("Hello World!");
    },

    login: async (req,res) => {
        const { phone, password } = req.body;
        try {
            const user = await User.findOne({ phoneNumber: phone });
            if (!user) {
                return res.status(404).json({ success: false, error: 'Blogi duomenys' });
            }

            const isPasswordMatch = await bcrypt.compare(password, user.password);
            if (!isPasswordMatch) {
                return res.status(401).json({ success: false, error: 'Blogi duomenys' });
            }
            await User.findOneAndUpdate(
                {_id: user._id},
                { $set: { timeUpdated: Date.now() } }
            )
            const token = jwt.sign({ userId: user._id,ownerUsername:user.username, phoneNumber: user.phoneNumber }, process.env.JWT_KEY);

            // Check if feedback entry exists
            const feedback = await Feedback.findOne({reviewee_id: user._id})

            // If feedback entry does not exist
            if (!feedback) {
                const newFeedback = new Feedback({reviewee_id: user._id})
                await newFeedback.save()
            }

            return res.status(200).json({ success: true, token, data: {
                    username: user.username,
                    phone: user.phoneNumber,
                    nameSurname: user.nameSurname,
                    carPlateNumber: user.carPlateNumber,
                    id: user._id,
                    currier: user.currier,
                    avatar: user.avatar,
                    email: user.email,
                    shipmentsSent: user.shipmentsSent,
                    deliveredShipments: user.deliveredShipments,
                    timeUpdated: user.timeUpdated,
                    timeCreated: user.timeCreated
                },
                message: 'Sėkmingai prisijungta' });
        } catch (error) {
            console.error("Įvyko klaida: ", error);
            await logError({
                service: 'Authentication',
                file: 'authController',
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
            return res.status(500).json({ error: "Error saving temporary user data." });
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
            return res.status(500).json({ error: "Error saving user data." });
        }
    }
}