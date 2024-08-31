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
        return res.status(200).json({ success: true, data: {_id: user._id, bio: user.bio , username: user.username, avatar: user.avatar , joined: user.timeCreated, online: user.timeUpdated, email: user.email} });
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
            const limit = parseInt(req.query.limit) || 12;
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

    getPrivateCon: async (req, res) => {
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
    },

    addReactionMsg: async (req, res) => {
        try {
            const reactionMap = {
                '👍': 'likes',
                '❤️': 'hearts',
                '😂': 'laughs',
                '😢': 'sads',
            };

            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.status(404).send({ error: "Unknown user" });

            const { conID, messageId, reaction: emoji } = req.body;

            const reaction = reactionMap[emoji];
            if (!reaction) {
                return res.status(400).send({ error: "Invalid reaction emoji" });
            }

            const conversation = await Conversation.findOne({
                _id: conID,
                messages: { $elemMatch: { _id: messageId } }
            });

            if (!conversation) {
                return res.status(404).send('Conversation or message not found');
            }

            const message = conversation.messages.find(msg => msg._id.toString() === messageId);

            if (!message.reactions[reaction]) {
                return res.status(400).send({ error: "Invalid reaction type" });
            }

            // Check if the user has already reacted
            if (!message.reactions[reaction].users.includes(reqUser._id)) {
                message.reactions[reaction].count += 1;
                message.reactions[reaction].users.push(reqUser._id);
            } else {
                message.reactions[reaction].count -= 1;
                message.reactions[reaction].users = message.reactions[reaction].users.filter(userId => userId.toString() !== reqUser._id.toString());

                if (message.reactions[reaction].count < 0) {
                    message.reactions[reaction].count = 0;
                }
            }

            await conversation.save();

            return res.status(200).json({ success: true, data: message });
        } catch (error) {
            // Log the error and return a server error response
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'addReactionMsg',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },

    deleteMessage: async (req, res) => {
        try {
            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.status(404).send({ error: "Unknown user" });

            const { conID, messageId } = req.body;

            const conversation = await Conversation.findOne({
                _id: conID,
                messages: { $elemMatch: { _id: messageId } }
            });

            if (!conversation) {
                return res.status(404).send({ error: 'Conversation or message not found' });
            }

            const messageIndex = conversation.messages.findIndex(msg => msg._id.toString() === messageId);
            if (messageIndex === -1) {
                return res.status(404).send({ error: 'Message not found' });
            }
            const message = conversation.messages[messageIndex];


            if (message.sender !== reqUser.username) {
                return res.send({ error: 'You are not authorized to delete this message' });
            }
            conversation.messages.splice(messageIndex, 1);

            await conversation.save();

            return res.status(200).json({ success: true, message: 'Message deleted successfully' });
        } catch (error) {
            // Log the error and return a server error response
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'deleteMessage',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },

    deleteConversation: async (req, res) => {
        try {
            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.status(404).send({ error: "Unknown user" });
            const { conID } = req.body;

            const conversation = await Conversation.findById(conID);

            if (!conversation) {
                return res.send({ error: 'Conversation not found' });
            }
            if (conversation.RoomStatus !== 'private') {
                return res.send({ error: 'You can only delete private conversations' });
            }
            const isMember = conversation.participants.some(participantId => participantId.toString() === reqUser._id.toString());
            if (!isMember) {

                return res.send({ error: 'You are not authorized to delete this conversation' });
            }
            await Conversation.findByIdAndDelete(conID);

            return res.status(200).json({ success: true, message: 'Conversation deleted successfully' });
        } catch (error) {
            // Log the error and return a server error response
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'deleteConversation',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },

    getPublicConversations: async (req, res) => {
        try {
            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.status(404).send({ error: "Unknown user" });



            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;

            const publicConversations = await Conversation.find({ RoomStatus: 'public' })
                .skip(skip)
                .limit(limit);

            const totalConversations = await Conversation.countDocuments({ RoomStatus: 'public' });
            const totalPages = Math.ceil(totalConversations / limit);

            if (!publicConversations.length) {
                return res.send({ success: false, message: 'No public conversations found.' });
            }

            return res.status(200).json({
                success: true,
                data: publicConversations,
                totalPages,
                currentPage: page,
            });
        } catch (error) {
            // Log the error and return a server error response
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'getPublicConversations',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },

    createPublicRoom: async (req, res) => {
        try {
            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.status(404).send({ error: "Unknown user" });

            const { roomName, bio } = req.body;

            console.log(roomName,bio)

            const existingRoom = await Conversation.findOne({
                RoomName: roomName,
                RoomStatus: 'public'
            });
            if (existingRoom) {
                return res.send({ error: "A public room with this name already exists." });
            }

            const newRoom = new Conversation({
                RoomName: roomName,
                RoomStatus: 'public',
                participants: [reqUser._id],
                owner: reqUser._id.toString(),
                bio: bio,
                messages: []
            });

            await newRoom.save();

            return res.status(201).json({ success: true, message: 'Public room created' });
        } catch (error) {
            // Log the error and return a server error response
            await logError({
                service: 'publicData',
                file: 'controller',
                place: 'createPublicRoom',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },

    getSingleRoom: async (req, res) => {
        try {
            const reqUser = await User.findOne({_id: req.user.userId})
            if (!reqUser)  return res.send({ error: "Unknown user" });
            const { roomId } = req.params;

            const existingRoom = await Conversation.findOne({
                _id: roomId
            });
            if (!existingRoom) {
                return res.send({ error: "Could not find such room." });
            }
            if (!existingRoom.participants.includes(reqUser._id)) {
                existingRoom.participants.push(reqUser._id);
                await existingRoom.save();
            }

            return res.status(200).json({ success: true, data: existingRoom  });
        } catch (error) {
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'getSingleRoom',
                error: error
            })
            return res
                .status(500)
                .json({ success: false, message: "Internal error" });
        }
    },

    sendPublicMsg: async (req, res) => {
        try {
            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.send({ error: "Unknown user" });

            const { roomId, msg } = req.body;
            console.log(roomId, msg)

            const conversation = await Conversation.findById(roomId);
            if (!conversation) return res.send({ error: "Conversation not found" });

            if (!conversation.participants.includes(reqUser._id)) {
                return res.send({ error: "You are not a participant in this conversation" });
            }

            conversation.messages.push({
                sender: reqUser.username,
                avatar: reqUser.avatar,
                content: msg,
                timestamp: Date.now()
            });

            await conversation.save();

            return res.status(200).json({ success: true, data: conversation });
        } catch (error) {
            // Log the error and return a server error response
            await logError({
                service: 'publicData',
                file: 'controller',
                place: 'sendPublicMsg',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },

    deleteRoom: async (req, res) => {
        try {

            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.status(404).send({ error: "Unknown user" });

            const { roomId } = req.body;

            const room = await Conversation.findById(roomId);
            if (!room) {
                return res.send({ error: 'Room not found' });
            }
            if (room.RoomStatus !== 'public') {
                return res.send({ error: 'You can only delete public rooms' });
            }
            if (room.owner.toString() !== reqUser._id.toString()) {
                return res.send({ error: 'You are not authorized to delete this room' });
            }

            await Conversation.findByIdAndDelete(roomId);

            return res.status(200).json({ success: true, message: 'Room deleted successfully' });
        } catch (error) {
            // Log the error and return a server error response
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'deleteRoom',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },

}