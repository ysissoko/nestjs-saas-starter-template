import Stripe from "stripe";

export interface UpdateSubscriptionDTO extends Stripe.SubscriptionUpdateParams {
    subscriptionId: string;
}
