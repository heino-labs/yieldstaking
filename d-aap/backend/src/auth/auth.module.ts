import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GoogleAuthGuard } from "./guard/google-auth.guard";
import { JwtAuthGuard } from "./guard/jwt-auth.guard";
import { LocalAuthGuard } from "./guard/local-auth.guard";
import { RolesGuard } from "./guard/roles.guard";
import { MetaMaskAuthService } from "./metamask-auth.service";
import { GoogleStrategy } from "./strategy/google.strategy";
import { JwtStrategy } from "./strategy/jwt.strategy";
import { LocalStrategy } from "./strategy/local.strategy";
import { UserModule } from "../modules/user/user.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
    imports: [
        UserModule,
        PrismaModule,
        PassportModule.register({ defaultStrategy: "jwt", session: false }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const jwtConfig = configService.get<{
                    secretKey: string;
                    expiresIn: string;
                    refreshExpiresIn: string;
                }>("jwt");
                return {
                    secret: jwtConfig?.secretKey,
                    signOptions: { expiresIn: jwtConfig?.expiresIn },
                } as JwtModuleOptions;
            },
            inject: [ConfigService],
        }),
    ],
    providers: [
        AuthService,
        MetaMaskAuthService,
        LocalStrategy,
        JwtStrategy,
        GoogleStrategy,
        JwtAuthGuard,
        LocalAuthGuard,
        GoogleAuthGuard,
        RolesGuard,
    ],
    exports: [
        AuthService,
        MetaMaskAuthService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
    ],
    controllers: [AuthController],
})
export class AuthModule {}
