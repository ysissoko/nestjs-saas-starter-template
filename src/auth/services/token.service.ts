import { Services } from '@common';
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Account } from "../modules/account/account.entity";

@Injectable()
export class TokenService {
    private readonly logger = new Logger(TokenService.name);

    constructor(private readonly jwtService: JwtService, private readonly configService: ConfigService) {
    }

    decodeToken(token: string, secret: string) {
        return this.jwtService.verify(token, { secret });
    }

    decodeEmailVerificationToken(token: string) {
        const secret = this.configService.get<string>(`${Services.App}.auth.verificationEmail.token.secret`);
        return this.decodeToken(token, secret);
    }

    decodeResetPasswordToken(token: string) {
        const secret = this.configService.get<string>(`${Services.App}.auth.resetPasswordEmail.token.secret`);
        return this.decodeToken(token, secret);
    }

    private generateToken(payload: any, secret: string, expiresIn: string) {
        return this.jwtService.sign(payload, { secret, expiresIn } as any);
    }

    generateResetPasswordToken(email: string) {
        const secret = this.configService.get<string>(`${Services.App}.auth.resetPasswordEmail.token.secret`);
        const expiresIn = this.configService.get<string>(`${Services.App}.auth.resetPasswordEmail.token.expiresIn`);
        return this.generateToken({ email }, secret, expiresIn);
    }

    generateVerifyEmailToken(email: string) {
        const secret = this.configService.get<string>(`${Services.App}.auth.verificationEmail.token.secret`);
        const expiresIn = this.configService.get<string>(`${Services.App}.auth.verificationEmail.token.expiresIn`);
        return this.generateToken({ email }, secret, expiresIn);
    }

    async resetPasswordToken(account: Account): Promise<void> {
        try {
            // For security, invalidate tokens if sending failed
            account.resetPasswordToken = null;
            account.otp = null;
            await account.save();
            this.logger.debug(`Reset tokens invalidated for account ${account.email}`);
        } catch (error) {
            this.logger.error(`Failed to invalidate tokens for account ${account.email}`, error);
            throw error;
        }
    }

    async resetEmailVerificationToken(account: Account): Promise<void> {
        try {
            // For security, invalidate tokens if sending failed
            account.emailVerificationToken = null;
            account.otp = null;
            await account.save();
            this.logger.debug(`Reset tokens invalidated for account ${account.email}`);
        } catch (error) {
            this.logger.error(`Failed to invalidate tokens for account ${account.email}`, error);
            throw error;
        }
    }
}
