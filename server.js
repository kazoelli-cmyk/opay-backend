const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Verify a Paystack transaction reference
app.get('/paystack/verify/:reference', async (req, res) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY not configured' });
    }
    const { reference } = req.params;
    if (!reference) {
      return res.status(400).json({ error: 'Missing reference' });
    }
    const resp = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    const text = await resp.text();
    console.log('Paystack verify status:', resp.status);
    console.log('Paystack verify body:', text);
    let data = {};
    try {
      data = JSON.parse(text);
    } catch (_) {
      return res.status(resp.status).json({ error: 'Non-JSON response', body: text });
    }
    return res.status(resp.status).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Paystack verify failed', detail: err.message });
  }
});

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', paystack: PAYSTACK_SECRET_KEY ? 'configured' : 'missing' });
});

app.listen(PORT, () => {
  console.log(`Paystack backend listening on port ${PORT}`);
});
