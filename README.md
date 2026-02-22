# Seek App

A Bible app that helps users find truth through scripture. Search any topic or verse, explore passages with AI-powered insights, and chat about what you're learning.

## Features

- **Search** — Search for any Bible verse, topic, or concept
- **Explore** — Read passages with beautiful formatting
- **Chat** — Ask questions and get insights that point to Jesus

## Deployment to Vercel

This app uses Vercel serverless functions to proxy API calls (avoids CORS issues).

### Environment Variables

Add these in your Vercel project settings (Settings → Environment Variables):

| Variable | Description |
|----------|-------------|
| `ESV_API_KEY` | API key for ESV Bible API (get from api.esv.org) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude AI |

### Deploy

1. Push changes to GitHub
2. Vercel will auto-deploy from the `main` branch
3. Add the environment variables in Vercel dashboard
4. The app is ready at your-vercel-url.vercel.app

## Development

```bash
# Install deps
npm install

# Build locally (requires env vars set)
ESV_API_KEY=your_key ANTHROPIC_API_KEY=your_key npm run build

# Run locally with Vercel
npx vercel dev
```
