// Contact / quote page: prefill product reference from query params,
// submit to /api/quotes, show inline success/error state.

(function () {
  const form = document.getElementById('quote-form');
  if (!form) return;

  const statusEl = document.getElementById('form-status');
  const params = new URLSearchParams(window.location.search);

  const productField = form.querySelector('[name="productId"]');
  const colorField = form.querySelector('[name="colorCode"]');
  const refBanner = document.getElementById('product-ref-banner');

  const productId = params.get('product');
  const colorCode = params.get('color');
  const productName = params.get('name');

  if (productId) {
    if (productField) productField.value = productId;
    if (colorCode && colorField) colorField.value = colorCode;
    if (refBanner) {
      refBanner.style.display = 'flex';
      refBanner.querySelector('.ref-text').textContent = `Enquiring about: ${productName || productId}${colorCode ? ' — ' + colorCode : ''}`;
    }
  }

  function showStatus(type, message) {
    statusEl.textContent = message;
    statusEl.className = `form-status show ${type}`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.className = 'form-status';

    const submitBtn = form.querySelector('button[type="submit"]');
    const payload = Object.fromEntries(new FormData(form).entries());

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      showStatus('success', "Thanks — your enquiry has been received. We'll get back to you shortly.");
      form.reset();
      if (refBanner) refBanner.style.display = 'none';
    } catch (err) {
      showStatus('error', err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Enquiry';
    }
  });
})();
