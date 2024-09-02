module.exports = {
    registerValid: (req, res, next) => {
        const { email, username, password1, password2 } = req.body;

        // Check if all fields are present
        if (!email || !username || !password1 || !password2) {
            return res.send({ error: "All fields are required." });
        }
        const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;
        if (!usernameRegex.test(username)) {
            return res.send({
                error: "Username must be made from letters, numbers, or the underscore character."
            });
        }
        if (username.length < 5 || username.length > 25) {
            return res.send({ error: "Username must be between 5 and 25 characters long." });
        }

        // Check if password is at least 8 characters long, contains at least one uppercase letter and one number
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[?!@#$%^&*_+]).{8,}$/;

        if (!passwordRegex.test(password1)) {
            return res.send({
                error: "Password must be at least 8 characters long, contain at least one uppercase letter, one number, and one special character (!?@#$%^&*_+).",
            });
        }
        

        // Check if password1 and password2 match
        if (password1 !== password2) {
            return res.send({ error: "Passwords do not match." });
        }

        // Check if email contains 'gmail.com'
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email regex
        if (!emailRegex.test(email)) {
            return res.send({ error: "Invalid email format." });
        }
        next();
    },

    registerToken: (req, res, next) => {
        const { token } = req.body;
        if (!token) return res.send({ error: "All fields are required." });
        if(token.length !== 8) return res.send({ error: "Token must be 8 characters long." });
        next();
    },

    loginValid: (req, res, next) => {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.send({ error: "Email/Username and password are required." });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;

        if (!emailRegex.test(identifier) && !usernameRegex.test(identifier)) {
            return res.send({ error: "Invalid email or username format." });
        }

        next();
    },

    emailValid: (req, res, next) => {
        const { email } = req.body;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email regex
        if (!emailRegex.test(email)) {
            return res.send({ error: "Invalid email format." });
        }
        next();
    },
    codeValid: (req, res, next) => {
        const { code } = req.body;
        if (!code || code.length !== 8) {
            return res.send({ error: "Invalid code" });
        }
        next();
    },
    passwordValid: (req, res, next) => {
        const { password } = req.body;
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.send({error: "Password must be at least 8 characters long, contain at least one uppercase letter, and one number.",});
        }
        next();
    }
};
