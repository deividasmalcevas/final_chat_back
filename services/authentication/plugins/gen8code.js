const crypto = require('crypto');

/**
 * Generates a secure 8-character alphanumeric verification code.
 * @returns {string} - The generated verification code.
 */
const generateVerificationCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;

    // Generate 8 random characters
    for (let i = 0; i < 8; i++) {
        // Generate a single random byte
        const randomByte = crypto.randomBytes(1); // 1 byte = 8 bits
        const randomIndex = randomByte[0] % charactersLength; // Map to characters length
        result += characters[randomIndex];
    }

    return result;
};

// Export the function
module.exports = generateVerificationCode;