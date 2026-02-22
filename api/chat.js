const Anthropic = require('@anthropic-ai/sdk');
const fetch = require('node-fetch');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { prompt, passageRef, passageText, message } = req.body;

    if (!prompt && !message) {
      return res.status(400).json({ error: 'Missing prompt or message' });
    }

    let responseText;
    let suggestions = null;

    // If this is a user message, check if they want related verses
    if (message) {
      const userQuery = message.toLowerCase();
      
      // Check if user is asking about a topic that might have related verses
      const topicKeywords = [
        'love', 'fear', 'peace', 'joy', 'hope', 'faith', 'trust', 'grace',
        'mercy', 'forgiveness', 'salvation', 'meaning', 'purpose', 'life',
        'death', 'anxiety', 'worry', 'stress', 'relationship', 'God', 'Jesus',
        'wisdom', 'guidance', 'healing', 'strength', 'courage', 'comfort'
      ];
      
      const isTopicQuestion = topicKeywords.some(keyword => userQuery.includes(keyword));
      
      if (isTopicQuestion) {
        // Ask AI to suggest related verses
        const suggestionPrompt = `The user is asking about: "${message}"

Based on this topic, suggest 3 relevant Bible verse references (like "Romans 8:28", "John 3:16", "Psalm 23").

Respond ONLY with a comma-separated list of verse references. Nothing else.`;
        
        try {
          const aiSuggestion = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 100,
            messages: [{ role: 'user', content: suggestionPrompt }]
          });
          
          const verseRefs = aiSuggestion.content[0].text
            .split(',')
            .map(v => v.trim())
            .slice(0, 3);
          
          // Fetch the actual verse texts
          const esvKey = process.env.ESV_API_KEY;
          const fetchedVerses = [];
          
          for (const ref of verseRefs) {
            try {
              const url = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(ref)}&include-passage-references=false&include-footnotes=false`;
              const r = await fetch(url, { headers: { 'Authorization': esvKey } });
              if (r.ok) {
                const data = await r.json();
                if (data.passages && data.passages[0]) {
                  fetchedVerses.push({
                    ref: data.canonical || ref,
                    text: data.passages[0].substring(0, 300)
                  });
                }
              }
            } catch (e) {}
          }
          
          if (fetchedVerses.length > 0) {
            suggestions = fetchedVerses;
          }
        } catch (e) {
          console.log('Suggestion error:', e.message);
        }
      }
      
      // Answer the user's question
      const answerPrompt = `You are chatting with someone about this Bible passage: ${passageRef}

The passage says: "${passageText.replace(/<[^>]*>/g, '').substring(0, 500)}..."

The user asks: "${message}"

Answer their question. Be conversational, concise, 1-2 sentences. No quotes.`;

      const aiResponse = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [{ role: 'user', content: answerPrompt }]
      });
      
      responseText = aiResponse.content[0].text;
    } else {
      // Regular prompt (initial message)
      const message = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      });

      responseText = message.content[0].type === 'text' 
        ? message.content[0].text 
        : JSON.stringify(message.content);
    }

    res.status(200).json({ content: responseText, suggestions });
  } catch (error) {
    console.error('Anthropic error:', error);
    res.status(500).json({ error: error.message });
  }
};
