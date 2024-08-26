const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");

const app = express();

const PORT = 3001;
/// DEV
const HOST = "localhost";
/// PROD
// const HOST = "URL";

app.use(cors());

const proxy = (port, url) => {
    return createProxyMiddleware({
        target: `http://${HOST}:${port}`,
        changeOrigin: true,
        pathRewrite: {
            [`^/${url}`]: "/", // Ensure pathRewrite is correctly applied
        },
        proxyTimeout: 5000, // Set a reasonable timeout (adjust as needed)
        onProxyReq: (proxyReq, req, res) => {
            console.log(`Proxying request to: http://${HOST}:${port}${req.url}`);
        },
        onProxyRes: (proxyRes, req, res) => {
            console.log(`Received response from target: ${proxyRes.statusCode}`);
        },
        onError: (err, req, res) => {
            console.error(`Proxy error: ${err.message}`);
            res.writeHead(504, { "Content-Type": "text/plain" });
            res.end("Proxy Error: Could not reach the target server.");
        },
    });
};

app.use("/auth", proxy(1000, "auth"));

app.listen(PORT, HOST, () => {
    console.log(`Proxy Started at: ${HOST}:${PORT}`);
});
