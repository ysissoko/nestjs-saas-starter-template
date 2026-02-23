import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { Logger } from '@nestjs/common/services/logger.service';
import { UpdateSubscriptionDTO } from '@common/dto/stripe/update-subscription.dto';
import { ConfigService } from '@nestjs/config';
import { Services } from '@common/enums/services.enum';

@Injectable()
export class StripeService {
  private logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>(`${Services.App}.stripe.apiKey`);
    const apiVersion: any = this.configService.get(`${Services.App}.stripe.apiVersion`);
    this.stripe = new Stripe(apiKey, {
      apiVersion,
    });
  }

  async getPlans(dto: Stripe.PriceListParams): Promise<any[]> {
    const prices = await this.stripe.prices.list(dto);
    const plans: any[] = await Promise.all(prices.data.map(async (price: Stripe.Price) => {
      return await this.getProductByPrice(price);
    }));
    return plans;
  }

  async getPlan(priceId: string): Promise<Stripe.Price> {
    const price = await this.stripe.prices.retrieve(priceId);
    return this.getProductByPrice(price);
  }

  async getProductByPrice(price: Stripe.Price) {
    const product = await this.stripe.products.retrieve(price.product as string);
    return { ...price, features: product.marketing_features, name: product.name };
  }

  async createCheckoutSession(dto: Stripe.Checkout.SessionCreateParams): Promise<Stripe.Checkout.Session> {
    const session = await this.stripe.checkout.sessions.create(dto);
    return session;
  }

  async getSessionDetails(sessionId: string): Promise<Stripe.Checkout.Session> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    return session;
  }

  async getCustomerActiveSubscription(customerId: string): Promise<Stripe.Subscription | null> {
    const subscriptions = await this.stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });
    this.logger.log(`Active subscriptions for customer: ${customerId}`, subscriptions.data);

    return subscriptions.data.length > 0 ? subscriptions.data[0] : null;
  }

  async updateSubscription({subscriptionId, ...params}: UpdateSubscriptionDTO): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.update(subscriptionId, params);
    return subscription;
  }
}
