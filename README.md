💳 Mash Payments (M-Pesa Integration)

A robust, type-safe payment integration system built to seamlessly handle Safaricom's M-Pesa Daraja API transactions, STK Pushes, and automated callbacks.

Welcome to the Mash Payments repository. This project serves as a scalable foundation for integrating mobile money payments into modern web applications. It handles the complexities of the Daraja API—such as OAuth token generation, password encryption, and webhooks—allowing for a smooth checkout experience.

🛠️ Tech Stack & Architecture

This payment service is engineered for reliability, security, and developer experience:

Language: TypeScript for strict type safety and error reduction in financial transactions.

Framework: Node.js / Next.js (API Routes)

API Integration: Safaricom Daraja API (M-Pesa)

Testing & Requests: Axios / Fetch API for handling external HTTP requests.

✨ Core Features

STK Push (Lipa Na M-Pesa Online): Instantly trigger payment prompts on a user's mobile device.

Automated Webhooks (Callbacks): Securely receive, parse, and verify transaction statuses from Safaricom's servers in real-time.

Token Management: Automated generation and caching of Daraja API access tokens to ensure uninterrupted service.

Type-Safe Payloads: Strict interfaces for all incoming and outgoing M-Pesa data structures.

🚀 Getting Started (Local Development)

To test the payment integration locally, you will need a Safaricom Daraja developer account. Follow these steps:

1. Clone the repository

git clone https://github.com/marsley01/Mash-Payments.git
cd Mash-Payments


2. Install dependencies

npm install
# or
yarn install
# or
pnpm install


3. Configure Environment Variables

Create a .env file in the root directory. You must supply your own test credentials from the Safaricom Daraja Portal. Never commit your .env file.

# M-Pesa Daraja Credentials
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_sandbox_passkey
MPESA_SHORTCODE=174379 # Default sandbox shortcode
MPESA_CALLBACK_URL=https://your-ngrok-url.com/api/callback


(Note: To test callbacks locally, you will need to expose your localhost to the internet using a tool like ngrok).

4. Run the Development Server

npm run dev
# or
yarn dev


🔐 Security & Contribution Notice

This repository contains backend logic for handling financial transactions.

Do not use sandbox credentials in a production environment.

Always ensure your callback URLs are served over HTTPS and validate the origin of incoming Safaricom payloads before updating your database.

Designed and developed by Mash Marsley.
