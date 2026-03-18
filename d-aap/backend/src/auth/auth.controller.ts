import {
    Body,
    Controller,
    Get,
    Post,
    Req,
    Request,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Response } from "express";

import { AuthService } from "./auth.service";
import {
    EmailRegisterDto,
    MetaMaskNonceDto,
    MetaMaskSignInDto,
    RefreshTokenDto,
    RequestPasswordResetDto,
} from "./dto/auth.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { GoogleAuthGuard } from "./guard/google-auth.guard";
import { JwtAuthGuard } from "./guard/jwt-auth.guard";
import { LocalAuthGuard } from "./guard/local-auth.guard";
import { AuthenticatedRequest } from "./interface/authenticated-request.interface";
import { MetaMaskAuthService } from "./metamask-auth.service";
import { SUCCESS_MESSAGES } from "../constants/messages.constant";

@Controller("auth")
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly metaMaskAuthService: MetaMaskAuthService,
    ) {}

    @Post("metamask/nonce")
    async getMetaMaskNonce(@Body() nonceDto: MetaMaskNonceDto) {
        const nonce = await this.metaMaskAuthService.generateNonce(
            nonceDto.walletAddress,
        );
        return { nonce };
    }

    @Post("metamask/signin")
    async metaMaskSignIn(@Body() signInDto: MetaMaskSignInDto) {
        return this.metaMaskAuthService.verifySignature({
            walletAddress: signInDto.walletAddress,
            signature: signInDto.signature,
            message: signInDto.message,
        });
    }

    @Post("email/register")
    async emailRegister(@Body() registerDto: EmailRegisterDto) {
        return {
            message: SUCCESS_MESSAGES.AUTH.ACCOUNT_CREATED,
            viewOnly: true,
        };
    }

    @UseGuards(LocalAuthGuard)
    @Post("login")
    async login(@Request() req: AuthenticatedRequest) {
        return this.authService.login(req);
    }

    @Post("refresh")
    async refresh(@Body() refreshDto: RefreshTokenDto) {
        return this.authService.refreshToken(refreshDto.refreshToken);
    }

    @Post("request-password-reset")
    async requestPasswordReset(@Body() requestDto: RequestPasswordResetDto) {
        return this.authService.requestPasswordReset(requestDto.email);
    }

    @Post("reset-password")
    async resetPassword(@Body() resetDto: ResetPasswordDto) {
        return this.authService.resetPassword(resetDto);
    }

    @UseGuards(JwtAuthGuard)
    @Post("logout")
    async logout(
        @Request() req: AuthenticatedRequest,
        @Body() refreshDto: RefreshTokenDto,
    ) {
        await this.authService.logout(req.user.id, refreshDto.refreshToken);
        return { message: SUCCESS_MESSAGES.AUTH.LOGGED_OUT };
    }

    @UseGuards(JwtAuthGuard)
    @Get("profile")
    getProfile(@Request() req: AuthenticatedRequest) {
        return req.user;
    }

    @Get("google")
    @UseGuards(GoogleAuthGuard)
    async googleAuth() {}

    @Get("google/callback")
    @UseGuards(GoogleAuthGuard)
    async googleAuthCallback(@Req() req: any, @Res() res: Response) {
        try {
            const result = await this.authService.googleLogin(req.user);
            const frontendUrl =
                process.env.FRONTEND_URL || "http://localhost:3001";
            const redirectUrl = `${frontendUrl}/auth/callback?access_token=${result.access_token}&refresh_token=${result.refresh_token}`;
            res.redirect(redirectUrl);
        } catch (error) {
            const frontendUrl =
                process.env.FRONTEND_URL || "http://localhost:3001";
            res.redirect(
                `${frontendUrl}/auth/error?message=${encodeURIComponent("Google authentication failed")}`,
            );
        }
    }
}
