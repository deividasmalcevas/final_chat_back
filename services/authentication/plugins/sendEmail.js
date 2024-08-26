const nodemailer = require('nodemailer');

const emailTemplate = (userName, verificationCode) => `
   <div style="padding: 16px; text-align: center; font-family: Arial, sans-serif;">
        <div style="background-color: white; padding: 24px; max-width: 500px; margin: auto;">
            <h1 style="font-size: 24px; font-weight: 600;">Welcome, ${userName}!</h1>
            <p style="font-size: 16px; color: #555;">Thank you for registering with us. Please find your verification code below:</p>
            <div style="padding: 32px; background-color: #f3f4f6; font-size: 40px; font-weight: bold; border-radius: 8px;">${verificationCode}</div>
            <p style="font-size: 16px; color: #555; margin-top: 20px;">Use this code to verify your email and complete your registration.</p>
        </div>
        <div style="color: #9ca3af; font-size: 10px;">Copyright © ${new Date().getFullYear()} - All rights reserved by Chat</div>
    </div>
`;


const sendEmail = {
    sendVerifyEmail: async (email, subject, userName, verificationCode) => {
        try {
            if (!email || !subject || !userName || !verificationCode) {
                throw new Error("Required parameters are missing");
            }

            const transporter = nodemailer.createTransport({
                host: "smtp.office365.com",
                port: 587,
                secure: false,
                auth: {
                    user: process.env.OUTLOOK_EMAIL, // Your Outlook email
                    pass: process.env.OUTLOOK_PASS, // Your Outlook password
                },
                tls: {
                    ciphers: 'SSLv3',
                },
            });

            const mailOptions = {
                from: process.env.OUTLOOK_EMAIL,
                to: email,
                subject: subject,
                html: emailTemplate(userName, verificationCode),
            };

            await transporter.sendMail(mailOptions);

            return { message: "Verification email sent successfully" };
        } catch (error) {
            console.error("Error sending verification email:", error);
            throw new Error("Failed to send email. Please try again.");
        }
    }
};


module.exports = sendEmail;
