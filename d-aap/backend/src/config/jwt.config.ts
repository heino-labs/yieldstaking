import { registerAs } from "@nestjs/config";

type JwtConfig = {
    secretKey: string;
    expiresIn: string;
    refreshExpiresIn: string;
};

export default registerAs(
    "jwt",
    (): JwtConfig => {
        const nodeEnv = process.env.NODE_ENV || "development";

        const secretKey = process.env.JWT_SECRET;
        const expiresIn = process.env.JWT_EXPIRES_IN;
        const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN;

        if (nodeEnv !== "development") {
            if (!secretKey) {
                throw new Error(
                    "JWT_SECRET must be defined in non-development environments",
                );
            }
            if (!expiresIn) {
                throw new Error(
                    "JWT_EXPIRES_IN must be defined in non-development environments",
                );
            }
            if (!refreshExpiresIn) {
                throw new Error(
                    "JWT_REFRESH_EXPIRES_IN must be defined in non-development environments",
                );
            }
        }

        return {
            secretKey: secretKey || "dev-insecure-jwt-secret",
            expiresIn: expiresIn || "1h",
            refreshExpiresIn: refreshExpiresIn || "7d",
        };
    },
);
