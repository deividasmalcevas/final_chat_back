module.exports = {
    registerValid: (req, res, next) => {
        const { email, username, password1, password2 } = req.body;

        // Check if all fields are present
        if (!email || !username || !password1 || !password2) {
            return res.status(400).json({ error: "All fields are required." });
        }

        // Check if username is at least 5 characters long
        if (username.length < 5) {
            return res.status(400).json({ error: "Username must be at least 5 characters long." });
        }

        // Check if password is at least 8 characters long, contains at least one uppercase letter and one number
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password1)) {
            return res.status(400).json({
                error: "Password must be at least 8 characters long, contain at least one uppercase letter, and one number.",
            });
        }

        // Check if password1 and password2 match
        if (password1 !== password2) {
            return res.status(400).json({ error: "Passwords do not match." });
        }

        // Check if email contains 'gmail.com'
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email regex
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format." });
        }
        next();
    },
    registerToken: (req, res, next) => {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: "All fields are required." });
        if(token.length !== 8) return res.status(400).json({ error: "Token must be 8 characters long." });
        next();
    }
};
