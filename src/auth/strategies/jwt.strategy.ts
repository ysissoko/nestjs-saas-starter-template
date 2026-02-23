import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Services } from '@common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private logger = new Logger(JwtStrategy.name);
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([(req) => {
                return req.cookies?.authToken;
            }]),
            ignoreExpiration: false,
            secretOrKey: configService.get(`${Services.App}.auth.jwt.secret`),
        });
    }

    async validate({ sub, email }: any) {
        return { id: sub, email };
    }
}
