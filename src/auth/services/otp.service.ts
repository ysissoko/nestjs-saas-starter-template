import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Otp } from "../entities/otp.entity";
import { Repository } from "typeorm";
import { addMilliseconds } from "date-fns";
import ms from "ms";
import { Services } from '@common';

@Injectable()
export class OtpService {
    constructor(private readonly configService: ConfigService, 
                @InjectRepository(Otp) private readonly otpRepository: Repository<Otp>) {

    }

    generateOtpCode() {
        return Otp.create({
            code: Math.floor(1000 + Math.random() * 9000).toString(),
            expiry: addMilliseconds(new Date(), ms(this.configService.get<ms.StringValue>(`${Services.App}.auth.otp.expiry`)))
        });
    }
}
