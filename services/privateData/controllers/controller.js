const User = require('../schemas/userSchemas');
const tempVerify = require('../schemas/tempVerify');
const Conversation = require('../schemas/messsageSchema');

const logError = require('../../authentication/plugins/errSaver')
const bcrypt = require("bcrypt");
const generateVerificationCode = require("../../authentication/plugins/gen8code");
const {sendVerifyEmail} = require("../../authentication/plugins/sendEmail");
const TempUser = require("../../authentication/schemas/tempSchema");

module.exports = {
    protected: async (req, res) => {
        return res.status(200).json({ success: true, message: req.user.username });
    },
    getUser: async (req, res) => {
        const user = await User.findOne({_id: req.user.userId})
        if (!user)  return res.status(400).json({ error: "Unknown user" });
        user.timeUpdated = new Date();
        await user.save()
        return res.status(200).json({ success: true, data: {bio: user.bio , username: user.username, avatar: user.avatar , joined: user.timeCreated, online: user.timeUpdated, email: user.email} });
    },
    logout: async (req, res) => {
        res.clearCookie('token');
        res.clearCookie('isLoggedIn');
        return res.status(200).json({ success: true, message: "logged out" });
    },
    changeAvatar: async (req, res) => {
        try {
            if (!req.file) {
                return res
                    .status(400)
                    .json({ success: false, error: "File not attached" });
            }

            const user = await User.findOne({_id: req.user.userId})
            if (!user) {
                return res
                    .status(404)
                    .json({ success: false, error: "" });
            }
            user.avatar = req.file.path; // `req.file.path` contains the Cloudinary URL
            user.timeUpdated = new Date();
            await user.save();
            return res.status(200).json({
                success: true,
                message: "Avatar changed successfully.",
                avatarUrl: user.avatar,
            });
        } catch (error) {
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'changeAvatar',
                error: error
            })
            return res
                .status(500)
                .json({ success: false, message: "Internal error" });
        }
    },
    changeBio: async (req, res) => {
        try {
            const { bio } = req.body;
            const user = await User.findOne({_id: req.user.userId})
            if (!user)  return res.status(400).json({ error: "Unknown user" });
            user.bio = bio;
            await user.save()
            return res.status(200).json({ success: true, data: user.bio });
        } catch (error) {
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'changeBio',
                error: error
            })
            return res
                .status(500)
                .json({ success: false, message: "Internal error" });
        }
    },
    changeUsername: async (req, res) => {
        try {
            const { username, password } = req.body;
            const user = await User.findOne({_id: req.user.userId})
            if (!user)  return res.status(400).json({ error: "Unknown user" });
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.send({ error: "Wrong credentials." });
            }
            const existUser = await User.findOne({username: username})
            if (existUser)  return res.send({ error: "Username is taken." });
            user.username = username;
            await user.save()
            return res.status(200).json({ success: true, data: user.username });
        } catch (error) {
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'changeUsername',
                error: error
            })
            return res
                .status(500)
                .json({ success: false, message: "Internal error" });
        }
    },
    changeEmail: async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await User.findOne({_id: req.user.userId})
            if (!user)  return res.send({ error: "Unknown user" });
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.send({ error: "Wrong credentials." });
            }
            const existUser = await User.findOne({email: email})
            if (existUser)  return res.send({ error: "Email is taken." });
            const verificationToken = generateVerificationCode();

            let temp = await tempVerify.findOne({ userId: user._id, delUser: false});

            if (temp) {
                temp.newEmail = email;
                temp.verificationToken = verificationToken;
                await temp.save();
            } else {
                temp = new tempVerify({
                    newEmail: email,
                    userId: user._id,
                    verificationToken,
                });
                await temp.save();
            }
            await sendVerifyEmail(email, "Email Change", user.username, verificationToken);

            return res.status(200).json({ success: true, message: "Email code sent successfully." });
        } catch (error) {
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'changeEmail',
                error: error
            })
            return res
                .status(500)
                .json({ success: false, message: "Internal error" });
        }
    },
    verifyEmailChange: async (req, res) => {
        try {
            const { code } = req.body;
            const user = await User.findOne({_id: req.user.userId})
            if (!user)  return res.send({ error: "Unknown user" });
            const existCode = await tempVerify.findOne({verificationToken: code, userId: user._id})
            if (!existCode)  return res.send({ error: "Invalid code" });
            user.email = existCode.newEmail
            await user.save()
            await tempVerify.deleteOne({ userId: user._id });
            return res.status(200).json({ success: true, data: { email: user.email} , message: "Email change successfully" });
        } catch (error) {
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'verifyEmailChange',
                error: error
            })
            return res
                .status(500)
                .json({ success: false, message: "Internal error" });
        }
    },
    changePassword: async (req, res) => {
        try {
            const { newPassword, password} = req.body;
            const user = await User.findOne({_id: req.user.userId})
            if (!user)  return res.status(400).json({ error: "Unknown user" });
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.send({ error: "Wrong credentials." });
            }
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(newPassword, salt);
            user.password = passwordHash;
            await user.save()
            return res.status(200).json({ success: true, data: user.username });
        } catch (error) {
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'changePassword',
                error: error
            })
            return res
                .status(500)
                .json({ success: false, message: "Internal error" });
        }
    },
    deleteUser: async (req, res) => {
        try {
            const { password } = req.body;
            const user = await User.findOne({_id: req.user.userId})
            if (!user)  return res.send({ error: "Unknown user" });
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.send({ error: "Wrong credentials." });
            }
            const verificationToken = generateVerificationCode();
            let temp = await tempVerify.findOne({ userId: user._id, delUser: true });

            if (temp) {
                temp.verificationToken = verificationToken;
                await temp.save();
            } else {
                temp = new tempVerify({
                    delUser: true,
                    userId: user._id,
                    verificationToken,
                });
                await temp.save();
            }
            await sendVerifyEmail(user.email, "Delete User", user.username, verificationToken);

            return res.status(200).json({ success: true, message: "Email code sent successfully." });
        } catch (error) {
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'deleteUser',
                error: error
            })
            return res
                .status(500)
                .json({ success: false, message: "Internal error" });
        }
    },
    verifyDelChange: async (req, res) => {
        try {
            const { code } = req.body;
            const user = await User.findOne({_id: req.user.userId})
            if (!user)  return res.send({ error: "Unknown user" });
            const existCode = await tempVerify.findOne({verificationToken: code, userId: user._id})
            if (!existCode)  return res.send({ error: "Invalid code" });

            await User.deleteOne({ _id: user._id });
            await tempVerify.deleteOne({ userId: user._id });
            res.clearCookie('token');
            res.clearCookie('isLoggedIn');
            return res.status(200).json({ success: true });
        } catch (error) {
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'verifyEmailChange',
                error: error
            })
            return res
                .status(500)
                .json({ success: false, message: "Internal error" });
        }
    },

    getUsers: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;

            const users = await User.find()
                .skip(skip)
                .limit(limit)
                .exec();

            const totalUsers = await User.countDocuments();

            const totalPages = Math.ceil(totalUsers / limit);

            res.json({success: true, data: {
                    users, totalPages, currentPage: page,},
            });
        } catch (error) {
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'getUsers',
                error: error
            })
            return res
                .status(500)
                .json({ success: false, message: "Internal error" });
        }
    },

    getSingleUser: async (req, res) => {
        try {
            const reqUser = await User.findOne({_id: req.user.userId})
            if (!reqUser)  return res.send({ error: "Unknown user" });
            const { username } = req.params;
            if(username === reqUser.username) {
                return res.send({same: true});
            }

            const user = await User.findOne({username: username})
            if (!user)  return res.send({ error: "Unknown user" });
            return res.status(200).json({ success: true, data: user,  });
        } catch (error) {
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'getSingleUser',
                error: error
            })
            return res
                .status(500)
                .json({ success: false, message: "Internal error" });
        }
    },

    sendPrivateMsg: async (req, res) => {
        try {
            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.status(404).send({ error: "Unknown user" });

            const { username, msg } = req.body;

            const user = await User.findOne({ username: username });
            if (!user) return res.status(404).send({ error: "Unknown user" });

            let conversation = await Conversation.findOne({
                RoomStatus: "private",
                participants: { $all: [reqUser._id, user._id] }
            });

            if (!conversation) {

                conversation = new Conversation({
                    RoomName: `${user.username}-${reqUser.username}`,
                    RoomStatus: "private",
                    participants: [user._id, reqUser._id],
                    messages: [{
                        sender: reqUser.username,
                        avatar: reqUser.avatar,
                        content: msg,
                        timestamp: Date.now()
                    }]
                });
            } else {
                conversation.messages.push({
                    sender: reqUser.username,
                    avatar: reqUser.avatar,
                    content: msg,
                    timestamp: Date.now()
                });
            }

            await conversation.save();
            return res.status(200).json({ success: true, data: conversation });
        } catch (error) {
            // Log the error and return a server error response
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'sendMessage',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },

    getConversation: async (req, res) => {
        try {
            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.status(404).send({ error: "Unknown user" });

            const { username } = req.params;

            const user = await User.findOne({ username: username });
            if (!user) return res.status(404).send({ error: "Unknown user" });

            let conversation = await Conversation.findOne({
                RoomStatus: "private",
                participants: { $all: [reqUser._id, user._id] }
            });
            if (!conversation) return res.send({error: "There is no conversation" });
            return res.status(200).json({ success: true, data: conversation });
        } catch (error) {
            // Log the error and return a server error response
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'getConversation',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    }


}