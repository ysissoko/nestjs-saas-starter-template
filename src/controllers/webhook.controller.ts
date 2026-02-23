import { Services } from '@common';
import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { AccountService } from '@auth/modules/account/account.service';

@Controller('webhook')
export class WebhookController {
  private stripe: Stripe;

  constructor(
    private readonly accountService: AccountService,
    private readonly configService: ConfigService,
  ) {
    const apiVersion = this.configService.get<any>(
      `${Services.App}.stripe.apiVersion`,
    );
    this.stripe = new Stripe(
      this.configService.get<string>(`${Services.App}.stripe.apiKey`),
      {
        apiVersion,
        typescript: true,
      },
    );
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('stripe-signature') sig: string,
  ) {
    const endpointSecret = this.configService.get<string>(
      `${Services.App}.stripe.webhook.secret`,
    );
    console.log('Stripe signature:', sig);
    // Ensure the raw body is available for signature verification
    if (!req.rawBody) {
      console.error('Raw body is not available in the request.');
      return res
        .status(400)
        .send('Raw body is required for webhook signature verification.');
    }
    // Verify the webhook signature
    if (!sig || !endpointSecret) {
      console.error('Stripe signature or endpoint secret is missing.');
      return res
        .status(400)
        .send('Stripe signature or endpoint secret is missing.');
    }
    // Construct the event from the raw body and signature
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody, // Access raw body directly from the request
        sig,
        endpointSecret,
      );
    } catch (err) {
      console.error('Webhook signature verification failed.', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;

        const { customer: customerId, metadata } = session;
        const { userId } = metadata;

        if (userId && customerId) {
          await this.accountService.saveCustomerId(
            Number(userId),
            String(customerId),
          );
          console.log(`Saved customer ${customerId} for user ${userId}`);
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.send({ received: true });
  }
}
