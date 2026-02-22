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
  
  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  try {
    const apiKey = process.env.ESV_API_KEY;
    
    // Try passage text endpoint first (works for specific references like "John 3:16")
    let passages = [];
    let reference = query;
    
    try {
      const passageUrl = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(query)}&include-passage-references=false&include-footnotes=false&include-heading-titles=false`;
      const passageRes = await fetch(passageUrl, {
        headers: { 'Authorization': apiKey }
      });
      
      if (passageRes.ok) {
        const passageData = await passageRes.json();
        if (passageData.passages && passageData.passages.length > 0) {
          passages = passageData.passages;
          // Try to extract reference from the passage data
          if (passageData.canonical) {
            reference = passageData.canonical;
          }
        }
      }
    } catch (e) {
      console.log('Passage lookup failed, trying search:', e.message);
    }
    
    // If no passage found, try search
    if (passages.length === 0) {
      const searchUrl = `https://api.esv.org/v3/passage/search/?q=${encodeURIComponent(query)}&per_page=5`;
      const searchRes = await fetch(searchUrl, {
        headers: { 'Authorization': apiKey }
      });
      
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.results && searchData.results.length > 0) {
          // Get the first result's full text
          const firstResult = searchData.results[0];
          reference = firstResult.reference;
          
          try {
            const passageUrl = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(firstResult.reference)}&include-passage-references=false&include-footnotes=false&include-heading-titles=false`;
            const passageRes = await fetch(passageUrl, {
              headers: { 'Authorization': apiKey }
            });
            if (passageRes.ok) {
              const passageData = await passageRes.json();
              if (passageData.passages) {
                passages = passageData.passages;
              }
            }
          } catch (e) {
            passages = [firstResult.content];
          }
        }
      }
    }
    
    if (passages.length === 0) {
      return res.status(200).json({ results: [], query });
    }
    
    const fullText = passages.join('\n\n');
    
    res.status(200).json({ 
      results: [{
        reference: reference,
        text: fullText,
        preview: fullText.substring(0, 300) + (fullText.length > 300 ? '...' : '')
      }], 
      query 
    });
  } catch (error) {
    console.error('ESV error:', error);
    res.status(500).json({ error: error.message });
  }
};
