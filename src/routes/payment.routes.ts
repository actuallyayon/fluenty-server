import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { env } from '../config/env.js';

export const paymentRoutes = Router();

// POST /api/payments/checkout/stripe - Create Stripe checkout session
paymentRoutes.post('/checkout/stripe', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    const successUrl = `${env.CLIENT_URL}/dashboard?payment=success`;
    const cancelUrl = `${env.CLIENT_URL}/pricing?payment=cancelled`;

    const session = await paymentRepository.createStripeCheckoutSession(
      userId,
      userEmail,
      successUrl,
      cancelUrl
    );

    res.json({ success: true, ...session });
  } catch (error: any) {
    console.error('Error creating Stripe session:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to initialize card checkout' });
  }
});

const localPaymentSchema = z.object({
  method: z.enum(['bkash', 'nagad', 'rocket']),
  accountNumber: z.string().min(11, 'Invalid mobile number').max(14),
  trxId: z.string().min(6, 'Invalid Transaction ID').max(20),
  amount: z.number().default(999),
});

// POST /api/payments/checkout/local - Verify bKash / Nagad / Rocket and upgrade account
paymentRoutes.post('/checkout/local', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { method, accountNumber, trxId, amount } = localPaymentSchema.parse(req.body);

    const result = await paymentRepository.processLocalMfsPayment({
      userId,
      method,
      accountNumber,
      trxId,
      amount,
    });

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation error', details: error.flatten() });
      return;
    }
    console.error('Error in local payment:', error);
    res.status(400).json({ success: false, error: error.message || 'Payment verification failed' });
  }
});

// GET /api/payments/history - User payment history
paymentRoutes.get('/history', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const history = await paymentRepository.getUserPayments(userId);
    res.json({ success: true, history });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve payment history' });
  }
});

// POST /api/payments/webhook - Stripe Webhook handler
paymentRoutes.post('/webhook', async (req: any, res: Response) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    res.status(400).send('Missing stripe-signature header');
    return;
  }

  try {
    // req.rawBody or req.body depending on express.raw middleware
    const rawBody = req.rawBody || req.body;
    await paymentRepository.handleStripeWebhookEvent(rawBody, sig as string);
    res.json({ received: true });
  } catch (err: any) {
    console.error('Stripe webhook error:', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
