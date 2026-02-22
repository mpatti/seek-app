# Seek App

A Bible app that helps users find truth through scripture.

## Deployment to Vercel

This is a static HTML app deployed on Vercel.

### Environment Variables

Add these in your Vercel project settings (Settings → Environment Variables):

| Variable | Description |
|----------|-------------|
| `ESV_API_KEY` | API key for ESV Bible API |
| `OPENAI_API_KEY` | OpenAI API key for AI features |

**Important:** The API keys are injected at build time via `package.json` → `vercel.json`. The placeholders in the code get replaced during Vercel's build process, so no keys are exposed in the repo.

### Deploy

1. Push changes to GitHub
2. Vercel will auto-deploy from the `main` branch
3. Add the environment variables in Vercel dashboard
4. The app will rebuild automatically when env vars change

## Development

```bash
# Install deps
npm install

# Build locally (requires env vars set)
ESV_API_KEY=your_key OPENAI_API_KEY=your_key npm run build

# Preview
# Open dist/index.html in browser
```
