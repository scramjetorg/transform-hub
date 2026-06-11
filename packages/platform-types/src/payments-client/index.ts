import { IObjectLogger, MaybePromise, ParsedMessage } from "@scramjet/types";

export enum PaymentsSystem {
    Stripe = "stripe",
    Free = "free"
}
export type PaymentsClientOptions = {
    apiKey: string;
    webhookSecret: string;
    system: PaymentsSystem;
    portalConfigurationId: string;
};
export type PaymentsStatus = "active" | "inprogress" | "inactive";

export type PaymentCoupon = {
    id?: string;
    amount_off?: number | null;
    created?: number | null;
    currency?: string | null;
    duration?: "forever" | "once" | "repeating";
    duration_in_months?: number | null;
    max_redemptions?: number | null;
    name?: string | null;
    percent_off?: number | null;
    times_redeemed?: number;
    valid?: boolean;
};

export type PaymentDiscount = {
    id?: string;
    checkout_session?: string | null;
    coupon?: PaymentCoupon;
    customer: string | null;
    end?: number | null;
    invoice: string | null;
    invoice_item: string | null;
    promotion_code: string | null;
    start: number;
    subscription: string | null;
};

export type PaymentsUserId = string;
export type PaymentsUser = {
    id: PaymentsUserId;
    email: string | null;
    discount?: PaymentDiscount | null;
};

export type PaymentsFeature = {
    quantity: number;
};

export type PaymentsFeatures = Record<string, PaymentsFeature>;

export type PaymentsUpdate = {
    id: PaymentsUserId;
    status: PaymentsStatus;
    features: PaymentsFeatures;
};

export type InvoiceId = string;
export type InvoiceStatus = "deleted" | "draft" | "open" | "paid" | "uncollectible" | "void";
export type Invoice = {
    id: InvoiceId;
    amount: number;
    currency: string;
    status: InvoiceStatus;
    dueDate: number | null;
    paymentUrl: string;
    invoiceUrl: string;
};

export type ProductId = string;

export type PriceId = string;
export type Price = {
    id: PriceId;
    active: boolean;
    billing_scheme: "per_unit" | "tiered"; // eslint-disable-line
    created: number;
    currency: string;
    livemode: boolean;
    metadata: Record<string, any>;
    nickname: string | null;
    recurring: {
        aggregate_usage: "sum" | "last_during_period" | "last_ever" | "max" | null; // eslint-disable-line
        interval: "day" | "week" | "month" | "year";
        interval_count: number; // eslint-disable-line
        usage_type: "licensed" | "metered"; // eslint-disable-line
    } | null;
    tax_behavior: "inclusive" | "exclusive" | "unspecified" | null; // eslint-disable-line
    tiers_mode: "graduated" | "volume" | null; // eslint-disable-line
    transform_quantity: { divide_by: number; round: "up" | "down" } | null; // eslint-disable-line
    type: "one_time" | "recurring";
    unit_amount: number | null; // eslint-disable-line
    unit_amount_decimal: string | null; // eslint-disable-line
    product: ProductId;
};

export type Product = {
    id: ProductId;
    active: boolean;
    created: number;
    default_price: PriceId | null;
    prices: Price[];
    description: string | null;
    images: string[];
    livemode: boolean;
    metadata: Record<string, any>;
    name: string;
    updated: number;
    url: string | null;
};

export type SubscriptionId = string;
export type SubscriptionItemId = string;

export type SubscriptionStatus =
    | "active"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "past_due"
    | "paused"
    | "trialing"
    | "unpaid";

export type SubscriptionItem = {
    id: SubscriptionItemId;
    subscription: SubscriptionId;
    metadata: Record<string, any>;
    price: Price;
    quantity?: number;
};

export type SubscriptionInfo = {
    id: SubscriptionId;
    status: SubscriptionStatus;
    billingCycleAnchor: number | null;
    cancelAt: number | null;
    cancelAtPeriodEnd: boolean;
    canceledAt: number | null;
    created: number | null;
    currentPeriodEnd: number | null;
    currentPeriodStart: number;
    daysUntilDue: number | null;
    endedAt: number | null;
    startDate: number | null;
    trialEnd: number | null;
    trialStart: number | null;
    items: SubscriptionItem[];
};
export type Subscription = {
    id: SubscriptionId;
    status: SubscriptionStatus;
    metadata: Record<string, any>;
};

export type PaymentMethodInfo = {
    id: string;
};

export type PaymentSessionId = string;
export type PaymentSessionStatus = "open" | "complete" | "expired";
export type PaymentSessionMode = "payment" | "subscription" | "setup";

export type PaymentSession = {
    id: PaymentSessionId;
    allow_promotion_codes: boolean | null;
    amount_subtotal: number | null;
    amount_total: number | null;
    automatic_tax: {
        enabled: boolean;
    };
    cancel_url: string | null;
    currency: string | null;
    customer: PaymentsUserId | { id: PaymentsUserId } | null;
    customer_creation: string | null;
    customer_details: {
        address: {
            line1: string | null;
        } | null;
        email: string | null;
        name: string | null;
        phone: string | null;
    } | null;
    customer_email: string | null;
    expires_at: number;
    mode: PaymentSessionMode;
    status: PaymentSessionStatus | null;
    subscription: SubscriptionId | Subscription | null;
    success_url: string;
    url: string | null;
};

export type LineItem = {
    price: PriceId;
    quantity?: number;
    metadata?: Record<string, any>;
};
export interface IPaymentsClient {
    initialize: () => MaybePromise<void>;
    getLogger: () => IObjectLogger;
    getSystem: () => PaymentsSystem;
    getWebhookSecret: () => string;
    addPaymentUser: (email: string) => Promise<PaymentsUser>;
    getSubscriptionInfo: (paymentUserId: PaymentsUserId) => Promise<SubscriptionInfo[] | null>;
    createSubscriptionItem(subscriptionId: SubscriptionId, params: Record<string, any>): Promise<SubscriptionInfo>;
    deleteSubscriptionItem(
        subscriptionId: SubscriptionId,
        subscriptionItemId: SubscriptionItemId
    ): Promise<SubscriptionInfo>;
    updateSubscriptionItem(
        subscriptionId: SubscriptionId,
        subscriptionItemId: SubscriptionItemId,
        params: Record<string, any>
    ): Promise<SubscriptionInfo>;
    getPaymentMethodInfo: (paymentUserId: PaymentsUserId) => Promise<PaymentMethodInfo[] | null>;
    getInvoicesByPaymentUserId: (paymentUserId: PaymentsUserId) => Promise<Invoice[]>;
    deleteUser: (paymentUserId: PaymentsUserId) => Promise<{ id: string; deleted: boolean }>;
    getProductsByMetadata: (metadata?: Record<string, any>) => Promise<Product[]>;
    getPaymentSessions(
        paymentsUserId: string,
        status?: PaymentSessionStatus,
        mode?: PaymentSessionMode
    ): Promise<PaymentSession[] | null>;
    handlePaymentsWebhook: (req: ParsedMessage) => Promise<PaymentsUpdate | null>;
    createPaymentSession: (returnUrl: string, paymentsUserId: string, prices: LineItem[]) => Promise<string | null>;
    createPortalSession: (returnUrl: string, paymentsUserId: string) => Promise<string | null>;
    addTrialToPaymentUser: (paymentsUserId: string, nativePriceId: string, shhPriceId: string) => Promise<Subscription>;
    createAddPaymentMethodSession: (returnUrl: string, paymentsUserId: string) => Promise<string | null>;
    expirePaymentSession: (paymentsUserId: string, paymentSessionId: PaymentSessionId) => Promise<boolean>;
    getPaymentUser(paymentUserId: string): Promise<PaymentsUser | null>;
    redeemPromocode(paymentsUserId: string, promocode: string): Promise<PaymentsUser | null>;
}
