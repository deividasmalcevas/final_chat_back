const jwt = require('jsonwebtoken');

module.exports = {
    tokenValid: (req, res, next) => {
        try {
            const token = req.cookies.token; // Extract token from cookies
            if (!token) {
                res.clearCookie('isLoggedIn'); // Clear cookie if token is missing
                return res.status(401).json({ success: false, message: 'Session ended. Please log in again.' });
            }

            jwt.verify(token, process.env.JWT_KEY, (err, decoded) => {
                if (err) {
                    res.clearCookie('token');
                    res.clearCookie('isLoggedIn');
                    return res.status(401).json({ success: false, message: 'Session ended. Please log in again.' });
                }
                req.user = decoded; // Store user info in req.user
                next(); // Proceed to the next middleware or route handler
            });
        } catch (error) {
            res.clearCookie('token');
            res.clearCookie('isLoggedIn');
            return res.status(401).json({ success: false, message: 'Session ended. Please log in again.' });
        }
    },
};
