const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPAY_BASE_URL =
  process.env.OPAY_BASE_URL ||
  'https://testapi.opaycheckout.com/api/v1/international/payment/create';
const OPAY_MERCHANT_ID = process.env.OPAY_MERCHANT_ID || '';
const OPAY_SECRET_KEY = process.env.OPAY_SECRET_KEY || '';
const CALLBACK_URL =
  process.env.CALLBACK_URL || 'https://your-service.com/opay/webhook';

function signPayload(jsonString) {
  return crypto
    .createHmac('sha512', OPAY_SECRET_KEY)
    .update(jsonString)
    .digest('hex');
}

app.post('/opay/create', async (req, res) => {
  try {
    const {
      reference,
      amount, // in base currency units (e.g., kobo)
      currency = 'NGN',
      productName = 'Ticket',
      productDesc = '',
      customerName = '',
      userEmail = '',
      userMobile = '',
      userName = '',
      userPhone = '',
      expireAt = 30,
      country = 'NG',
    } = req.body;

    if (!OPAY_MERCHANT_ID || !OPAY_SECRET_KEY) {
      return res.status(500).json({ error: 'Server not configured' });
    }
    if (!reference || !amount) {
      return res.status(400).json({ error: 'Missing reference or amount' });
    }

    const payload = {
      reference,
      amount: {
        currency,
        total: Number(amount),
      },
      callbackUrl: CALLBACK_URL,
      country,
      customerName,
      payMethod: 'BankTransfer',
      product: {
        name: productName,
        description: productDesc,
      },
      expireAt,
      userInfo: {
        userEmail,
        userId: userMobile || reference,
        userMobile,
        userName,
      },
      userPhone,
    };

    const jsonStr = JSON.stringify(payload);
    const signature = signPayload(jsonStr);

    const resp = await fetch(OPAY_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${signature}`,
        MerchantId: OPAY_MERCHANT_ID,
      },
      body: jsonStr,
    });

    const data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'OPay create failed', detail: err.message });
  }
});

// Webhook endpoint for OPay callbacks
app.post('/opay/webhook', (req, res) => {
  // TODO: verify signature if provided, update order status in your DB
  console.log('Webhook received:', req.body);
  res.sendStatus(200);
});

// Optional status stub
app.get('/opay/status/:reference', (req, res) => {
  // TODO: look up status in your DB; returning stub
  res.json({ reference: req.params.reference, status: 'PENDING' });
});

app.listen(PORT, () => {
  console.log(`OPay backend listening on port ${PORT}`);
});
