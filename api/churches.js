function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function buildAddress(tags = {}) {
  const parts = [
    tags['addr:housenumber'] && tags['addr:street']
      ? `${tags['addr:housenumber']} ${tags['addr:street']}`
      : tags['addr:street'],
    tags['addr:city'],
    tags['addr:state'],
    tags['addr:postcode']
  ].filter(Boolean);

  return parts.join(', ');
}

async function geocodeLocation(query) {
  const q = query.trim();
  const isUSZip = /^\d{5}(?:-\d{4})?$/.test(q);

  // If user enters a ZIP, force a US lookup first so 28078 doesn't map to Italy.
  if (isUSZip) {
    const zip = q.slice(0, 5);
    const zipRes = await fetch(`https://api.zippopotam.us/us/${zip}`, {
      headers: {
        'User-Agent': 'seek-app/1.0 (church-finder)',
        Accept: 'application/json'
      }
    });

    if (zipRes.ok) {
      const zipData = await zipRes.json();
      const place = zipData?.places?.[0];
      const lat = Number(place?.latitude);
      const lon = Number(place?.longitude);

      if (place && Number.isFinite(lat) && Number.isFinite(lon)) {
        const city = place['place name'];
        const state = place['state abbreviation'];
        return {
          lat,
          lon,
          displayName: `${city}, ${state} ${zip}, USA`
        };
      }
    }

    // Fallback: still bias to US if zippopotam misses.
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(zip)}`,
      {
        headers: {
          'User-Agent': 'seek-app/1.0 (church-finder)',
          Accept: 'application/json'
        }
      }
    );

    if (nomRes.ok) {
      const nomData = await nomRes.json();
      const place = nomData?.[0];
      if (place) {
        return {
          lat: Number(place.lat),
          lon: Number(place.lon),
          displayName: place.display_name || `${zip}, USA`
        };
      }
    }
  }

  // Generic city/location lookup
  const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const geoRes = await fetch(geocodeUrl, {
    headers: {
      'User-Agent': 'seek-app/1.0 (church-finder)',
      Accept: 'application/json'
    }
  });

  if (!geoRes.ok) {
    throw new Error('Could not find that location.');
  }

  const geoData = await geoRes.json();
  const place = geoData?.[0];

  if (!place) return null;

  return {
    lat: Number(place.lat),
    lon: Number(place.lon),
    displayName: place.display_name || q
  };
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const q = (req.query.q || req.body?.q || '').trim();

  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Please enter a valid city or ZIP.' });
  }

  try {
    const place = await geocodeLocation(q);

    if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lon)) {
      return res.status(200).json({ location: q, churches: [] });
    }

    const lat = place.lat;
    const lon = place.lon;

    const overpassQuery = `
[out:json][timeout:25];
(
  node(around:25000,${lat},${lon})["amenity"="place_of_worship"]["religion"~"christian|christianity",i];
  way(around:25000,${lat},${lon})["amenity"="place_of_worship"]["religion"~"christian|christianity",i];
  relation(around:25000,${lat},${lon})["amenity"="place_of_worship"]["religion"~"christian|christianity",i];
);
out center tags 60;
`;

    const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: overpassQuery
    });

    if (!overpassRes.ok) {
      throw new Error('Could not fetch nearby churches right now.');
    }

    const overpassData = await overpassRes.json();
    const elements = overpassData?.elements || [];

    const mapped = elements
      .map((el) => {
        const tags = el.tags || {};
        const cLat = Number(el.lat ?? el.center?.lat);
        const cLon = Number(el.lon ?? el.center?.lon);

        if (!Number.isFinite(cLat) || !Number.isFinite(cLon)) return null;

        const name = tags.name || tags['name:en'];
        if (!name) return null;

        const denomination =
          tags.denomination || tags['contact:denomination'] || tags.operator || '';
        const address = buildAddress(tags);
        const website = tags.website || tags['contact:website'] || '';
        const distanceKm = haversineKm(lat, lon, cLat, cLon);

        return {
          name,
          denomination,
          address,
          website,
          lat: cLat,
          lon: cLon,
          distanceKm
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const seen = new Set();
    const deduped = [];

    for (const church of mapped) {
      const key = `${church.name.toLowerCase()}|${(church.address || '').toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(church);
      if (deduped.length >= 5) break;
    }

    return res.status(200).json({
      location: place.displayName || q,
      churches: deduped
    });
  } catch (error) {
    console.error('Church lookup error:', error);
    return res.status(500).json({ error: error.message || 'Church lookup failed.' });
  }
};
