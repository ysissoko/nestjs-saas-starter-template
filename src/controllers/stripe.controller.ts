import { Body, Controller, Get, Logger, Patch, Post, Req, UseGuards, Param } from '@nestjs/common';
import Stripe from 'stripe'
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { StripeService } from '@services/stripe.service';

@UseGuards(JwtAuthGuard)
@Controller("stripe")
export class StripeController {
    private logger = new Logger(StripeController.name);

    constructor(private readonly stripeService: StripeService) {}

    @Get("plans")
    getPlans(@Req () req: any) {
        this.logger.log("Get Plans");
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        return this.stripeService.getPlans({ limit, active: true });
    }

    @Patch("subscriptions/:subscriptionId")
    cancelSubscription(@Param("subscriptionId") subscriptionId: string, @Body() body: Stripe.SubscriptionUpdateParams) {
        this.logger.log("Update Subscription");
        return this.stripeService.updateSubscription({subscriptionId, ...body});
    }

    @Get("plans/:priceId")
    getPlan(@Param("priceId") priceId: string) {
        this.logger.log("Get Plan");
        return this.stripeService.getPlan(priceId);
    }

    @Post("checkout-session")
    createCheckoutSession(@Body() body: Stripe.Checkout.SessionCreateParams, @Req () req: any) {
        this.logger.log("Create Checkout Session");
        const { id: userId, email: customer_email } = req.user;
        return this.stripeService.createCheckoutSession({ ...body, customer_email, metadata : { userId } });
    }

    @Get("checkout-session/:sessionId")
    getSessionDetails(@Param("sessionId") sessionId: string) {
        this.logger.log("Get Checkout Session Details");
        return this.stripeService.getSessionDetails(sessionId);
    }
}
