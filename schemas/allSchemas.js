module.exports = {
    user: {
        username: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        },
        avatar: {
            type: String,
            default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png"
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        bio: {
            type: String,
            required: false,
        },
        timeCreated: {
            type: Number,
            required: true,
            default: Date.now
        },
        timeUpdated: {
            type: Number,
            required: true,
            default: Date.now
        },
        friends: [{
            userId: {
                type: String,
            },
            status: {
                type: String,
                enum: ['pending', 'accepted', 'declined'],
                default: 'pending'
            },
            timeAdded: {
                type: Date,
                default: Date.now
            }
        }],
        notifications: [{
            type: {
                type: String,
                enum: ['friend_request', 'message', 'mention'],
                required: true
            },
            senderId: {
                type: String,
            },
            content: {
                type: String,
                required: true
            },
            timeCreated: {
                type: Date,
                default: Date.now
            },
            isRead: {
                type: Boolean,
                default: false 
            }
        }]
    },
    tempUser:{
        email: { type: String, required: true },
        username: { type: String, required: true },
        passwordHash: { type: String, required: true },
        verificationToken: { type: String, required: true },
        createdAt: { type: Date, default: Date.now, expires: '5m' }
    },
    errorDb: {
        service: {
            type: String,
            required: true
        },
        file: {
            type: String,
            required: true
        },
        place: {
            type: String,
            required: true
        },
        error: {
            type: String,
            required: true,
        },
        time: {
            type: String,
            required: true,
        }
    },
    tempVerify: {
        userId: {
            type: String,
            required: true
        },
        verificationToken: { type: String, required: true },
        newEmail: { type: String, required: false },
        delUser: { type: Boolean, required: false },
        createdAt: { type: Date, default: Date.now, expires: '5m' }
    },
    conversation: {
        RoomName: {
            type: String,
            required: true,
            unique: true
        },
        RoomStatus: {
            type: String,
            enum: ['private', 'public'],
            default: 'private'
        },
        owner: {
            id: { type: String },
            username: { type: String}, 
            avatar: { type: String } 
        },
        bio:{
          type: String,
        },
        participants: [{
            id: { type: String, required: true }, 
            username: { type: String, required: true }, 
            avatar: { type: String, required: true } 
        }],
        messages: [{
            sender: {
                type: String,
                required: true
            },
            senderId: {
                type: String,
                required: true
            },
            avatar: {
                type: String,
                required: true
            },
            content: {
                type: String,
                required: true
            },
            reactions: {
                likes: {
                    count: {
                        type: Number,
                        default: 0
                    },
                    users: [{ type: String }]
                },
                hearts: {
                    count: {
                        type: Number,
                        default: 0
                    },
                    users: [{ type: String }]
                },
                laughs: {
                    count: {
                        type: Number,
                        default: 0
                    },
                    users: [{ type: String }]
                },
                sads: {
                    count: {
                        type: Number,
                        default: 0
                    },
                    users: [{ type: String }]
                }
            },
            timestamp: {
                type: Date,
                default: Date.now
            }
        }]
    },

}
