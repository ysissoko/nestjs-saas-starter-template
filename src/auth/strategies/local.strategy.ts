import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    private logger = new Logger(LocalStrategy.name);

    constructor(private authService: AuthService) {
        super({
            usernameField: 'email',
            passwordField: 'password',
        });
    }

    async validate(username: string, password: string): Promise<any> {
        try {
            this.logger.log(`finding user ${username}`);
            const user = await this.authService.validateUser(username, password);
            return user;
        } catch(err) {
            this.logger.error(err);
            throw new UnauthorizedException(err.message);
        }
    }
}
