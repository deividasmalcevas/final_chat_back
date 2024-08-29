const multer = require('multer');
const path = require('path')
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv')
dotenv.config({path: path.resolve(__dirname,'../../../.env')})

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'user-avatars',
        allowedFormats: ['jpg', 'png'],
        transformation: [{ width: 300, height: 300, crop: 'fill' }],
    },
});

const uploadAvatar = multer({
    storage: storage,
    limits: { fileSize: 10000000 } // 10MB limit
}).single('avatar'); // 'avatar' is the field name in the form

module.exports = {
    uploadAvatar,
};
