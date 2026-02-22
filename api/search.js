const fetch = require('node-fetch');

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
  
  console.log('Search query:', query);
  
  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  try {
    const apiKey = process.env.ESV_API_KEY;
    
    // Search ESV API
    const searchUrl = `https://api.esv.org/v3/passage/search/?q=${encodeURIComponent(query)}&per_page=10`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`ESV API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Format results
    const results = data.results || [];
    const formatted = await Promise.all(results.map(async (r) => {
      // Try to get full passage text
      let fullText = '';
      try {
        const passageUrl = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(r.reference)}&include-passage-references=false&include-footnotes=false`;
        const passageRes = await fetch(passageUrl, {
          headers: { 'Authorization': apiKey }
        });
        if (passageRes.ok) {
          const passageData = await passageRes.json();
          fullText = passageData.passages ? passageData.passages[0] : '';
        }
      } catch (e) {
        // Fall back to preview
      }
      
      return {
        reference: r.reference,
        preview: fullText || (r.content.substring(0, 300) + (r.content.length > 300 ? '...' : '')),
        text: fullText || r.content
      };
    }));

    res.status(200).json({ results: formatted, query });
  } catch (error) {
    console.error('ESV search error:', error);
    res.status(500).json({ error: error.message });
  }
};
