const Anthropic = require('@anthropic-ai/sdk');
const fetch = require('node-fetch');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query.q || req.body?.q || '';
  
  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  try {
    const apiKey = process.env.ESV_API_KEY;
    
    // First, use AI to interpret the search query
    let searchTerms = query;
    let isTopicSearch = false;
    
    // Check if it's a topic/concept search (not a verse reference)
    const versePattern = /^[0-9]?\s*[a-zA-Z]+\s+\d+:\d+/i; // Matches "John 3:16", "Psalm 23", etc.
    const isVerseReference = versePattern.test(query.trim());
    
    if (!isVerseReference) {
      isTopicSearch = true;
      
      // Use Haiku to find relevant verse references
      const aiResponse = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `The user is searching for: "${query}"

Give me 3-5 specific Bible verse references (like "John 3:16", "Psalm 23", "Romans 8:28") that would help answer this search. 

Respond ONLY with a comma-separated list of verse references. Nothing else. For example: "John 3:16, Romans 8:28, Psalm 23"`
        }]
      });
      
      searchTerms = aiResponse.content[0].text;
      console.log('AI interpreted search:', query, '->', searchTerms);
    }
    
    // Now fetch the actual passage(s)
    const verses = searchTerms.split(',').map(v => v.trim()).slice(0, 5);
    const results = [];
    
    for (const verse of verses) {
      try {
        const passageUrl = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(verse)}&include-passage-references=false&include-footnotes=false&include-heading-titles=false`;
        const passageRes = await fetch(passageUrl, {
          headers: { 'Authorization': apiKey }
        });
        
        if (passageRes.ok) {
          const passageData = await passageRes.json();
          if (passageData.passages && passageData.passages.length > 0) {
            const text = passageData.passages.join('\n\n');
            results.push({
              reference: passageData.canonical || verse,
              text: text,
              preview: text.substring(0, 300) + (text.length > 300 ? '...' : '')
            });
          }
        }
      } catch (e) {
        console.log('Failed to fetch:', verse, e.message);
      }
    }
    
    if (results.length === 0) {
      return res.status(200).json({ results: [], query });
    }
    
    res.status(200).json({ results, query });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
};
