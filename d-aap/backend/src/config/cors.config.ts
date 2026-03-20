import { registerAs } from "@nestjs/config";

export default registerAs("cors", () => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";

    return {
        origin: 'https://yieldstaking.vercel.app',
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-Request-ID",
            "X-Request-Id",
        ],
        exposedHeaders: ["X-Total-Count", "X-Page", "X-Per-Page"],
    };
});
