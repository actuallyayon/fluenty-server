# Fluenty Server

Backend Express.js API for Fluenty — IELTS preparation platform tailored for Bangla speakers.

## Features
- **Better Auth Authentication**: Email/password and session management with native MongoDB adapter.
- **AI Diagnostics (Gemini)**: Turn-by-turn conversational IELTS speaking examiner (Dr. Sarah Jenkins), writing evaluation, and reading/grammar explanation generator.
- **Native MongoDB Driver**: High-performance persistence without ORM overhead.
- **Payment Verification**: Stripe checkout and local payment gateway verification.

## Setup & Running

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Run development server
npm run dev

# Build for production
npm run build
npm start
```
