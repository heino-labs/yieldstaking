import * as crypto from "crypto";

import {
    Injectable,
    Logger,
    UnauthorizedException,
    BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserStatus } from "@prisma/client";
import { compare, hash } from "bcrypt";

import { UserService } from "../modules/user/user.service";
import { PrismaService } from "../prisma/prisma.service";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { AuthenticatedRequest } from "./interface/authenticated-request.interface";
import { UserPrincipal } from "./interface/user-principal.interface";
import { ERR_MESSAGES, SUCCESS_MESSAGES } from "../constants/messages.constant";

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly jwtConfig: {
        secretKey: string;
        expiresIn: string;
        refreshExpiresIn: string;
    };

    constructor(
        private prisma: PrismaService,
        private userService: UserService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) {
        const jwtConfiguration = this.configService.get<{
            secretKey: string;
            expiresIn: string;
            refreshExpiresIn: string;
        }>("jwt");

        if (!jwtConfiguration?.secretKey) {
            throw new Error("JWT configuration is missing secretKey");
        }

        this.jwtConfig = {
            secretKey: jwtConfiguration.secretKey,
            expiresIn: jwtConfiguration.expiresIn,
            refreshExpiresIn: jwtConfiguration.refreshExpiresIn,
        };
    }

    async validateUser(email: string, pass: string): Promise<UserPrincipal> {
        const user = await this.userService.findUserForAuth({ email });
        if (!user || user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException(
                ERR_MESSAGES.AUTH.INVALID_CREDENTIALS,
            );
        }

        if (!user.password) {
            throw new UnauthorizedException(
                ERR_MESSAGES.AUTH.INVALID_CREDENTIALS,
            );
        }

        const isMatched = await compare(pass, user.password);
        if (!isMatched) {
            throw new UnauthorizedException(
                ERR_MESSAGES.AUTH.INVALID_CREDENTIALS,
            );
        }

        const primaryWallet = await this.prisma.userWallet.findFirst({
            where: {
                userId: user.id,
                isPrimary: true,
            },
        });

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            walletAddress: primaryWallet?.walletAddress,
        };
    }

    async login(
        req: AuthenticatedRequest,
    ): Promise<{ access_token: string; refresh_token: string }> {
        const payload = {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            role: req.user.role,
        };

        const accessToken = this.jwtService.sign(payload, {
            expiresIn: this.jwtConfig.expiresIn,
        });

        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: this.jwtConfig.refreshExpiresIn,
        });

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
        };
    }

    async refreshToken(
        refreshToken: string,
    ): Promise<{ access_token: string; refresh_token: string }> {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.jwtConfig.secretKey,
            });

            const user = await this.prisma.user.findFirst({
                where: {
                    id: payload.id,
                    status: UserStatus.ACTIVE,
                    deletedAt: null,
                },
            });

            if (!user) {
                throw new UnauthorizedException(
                    ERR_MESSAGES.AUTH.INVALID_REFRESH_TOKEN,
                );
            }

            const newPayload = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            };

            const accessToken = this.jwtService.sign(newPayload, {
                expiresIn: this.jwtConfig.expiresIn,
            });

            const newRefreshToken = this.jwtService.sign(newPayload, {
                expiresIn: this.jwtConfig.refreshExpiresIn,
            });

            return {
                access_token: accessToken,
                refresh_token: newRefreshToken,
            };
        } catch (error) {
            throw new UnauthorizedException("Invalid refresh token");
        }
    }

    async logout(_userId: number, _refreshToken: string): Promise<void> {
        // Token-based auth - no server-side session to invalidate
        // Client should discard tokens
    }

    async requestPasswordReset(
        email: string,
    ): Promise<{ message: string; token?: string }> {
        try {
            const user = await this.userService.findUserForAuth({ email });
            if (!user) {
                return { message: SUCCESS_MESSAGES.AUTH.PASSWORD_RESET_SENT };
            }

            const resetToken = crypto.randomBytes(32).toString("hex");
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

            await this.prisma.passwordReset.create({
                data: {
                    token: resetToken,
                    userId: user.id,
                    expiresAt,
                },
            });

            this.logger.log(`Password reset requested for user ${user.id}`);

            return {
                message: SUCCESS_MESSAGES.AUTH.PASSWORD_RESET_TOKEN_GENERATED,
                token:
                    process.env.NODE_ENV === "development"
                        ? resetToken
                        : undefined,
            };
        } catch (error) {
            this.logger.error("Error requesting password reset:", error);
            throw error;
        }
    }

    async resetPassword(
        resetData: ResetPasswordDto,
    ): Promise<{ message: string }> {
        try {
            const { token, newPassword } = resetData;

            const passwordReset = await this.prisma.passwordReset.findFirst({
                where: {
                    token,
                    isUsed: false,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
                include: {
                    user: true,
                },
            });

            if (!passwordReset) {
                throw new BadRequestException(
                    ERR_MESSAGES.PASSWORD_RESET.INVALID_TOKEN,
                );
            }

            const hashedPassword = await hash(newPassword, 12);

            await this.prisma.user.update({
                where: { id: passwordReset.userId },
                data: {
                    password: hashedPassword,
                },
            });

            await this.prisma.passwordReset.update({
                where: { id: passwordReset.id },
                data: {
                    isUsed: true,
                    usedAt: new Date(),
                },
            });

            this.logger.log(
                `Password reset completed for user ${passwordReset.userId}`,
            );

            return { message: SUCCESS_MESSAGES.AUTH.PASSWORD_RESET_SUCCESS };
        } catch (error) {
            this.logger.error("Error resetting password:", error);
            throw error;
        }
    }

    async googleLogin(
        user: any,
    ): Promise<{ access_token: string; refresh_token: string; user: any }> {
        try {
            let dbUser = await this.prisma.user.findFirst({
                where: {
                    email: user.email,
                },
                include: {
                    oauthAccounts: {
                        where: {
                            provider: "google",
                        },
                    },
                },
            });

            if (!dbUser) {
                dbUser = await this.prisma.user.create({
                    data: {
                        email: user.email,
                        name: user.name,
                        avatar: user.avatar,
                        authMethod: "OAUTH_GOOGLE",
                        role: "USER",
                        status: "ACTIVE",
                        emailVerified: true,
                        emailVerifiedAt: new Date(),
                        oauthAccounts: {
                            create: {
                                provider: "google",
                                providerId: user.googleId,
                                providerEmail: user.email,
                                providerName: user.name,
                                providerAvatar: user.avatar,
                                accessToken: user.accessToken,
                                refreshToken: user.refreshToken,
                                expiresAt: new Date(Date.now() + 3600 * 1000),
                            },
                        },
                    },
                    include: {
                        oauthAccounts: true,
                    },
                });
            } else {
                const oauthAccount = dbUser.oauthAccounts[0];
                if (oauthAccount) {
                    await this.prisma.oAuthAccount.update({
                        where: { id: oauthAccount.id },
                        data: {
                            accessToken: user.accessToken,
                            refreshToken: user.refreshToken,
                            expiresAt: new Date(Date.now() + 3600 * 1000),
                            providerAvatar: user.avatar,
                        },
                    });
                } else {
                    await this.prisma.oAuthAccount.create({
                        data: {
                            userId: dbUser.id,
                            provider: "google",
                            providerId: user.googleId,
                            providerEmail: user.email,
                            providerName: user.name,
                            providerAvatar: user.avatar,
                            accessToken: user.accessToken,
                            refreshToken: user.refreshToken,
                            expiresAt: new Date(Date.now() + 3600 * 1000),
                        },
                    });
                }

                if (dbUser.authMethod === "EMAIL_PASSWORD") {
                    await this.prisma.user.update({
                        where: { id: dbUser.id },
                        data: {
                            authMethod: "BOTH",
                        },
                    });
                }
            }

            const payload = {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.name,
                role: dbUser.role,
            };

            const accessToken = this.jwtService.sign(payload, {
                expiresIn: this.jwtConfig.expiresIn,
            });

            const refreshToken = this.jwtService.sign(payload, {
                expiresIn: this.jwtConfig.refreshExpiresIn,
            });

            return {
                access_token: accessToken,
                refresh_token: refreshToken,
                user: {
                    id: dbUser.id,
                    email: dbUser.email,
                    name: dbUser.name,
                    role: dbUser.role,
                    avatar: dbUser.avatar,
                },
            };
        } catch (error) {
            this.logger.error("Error in Google login:", error);
            throw error;
        }
    }

    async cleanupExpiredTokens(): Promise<void> {
        try {
            await this.prisma.passwordReset.deleteMany({
                where: {
                    expiresAt: {
                        lt: new Date(),
                    },
                },
            });

            this.logger.log("Expired tokens cleaned up");
        } catch (error) {
            this.logger.error("Error cleaning up expired tokens:", error);
        }
    }
}
