module.exports = {
    user: {
        username: {
            type: String,
            required: true
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
        },
        timeCreated: {
            type: Number,
            required: true,
            default: Date.now()
        },
        timeUpdated: {
            type: Number,
            required: true,
            default: Date.now()
        },
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
    }
}
