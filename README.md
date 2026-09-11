# HoneyChain – Customer Messaging + Country Phone + Daily Sales

React/Vite HoneyChain prototype based on the previous working build.

## Latest changes
- Daily sales panel restored on the beekeeper Dashboard.
- Sales are recorded when a batch is registered and show count, kg sold, revenue and today's order list.
- Customer phone number now has a selectable country calling code.
- The national mobile number must be exactly 10 digits.
- The selected calling code is used when sending SMS/WhatsApp.
- Customer details are automatically sent after batch registration when the option is enabled.
- Vercel serverless endpoint in `api/send-customer-message.js` sends through Twilio when credentials are configured.

## Automatic messaging setup in Vercel
Add these Environment Variables to the Vercel project:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER` (for SMS)
- `TWILIO_WHATSAPP_FROM` (for WhatsApp, e.g. `whatsapp:+1415...`)

Redeploy after adding the variables.

Important: Twilio/WhatsApp may require an approved sender or WhatsApp template depending on the account and messaging policy. The site will show a failure status instead of claiming a message was sent when Twilio rejects it.

## Run locally

```bash
npm install
npm run dev
```

Then open the Vite URL.
