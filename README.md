# Credit Card Advisor Chatbot

A chatbot application that provides credit card recommendations and comparisons.

## Features

- Interactive chat interface
- Credit card recommendations based on user preferences
- Credit card comparisons
- Twilio integration

## Prerequisites

- Node.js
- npm

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

## Getting Started

### Start the Backend

```bash
cd server
node index.js
```

### Start the Frontend

```bash
npm run start
```

## Project Structure

- `src/` - Frontend React application
- `server/` - Backend Node.js server
  - `ai/` - AI processing logic
  - `database/` - Database configuration and services
  - `services/` - External service integrations (Twilio)
- `public/` - Static files 