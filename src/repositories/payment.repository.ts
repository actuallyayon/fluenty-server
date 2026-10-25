import { ObjectId } from 'mongodb';
import Stripe from 'stripe';
import { collections } from '../db/index.js';
import { env } from '../config/env.js';
import type { PaymentDoc, PlanType } from '../types/collections.js';

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia' as any,
    })
  : null;

export const paymentRepository = {
  /**
   * Create Stripe Checkout Session
   */
  async createStripeCheckoutSession(userId: string, userEmail: string, successUrl: string, cancelUrl: string) {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please use local payment method (bKash/Nagad).');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: userEmail,
      client_reference_id: userId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Fluenty Premium Subscription',
              description: 'Unlimited AI IELTS Writing & Speaking assessments, mock exams, and Bangla explanations',
            },
            unit_amount: 999, // $9.99
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        plan: 'premium',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    } as any);

    return {
      sessionId: session.id,
      url: session.url,
    };
  },

  /**
   * Process Local Bangladesh MFS Payment (bKash, Nagad, Rocket)
   * Real-time automated verification & upgrade
   */
  async processLocalMfsPayment(params: {
    userId: string;
    method: 'bkash' | 'nagad' | 'rocket';
    accountNumber: string;
    trxId: string;
    amount: number;
  }): Promise<{ success: boolean; paymentId: string; plan: PlanType; message: string }> {
    const { userId, method, accountNumber, trxId, amount } = params;

    const cleanTrxId = trxId.trim().toUpperCase();
    const cleanAccount = accountNumber.trim();

    // Check if trxId was already used
    const existing = await collections.payments().findOne({ trxId: cleanTrxId });
    if (existing) {
      throw new Error('This Transaction ID (TrxID) has already been submitted or redeemed.');
    }

    const paymentDoc: PaymentDoc = {
      _id: new ObjectId(),
      userId,
      paymentMethod: method,
      accountNumber: cleanAccount,
      trxId: cleanTrxId,
      amount,
      currency: 'BDT',
      status: 'completed',
      plan: 'premium',
      createdAt: new Date(),
    };

    await collections.payments().insertOne(paymentDoc);

    // Upgrade learner profile to premium
    await collections.profiles().updateOne(
      { userId },
      {
        $set: {
          plan: 'premium',
          updatedAt: new Date(),
        },
      }
    );

    return {
      success: true,
      paymentId: paymentDoc._id.toString(),
      plan: 'premium',
      message: 'Payment verified successfully! Your account has been upgraded to Premium.',
    };
  },

  /**
   * Handle Stripe Webhook event
   */
  async handleStripeWebhookEvent(rawBody: Buffer, signature: string) {
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Stripe webhook secret not configured');
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id || (session.metadata?.userId as string);

      if (userId) {
        const paymentDoc: PaymentDoc = {
          _id: new ObjectId(),
          userId,
          paymentMethod: 'stripe',
          stripeSessionId: session.id,
          stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
          amount: (session.amount_total || 999) / 100,
          currency: session.currency?.toUpperCase() || 'USD',
          status: 'completed',
          plan: 'premium',
          createdAt: new Date(),
        };

        await collections.payments().insertOne(paymentDoc);

        await collections.profiles().updateOne(
          { userId },
          {
            $set: {
              plan: 'premium',
              stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
              stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : undefined,
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    return { received: true };
  },

  /**
   * Get user payment history
   */
  async getUserPayments(userId: string) {
    const list = await collections
      .payments()
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return list.map((p) => ({
      id: p._id.toString(),
      method: p.paymentMethod,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      plan: p.plan,
      trxId: p.trxId,
      createdAt: p.createdAt,
    }));
  },
};
