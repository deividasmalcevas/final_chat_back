const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");

dotenv.config({ path: path.resolve(__dirname, '../../../final_chat_back/.env') });

const app = express();
const port = 1000;

app.use(
    cors()
);

app.use(express.json());
const connectToMongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_KEY);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.log("Error connecting to MongoDB: ", error.message);
    }
};

const authRoutes = require("./routes/routes");
app.use("/", authRoutes);

app.listen(port, async () => {
    try {
        await connectToMongoDB();
        console.log(`Server is running at http://localhost:${port}`);
    } catch (error) {
        console.log("Failed to connect to MongoDB:", error.message);
    }
});