// Forwards a submitted quote request to the Bubble Coach CRM, where it lands as an unassigned
// opportunity in the sales pipeline's New Leads stage and shows up under CRM > Website Engagement.
//
// Fire-and-forget by design: the visitor's form must succeed even when the CRM is unreachable,
// so every failure is logged and swallowed. The quote is already saved to our own store before
// this runs, so nothing is lost if the forward fails.
//
// Configuration (Render > Environment). Forwarding is simply skipped when the secret is absent,
// which is also what local development does — no secret, no outbound call.
//   BUBBLE_LEAD_SECRET   required; the x-secret header web-lead-intake checks
//   BUBBLE_LEAD_URL      optional; defaults to the production function below
//   BUBBLE_LEAD_SITE     optional; the site tag shown in the app, defaults to 'reva'
//
// The secret is deliberately NOT given a fallback value here: this repository is public, and a
// readable secret would let anyone inject leads straight into the sales pipeline.

const DEFAULT_URL =
  'https://rqqbavzlsvsfezirwcxj.supabase.co/functions/v1/web-lead-intake';
const TIMEOUT_MS = 5000;

let warnedMissingSecret = false;

/** Design code and finish live in their own columns here, but the CRM only has one notes field —
 *  fold them in so the salesman can see which panel was being asked about. */
function composeMessage({ message, productId, colorCode }) {
  return [
    message,
    productId ? `Design: ${productId}` : '',
    colorCode ? `Finish: ${colorCode}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

async function forwardQuoteToBubble(quote) {
  const secret = process.env.BUBBLE_LEAD_SECRET;
  if (!secret) {
    if (!warnedMissingSecret) {
      warnedMissingSecret = true;
      console.warn('[bubble-lead] BUBBLE_LEAD_SECRET is not set — not forwarding leads to the CRM.');
    }
    return { forwarded: false, reason: 'no-secret' };
  }

  const url = process.env.BUBBLE_LEAD_URL || DEFAULT_URL;
  const site = process.env.BUBBLE_LEAD_SITE || 'reva';

  // The route validates this already; re-check so a future caller cannot send a doomed request.
  if (String(quote.phone ?? '').replace(/\D/g, '').length < 7) {
    return { forwarded: false, reason: 'no-phone' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-secret': secret },
      body: JSON.stringify({
        site,
        name: quote.name,
        phone: quote.phone,
        email: quote.email,
        message: composeMessage(quote),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(`[bubble-lead] rejected (${response.status}) ${detail.slice(0, 200)}`);
      return { forwarded: false, reason: `http-${response.status}` };
    }

    return { forwarded: true };
  } catch (err) {
    // Timeout, DNS, TLS, CRM down — none of it is the visitor's problem.
    console.error('[bubble-lead] forward failed:', err?.message || err);
    return { forwarded: false, reason: 'error' };
  }
}

module.exports = { forwardQuoteToBubble };
