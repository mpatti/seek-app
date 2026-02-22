# Seek App

A Bible app that helps users find truth through scripture.

## Deployment to Vercel

This app uses Vercel serverless functions to proxy API calls (avoids CORS issues).

### Environment Variables

Add these in your Vercel project settings (Settings → Environment Variables):

| Variable | Description |
|----------|-------------|
| `ESV_API_KEY` | API key for ESV Bible API |
| `OPENAI_API_KEY` | OpenAI API key for AI features |

### Deploy

1. Push changes to GitHub
2. Vercel will auto-deploy from the `main` branch
3. Add the environment variables in Vercel dashboard

## Development

```bash
# Install deps
npm install

# Build locally (requires env vars set)
ESV_API_KEY=your_key OPENAI_API_KEY=your_key npm run build

# Run locally with Vercel
npx vercel dev
```
