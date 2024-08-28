module.exports = {
    protected: async (req, res) => {
        return res.status(200).json({ success: true, message: req.user.username });

    },
}