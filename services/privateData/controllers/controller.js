const User = require('../schemas/userSchemas');
const tempVerify = require('../schemas/tempVerify');
const Conversation = require('../schemas/messsageSchema');
const jwt = require('jsonwebtoken');

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
        if (!user)  return res.send({ error: "Unknown user" });
        user.timeUpdated = new Date();
        await user.save()
        return res.status(200).json({ success: true, data: {_id: user._id, status: user.status , bio: user.bio , username: user.username, avatar: user.avatar , joined: user.timeCreated, online: user.timeUpdated, email: user.email} });
    },
    logout: async (req, res) => {
        const user = await User.findOne({_id: req.user.userId})
        if (!user)  return res.send({ error: "Unknown user" });

        user.status = "offline"
        await user.save()

        res.clearCookie('token', {
            httpOnly: true,      
            secure: true,
            sameSite: 'None',         
            path: '/',             
        });
    
        res.clearCookie('isLoggedIn', {
            secure: true,        
            sameSite: 'None',         
            path: '/',               
        });

        res.clearCookie('SessionTime', {
            secure: true,        
            sameSite: 'None',         
            path: '/',               
        });
    
        return res.status(200).json({ success: true, message: "logged out" });
    },
    changeAvatar: async (req, res) => {
        try {
            if (!req.file) {
                return res
                    .status(400)
                    .json({ success: false, error: "File not attached" });
            }
    
            const user = await User.findOne({ _id: req.user.userId });
            if (!user) {
                return res
                    .status(404)
                    .json({ success: false, error: "Unknown user" });
            }
    
            // Update user's avatar
            user.avatar = req.file.path; // `req.file.path` contains the Cloudinary URL
            user.timeUpdated = new Date();
            await user.save();
    
            // Update all conversations where the user is the owner with the new avatar
            await Conversation.updateMany(
                { 'owner.id': user._id },  // Condition to match conversations where the user is the owner
                { $set: { 'owner.avatar': user.avatar } }  // Update the owner's avatar
            );
    
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
            });
            return res
                .status(500)
                .json({ success: false, message: "Internal error" });
        }
    },
    
    changeBio: async (req, res) => {
        try {
            const { bio } = req.body;
            const user = await User.findOne({_id: req.user.userId})
            if (!user)  return res.send({ error: "Unknown user" });
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
            const user = await User.findOne({ _id: req.user.userId });
            if (!user) return res.send({ error: "Unknown user" });
    
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.send({ error: "Wrong credentials." });
            }
    
            const existUser = await User.findOne({ username: username });
            if (existUser) return res.send({ error: "Username is taken." });
    
            user.username = username;
            await user.save();
    
            // Find all conversations where the user is the owner and update the owner's username
            await Conversation.updateMany(
                { 'owner.id': user._id },  // Condition to match conversations where the user is the owner
                { $set: { 'owner.username': username } }  // Update the owner's username
            );
    
            return res.status(200).json({ success: true, data: user.username });
        } catch (error) {
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'changeUsername',
                error: error
            });
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
            if (!user)  return res.send({ error: "Unknown user" });
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
            const user = await User.findOne({ _id: req.user.userId });
            if (!user) return res.send({ error: "Unknown user" });
    
            const existCode = await tempVerify.findOne({ verificationToken: code, userId: user._id });
            if (!existCode) return res.send({ error: "Invalid code" });
    
            // Delete private conversations associated with the user
            await Conversation.deleteMany({
                RoomStatus: "private", // Ensure the conversation is private
                participants: { $elemMatch: { id: user._id } } // Check if the user's ID exists in the participants array
            });
    
            // Now delete the user
            await User.deleteOne({ _id: user._id });
            await tempVerify.deleteOne({ userId: user._id });
    
            res.clearCookie('token', {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                path: '/',
            });
    
            res.clearCookie('isLoggedIn', {
                secure: true,
                sameSite: 'None',
                path: '/',
            });

            res.clearCookie('SessionTime', {
                secure: true,        
                sameSite: 'None',         
                path: '/',               
            });
    
            return res.status(200).json({ success: true });
        } catch (error) {
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'verifyDelChange',
                error: error,
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },
    

    getUsers: async (req, res) => {
        try {
            const reqUser = await User.findOne({ _id: req.user.userId });
            if (!reqUser) return res.status(404).json({ error: "Unknown user" });
    
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const skip = (page - 1) * limit;
    
            const users = await User.find({ _id: { $ne: req.user.userId } })
                .skip(skip)
                .limit(limit)
                .exec();
    
            const totalUsers = await User.countDocuments({ _id: { $ne: req.user.userId } });
    
            const totalPages = Math.ceil(totalUsers / limit);
    
            res.json({
                success: true,
                data: {
                    users,
                    totalPages,
                    currentPage: page,
                },
            });
        } catch (error) {
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'getUsers',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
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
    
            const { user, msg } = req.body; 
           
            let conversation = await Conversation.findOne({
                RoomStatus: "private",
                participants: {
                    $all: [
                        { $elemMatch: { id: reqUser._id.toString() } },
                        { $elemMatch: { id: user._id.toString() } }
                    ]
                }
            });
    
            if (!conversation) {
        
                conversation = new Conversation({
                    RoomName: `${user.username}-${reqUser.username}`,
                    RoomStatus: "private",
                    participants: [
                        { id: reqUser._id, username: reqUser.username, avatar: reqUser.avatar },
                        { id: user._id, username: user.username, avatar: user.avatar }
                    ],
                    messages: [{
                        sender: reqUser.username,
                        senderId: reqUser._id,
                        avatar: reqUser.avatar,
                        content: msg,
                        timestamp: Date.now()
                    }]
                });
            } else {
                conversation.messages.push({
                    sender: reqUser.username,
                    senderId: reqUser._id,
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

            const { userId } = req.params;

            let conversation = await Conversation.findOne({
                RoomStatus: "private",
                participants: {
                    $all: [
                        { $elemMatch: { id: reqUser._id.toString() } },
                        { $elemMatch: { id: userId } }
                    ]
                }
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

            if (message.senderId !== reqUser._id.toString()) {
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
            const isMember = conversation.participants.some(participant => participant.id.toString() === reqUser._id.toString());
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
                participants: [{
                    id: reqUser._id.toString(),
                    username: reqUser.username,
                    avatar: reqUser.avatar,
                }],
                owner: {
                    id: reqUser._id.toString(),
                    username: reqUser.username,
                    avatar: reqUser.avatar,
                },
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
            
            const { conID, msg } = req.body;

            const conversation = await Conversation.findById(conID);
            if (!conversation) return res.send({ error: "Conversation not found" });

            
            const isParticipant = conversation.participants.some(participant => participant.id.toString() === reqUser._id.toString());

            if (!isParticipant) {
                conversation.participants.push({
                    id: reqUser._id.toString(),
                    username: reqUser.username,
                    avatar: reqUser.avatar
                });
            }
         
            conversation.messages.push({
                sender: reqUser.username,
                senderId: reqUser._id,
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

            const { conID } = req.body;
            

            const room = await Conversation.findById(conID);
            if (!room) {
                return res.send({ error: 'Room not found' });
            }
            if (room.RoomStatus !== 'public') {
                return res.send({ error: 'You can only delete public rooms' });
            }
            if (room.owner.id.toString() !== reqUser._id.toString()) {
                return res.send({ error: 'You are not authorized to delete this room' });
            }

            await Conversation.findByIdAndDelete(conID);

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

    getUserConversations: async (req, res) => {
        try {
            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.send({ error: "Unknown user" });
    
            const { page = 1, limit = 20 } = req.query;
            const skip = (page - 1) * limit;
    
            // Fetch conversations that include the current user
            const conversations = await Conversation.find({
                participants: { $elemMatch: { id: reqUser._id } } // Updated to match the new schema
            })
            .skip(skip)
            .limit(parseInt(limit))
            .exec();
    
            const totalConversations = await Conversation.countDocuments({
                participants: { $elemMatch: { id: reqUser._id } } // Updated to match the new schema
            });
    
            const totalPages = Math.ceil(totalConversations / limit);
    
            const processedConversations = conversations.map(conversation => {
                // Extract participant details directly from the participants array
                const validParticipants = conversation.participants.map(participant => ({
                    id: participant.id,
                    username: participant.username,
                    avatar: participant.avatar
                }));
    
                // Determine the room name for private conversations
                let roomName = conversation.RoomName;
                if (conversation.RoomStatus === 'private') {
                    const otherParticipant = validParticipants.find(participant => participant.username !== reqUser.username);
                    roomName = `DM's With: ${otherParticipant.username}`;
                }
    
                // Limit display participants to a maximum of 5, with ellipsis for additional participants
                const displayParticipants = validParticipants.length > 5 
                    ? [...validParticipants.slice(0, 4), { username: '...', avatar: '' }] 
                    : validParticipants;
    
                return {
                    ...conversation.toObject(), 
                    participants: displayParticipants, 
                    RoomName: roomName
                };
            });
    
            return res.status(200).json({
                success: true,
                data: {
                    conversations: processedConversations,
                    totalPages
                }
            });
        } catch (error) {
            // Handle the error
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'getConversations',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },

   addFriend: async (req, res) => {
    try {
        const reqUser = await User.findById(req.user.userId);
        if (!reqUser) return res.status(404).send({ error: "Unknown user" });

        const { userIdToAdd } = req.body;
        if (!userIdToAdd) return res.send({ error: "User ID is required" });

        const userToAdd = await User.findById(userIdToAdd);
        if (!userToAdd) return res.send({ error: "User not found" });

        const alreadyFriend = reqUser.friends.some(friend => friend.userId.toString() === userIdToAdd);
        if (alreadyFriend) {
            return res.send({ error: "User is already in your friends list." });
        }

        const otherUserHasSentRequest = userToAdd.friends.some(friend => friend.userId.toString() === reqUser._id.toString());
        let friendStatus;

        if (otherUserHasSentRequest) {
            reqUser.friends.push({
                userId: userIdToAdd,
                status: 'accepted', // If the other user already sent a friend request, accept it.
                timeAdded: Date.now()
            });

            const friendRecord = userToAdd.friends.find(friend => friend.userId.toString() === reqUser._id.toString());
            if (friendRecord) {
                friendRecord.status = 'accepted'; // Update the other user's friend request to accepted
            }
            friendStatus = 'accepted';
        } else {
            reqUser.friends.push({
                userId: userIdToAdd,
                status: 'pending', // If the current user is sending a friend request
                timeAdded: Date.now()
            });
            friendStatus = 'pending';
        }

        await reqUser.save();
        await userToAdd.save();

        return res.status(200).json({ 
            success: true, 
            status: friendStatus // Return the friend status
        });
        } catch (error) {
            // Log the error and return a server error response
            await logError({
                service: 'friendManagement',
                file: 'userController',
                place: 'addFriend',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },


    checkFriend: async (req, res) => {
        try {
            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.status(404).send({ error: "Unknown user" });
    
            const { userId } = req.body;
            if (!userId) return res.status(400).send({ error: "User ID is required" });
    
            const checkUser = await User.findById(userId);
            if (!checkUser) return res.status(404).send({ error: "User not found" });
    
            const friendship = reqUser.friends.find(friend => friend.userId.toString() === userId);
    
            let status;
            if (friendship) {
                status = friendship.status;
            } else {
                status = 'not a friend'; 
            }
    
            return res.status(200).json({ success: true, status });
        } catch (error) {
            // Log the error and return a server error response
            await logError({
                service: 'friendManagement',
                file: 'userController',
                place: 'checkFriend',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },

    
    getFriends: async (req, res) => {
        try {
            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.status(404).send({ error: "Unknown user" });

            const { page = 1, limit = 20 } = req.query;
            const pageNumber = parseInt(page, 10);
            const limitNumber = parseInt(limit, 10);
    
            const friends = [];

            for (const friendship of reqUser.friends) {
                if (friendship.status === 'accepted') {
                    const friendUser = await User.findById(friendship.userId);
                    if (friendUser) {
                        friends.push({
                            username: friendUser.username,
                            avatar: friendUser.avatar
                        });
                    }
                }
            }
    
            const totalFriends = friends.length;
            const totalPages = Math.ceil(totalFriends / limitNumber);
            const startIndex = (pageNumber - 1) * limitNumber;
            const endIndex = startIndex + limitNumber;
            const paginatedFriends = friends.slice(startIndex, endIndex);
    
            return res.status(200).json({
                success: true,
                data: paginatedFriends,
                totalPages: totalPages,
                currentPage: pageNumber,
                totalFriends: totalFriends
            });
        } catch (error) {
            await logError({
                service: 'friendManagement',
                file: 'userController',
                place: 'getFriends',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },

    sendNotification: async (req, res) => {
        try {
            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.status(404).send({ error: "Unknown user" });
    
            const { recipientId, content, type } = req.body;
            if (!recipientId || !content || !type) return res.send({ error: "Recipient ID, content, and type are required" });
    
            const recipient = await User.findById(recipientId);
            if (!recipient) {
                return res.send({ error: "Recipient not found." });
            }

            recipient.notifications.push({
                type: type,
                senderId: reqUser._id,
                content: content,
                timeCreated: Date.now(),
                isRead: false
            });
    
            await recipient.save();
    
            return res.status(200).json({ success: true, message: "Notification sent successfully!" });
        } catch (error) {
            // Log the error and return a server error response
            await logError({
                service: 'notificationManagement',
                file: 'notificationController',
                place: 'sendNotification',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },

    getNotifications: async (req, res) => {
        try {
            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.status(404).json({ error: "User not found" });
    
            const { page = 1, limit = 10, sort = 'desc' } = req.query;
            const skip = (page - 1) * limit;
          
            const notifications = reqUser.notifications
                .sort((a, b) => sort === 'asc' ? a.timeCreated - b.timeCreated : b.timeCreated - a.timeCreated)
                .slice(skip, skip + parseInt(limit));
    
    
            const senderIds = notifications.map(notification => notification.senderId);
    
            const senders = await User.find({ _id: { $in: senderIds } }, 'username avatar');
            const sendersMap = senders.reduce((map, sender) => {
                map[sender._id] = { username: sender.username, avatar: sender.avatar };
                return map;
            }, {});
    
            
            const enrichedNotifications = notifications.map(notification => ({
                ...notification.toObject(),
                senderUsername: sendersMap[notification.senderId]?.username || 'Unknown',
                senderAvatar: sendersMap[notification.senderId]?.avatar || null
            }));
    
            const totalNotifications = reqUser.notifications.length;
    
            return res.status(200).json({
                success: true,
                notifications: enrichedNotifications,
                total: totalNotifications,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalNotifications / limit)
            });
        } catch (error) {
            // Log the error and return a server error response
            await logError({
                service: 'notificationManagement',
                file: 'notificationController',
                place: 'getNotifications',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },
    viewAllNotifications: async (req, res) => {
        try {
            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.status(404).json({ error: "User not found" });
    
            reqUser.notifications.forEach(notification => {
                if (
                    notification.content === 'You have received a new private message.' ||
                    notification.content === 'You have a new friend!'
                ) {
                    notification.isRead = true; // Mark as read
                }
            });
    
            await reqUser.save();
    
            return res.status(200).json({
                success: true,
                message: "Notifications marked as read successfully",
                remainingNotifications: reqUser.notifications.length
            });
        } catch (error) {
            // Log the error and return a server error response
            await logError({
                service: 'notificationManagement',
                file: 'notificationController',
                place: 'viewAllNotifications',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },
    deleteNotification: async (req, res) => {
        try {
            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.status(404).json({ error: "User not found" });
    
            const notificationId = req.body.notificationId;

            const notificationIndex = reqUser.notifications.findIndex(notification => notification._id.toString() === notificationId);
            
            if (notificationIndex === -1) {
                return res.json({ error: "Notification not found" });
            }

            reqUser.notifications.splice(notificationIndex, 1);
    
            await reqUser.save();
    
            return res.status(200).json({
                success: true,
                message: "Notification deleted successfully",
                remainingNotifications: reqUser.notifications.length
            });
        } catch (error) {
            // Log the error and return a server error response
            await logError({
                service: 'notificationManagement',
                file: 'notificationController',
                place: 'deleteNotification',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },

    rejectFriend: async (req, res) => {
        try {
            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.send({ error: "Unknown user" });
    
            const { userIdToReject } = req.body;
            if (!userIdToReject) return res.send({ error: "User ID is required" });
    
            const userToReject = await User.findById(userIdToReject);
            if (!userToReject) return res.send({ error: "User not found" });
    
            const reqUserFriendIndex = reqUser.friends.findIndex(friend => friend.userId.toString() === userIdToReject && friend.status === 'pending');
            if (reqUserFriendIndex !== -1) {
                reqUser.friends.splice(reqUserFriendIndex, 1);
            }
    
            const userToRejectFriendIndex = userToReject.friends.findIndex(friend => friend.userId.toString() === reqUser._id.toString() && friend.status === 'pending');
            if (userToRejectFriendIndex !== -1) {
                userToReject.friends.splice(userToRejectFriendIndex, 1);
            }

            await reqUser.save();
            await userToReject.save();
    
            return res.status(200).json({
                success: true,
                message: "Friend request rejected successfully."
            });
        } catch (error) {
            // Log the error and return a server error response
            await logError({
                service: 'friendManagement',
                file: 'userController',
                place: 'rejectFriend',
                error: error
            });
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    },
    renewSession: async (req, res) => {
        try {
            // Access the user from the request object
            const reqUser = await User.findById(req.user.userId);
            if (!reqUser) return res.status(404).send({ error: "Unknown user" });
           
            // Update user status to online and refresh the timestamp
            await User.findOneAndUpdate(
                { _id: reqUser },
                { $set: { timeUpdated: Date.now(), status: 'online' } }
            );
   
            // Create a new JWT token with the same user ID and username
            const newToken = jwt.sign({ userId: reqUser._id, username: reqUser.username }, process.env.JWT_KEY, {
                expiresIn: '1h', // Set the new expiration time
            });
            const expirationTime = Date.now() +  3600 * 1000; // 1 hour from now
    
            // Set the new HttpOnly cookie with the new token
            res.cookie('token', newToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
            });
    
            // Update or set the cookies for isLoggedIn and SessionTime
            res.cookie('isLoggedIn', true, {
                maxAge: expirationTime,
                path: '/',
                secure: true,
                sameSite: 'None',
            });
    
            res.cookie('SessionTime', expirationTime, {
                maxAge: expirationTime,
                path: '/',
                secure: true,
                sameSite: 'None',
            });
    
            return res.status(200).json({ success: true, message: 'Session renewed successfully' });
        } catch (error) {
            await logError({
                service: 'Authentication',
                file: 'controller',
                place: 'renewSession',
                error: error,
            });
            return res.status(500).json({ success: false, error: error.message });
        }
    },
    changeStatus: async (req, res) => {
        try {
            const { status } = req.body; 
    
          
            const validStatuses = ['online', 'away', 'busy', 'do_not_disturb']; 
            if (!validStatuses.includes(status)) {
                return res.send({ success: false, message: "Invalid status" });
            }

            const user = await User.findOne({ _id: req.user.userId });
            if (!user) return res.send({ error: "Unknown user" });
    
            user.status = status; 
            await user.save(); 
    
            // Return success response
            return res.status(200).json({ success: true, data: user.status });
        } catch (error) {
            // Log the error for debugging
            await logError({
                service: 'privateData',
                file: 'controller',
                place: 'changeStatus',
                error: error
            });
    
            // Return error response
            return res.status(500).json({ success: false, message: "Internal error" });
        }
    }

    
}