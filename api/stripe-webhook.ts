import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://qdmspxpwdmirlvfkopix.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkbXNweHB3ZG1pcmx2ZmtvcGl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA4MzgxOCwiZXhwIjoyMDk1NjU5ODE4fQ.UNxLRUGb3Xt21ma0vEqGvzgXNK6tvOO5x0RLtR8GNOk';

// Map Stripe price IDs to plan names
const PRICE_TO_PLAN: Record<string, { plan: string; interval: string }> = {
  'price_1TWELHKC1wvhHSf19wuNKZh5': { plan: 'mensuel', interval: 'month' },
  'price_1TWELIKC1wvhHSf1oHN2YrHu': { plan: 'fondateurs', interval: 'year' },
  'price_1TWELJKC1wvhHSf1hkMdVmlo': { plan: 'annuel', interval: 'year' },
};

async function upsertSubscription(email: string, customerName: string, stripeCustomerId: string, stripeSubscriptionId: string, priceId: string, status: string) {
  const planInfo = PRICE_TO_PLAN[priceId] || { plan: 'unknown', interval: 'unknown' };
  
  // First, find the user by email in Supabase auth
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
    },
  });
  
  let userId = null;
  if (userRes.ok) {
    const data = await userRes.json();
    const user = data.users?.find((u: any) => u.email === email);
    if (user) userId = user.id;
  }

  // Calculate period end based on plan
  const now = new Date();
  const periodEnd = new Date(now);
  if (planInfo.interval === 'month') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  // Upsert subscription in Supabase
  const subData = {
    user_id: userId,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    plan: planInfo.plan,
    status: status,
    current_period_end: periodEnd.toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Try update first, then insert
  if (userId) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(subData),
    });

    if (res.status === 404 || res.status === 204) {
      // If no row updated, insert
      await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ ...subData, created_at: new Date().toISOString() }),
      });
    }
  }

  return { email, plan: planInfo.plan, status };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body;
    
    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_details?.email || session.customer_email;
      const name = session.customer_details?.name || '';
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      
      // Get the price ID from line items (stored in session)
      let priceId = '';
      if (session.line_items?.data?.[0]?.price?.id) {
        priceId = session.line_items.data[0].price.id;
      }

      if (email) {
        const result = await upsertSubscription(email, name, customerId, subscriptionId, priceId, 'active');
        console.log('Subscription activated:', result);
        
        // Send notification email via a simple fetch (optional - you can add later)
      }
    }

    // Handle subscription cancelled
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const customerId = sub.customer;
      
      // Update status to cancelled
      await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?stripe_customer_id=eq.${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ status: 'cancelled', updated_at: new Date().toISOString() }),
      });
    }

    // Handle payment failed
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      
      await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?stripe_customer_id=eq.${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ status: 'past_due', updated_at: new Date().toISOString() }),
      });
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(400).json({ error: err.message });
  }
}
