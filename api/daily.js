const fetch = require('node-fetch');

// Daily passage suggestions - rotate based on day of year
const dailyPassages = [
  { ref: "John 3:16", topic: "God's Love" },
  { ref: "Romans 8:28", topic: "Purpose" },
  { ref: "Psalm 23", topic: "Peace" },
  { ref: "Proverbs 3:5", topic: "Trust" },
  { ref: "Matthew 7:7", topic: "Seek" },
  { ref: "Philippians 4:6", topic: "Anxiety" },
  { ref: "1 Corinthians 13:4", topic: "Love" },
  { ref: "Romans 5:8", topic: "Grace" },
  { ref: "Hebrews 11:1", topic: "Faith" },
  { ref: "James 1:5", topic: "Wisdom" },
  { ref: "2 Timothy 1:7", topic: "Courage" },
  { ref: "Psalm 46:1", topic: "Strength" },
  { ref: "Matthew 11:28", topic: "Rest" },
  { ref: "Romans 12:2", topic: "Transformation" },
  { ref: "Galatians 5:22", topic: "Fruit of Spirit" },
  { ref: "Ephesians 2:8", topic: "Salvation" },
  { ref: "Colossians 3:23", topic: "Work" },
  { ref: "1 Peter 5:7", topic: "Care" },
  { ref: "John 14:6", topic: "Truth" },
  { ref: "Acts 1:8", topic: "Power" },
  { ref: "Matthew 5:9", topic: "Peace" },
  { ref: "Romans 6:23", topic: "Gift" },
  { ref: "2 Corinthians 5:17", topic: "New Life" },
  { ref: "1 John 4:8", topic: "God's Love" },
  { ref: "Matthew 22:37", topic: "Love God" },
  { ref: "Psalm 119:105", topic: "Light" },
  { ref: "Isaiah 40:31", topic: "Strength" },
  { ref: "Romans 10:9", topic: "Salvation" },
  { ref: "John 1:12", topic: "Children" },
  { ref: "Matthew 6:33", topic: "Seek First" },
  { ref: "Romans 8:38", topic: "Security" }
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get day of year for rotation
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    const daily = dailyPassages[dayOfYear % dailyPassages.length];
    const apiKey = process.env.ESV_API_KEY;
    
    // Fetch the passage text
    const passageUrl = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(daily.ref)}&include-passage-references=false&include-footnotes=false&include-heading-titles=false`;
    
    const response = await fetch(passageUrl, {
      headers: { 'Authorization': apiKey }
    });
    
    if (!response.ok) {
      throw new Error(`ESV API error: ${response.status}`);
    }
    
    const data = await response.json();
    const text = data.passages ? data.passages[0] : '';
    
    res.status(200).json({
      reference: daily.ref,
      topic: daily.topic,
      text: text.substring(0, 300) + (text.length > 300 ? '...' : '')
    });
  } catch (error) {
    console.error('Daily passage error:', error);
    res.status(500).json({ error: error.message });
  }
};
