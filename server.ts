import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getMapsApiKey(): string {
  return (
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      developer: 'Waves IT',
      bookingApiConfigured: Boolean(process.env.BOOKING_COM_API_KEY && process.env.BOOKING_COM_AFFILIATE_ID),
      mapsConfigured: Boolean(getMapsApiKey()),
    });
  });

  app.get('/api/maps-config', (_req, res) => {
    const apiKey = getMapsApiKey();
    res.json({
      apiKey,
      configured: Boolean(apiKey),
    });
  });

  // Server-side Geocoding API proxy (avoids client-side CORS and legacy JS Geocoder)
  app.get('/api/geocode', async (req, res) => {
    const address = typeof req.query.address === 'string' ? req.query.address.trim() : '';
    const apiKey = getMapsApiKey();
    if (!address) {
      res.status(400).json({ error: 'Address query parameter is required.' });
      return;
    }
    if (!apiKey) {
      res.status(503).json({ error: 'Google Maps API key is not configured on the server.' });
      return;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${encodeURIComponent(apiKey)}`;
      const upstream = await fetch(url);
      if (upstream.status === 429) {
        res.status(429).json({ error: 'RESOURCE_EXHAUSTED' });
        return;
      }
      const data = (await upstream.json()) as {
        status: string;
        error_message?: string;
        results?: Array<{
          formatted_address: string;
          place_id: string;
          geometry: { location: { lat: number; lng: number } };
          address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
        }>;
      };

      if (data.status === 'OVER_QUERY_LIMIT') {
        res.status(429).json({ error: 'RESOURCE_EXHAUSTED', message: data.error_message });
        return;
      }

      if (data.status !== 'OK' || !data.results?.length) {
        res.status(404).json({ error: 'Location not found', status: data.status });
        return;
      }

      const first = data.results[0];
      const localityComp = first.address_components?.find(
        (c) => c.types.includes('locality') || c.types.includes('administrative_area_level_2') || c.types.includes('administrative_area_level_1')
      );

      res.json({
        formattedAddress: first.formatted_address,
        townName: localityComp?.long_name || first.formatted_address,
        placeId: first.place_id,
        location: first.geometry.location,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Geocoding request failed',
      });
    }
  });

  // Server-side Reverse Geocoding proxy
  app.get('/api/reverse-geocode', async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const apiKey = getMapsApiKey();
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ error: 'Valid lat and lng query parameters are required.' });
      return;
    }
    if (!apiKey) {
      res.status(503).json({ error: 'Google Maps API key is not configured on the server.' });
      return;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(apiKey)}`;
      const upstream = await fetch(url);
      if (upstream.status === 429) {
        res.status(429).json({ error: 'RESOURCE_EXHAUSTED' });
        return;
      }
      const data = (await upstream.json()) as {
        status: string;
        error_message?: string;
        results?: Array<{
          formatted_address: string;
          address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
        }>;
      };

      if (data.status === 'OVER_QUERY_LIMIT') {
        res.status(429).json({ error: 'RESOURCE_EXHAUSTED', message: data.error_message });
        return;
      }

      const first = data.results?.[0];
      const locality =
        first?.address_components?.find((c) => c.types.includes('locality'))?.long_name ||
        first?.address_components?.find((c) => c.types.includes('administrative_area_level_2'))?.long_name ||
        first?.address_components?.find((c) => c.types.includes('administrative_area_level_1'))?.long_name ||
        'Current Town';

      res.json({
        townName: locality,
        formattedAddress: first?.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Reverse geocoding failed',
      });
    }
  });

  // Booking.com Demand API v3.1 integration for hotel rooms, cabanas, and partner stays
  app.post('/api/booking/availability', async (req, res) => {
    const body = req.body as {
      placeName?: string;
      category?: string;
      checkInDate?: string;
      checkOutDate?: string;
      guests?: number;
      lat?: number;
      lng?: number;
    };

    const placeName = typeof body.placeName === 'string' ? body.placeName.trim() : '';
    const checkInDate = typeof body.checkInDate === 'string' ? body.checkInDate : '';
    const checkOutDate = typeof body.checkOutDate === 'string' ? body.checkOutDate : '';
    const guests = typeof body.guests === 'number' && body.guests > 0 ? Math.min(body.guests, 20) : 2;

    const searchParams = new URLSearchParams({
      ss: placeName,
      checkin: checkInDate,
      checkout: checkOutDate || checkInDate,
      group_adults: String(guests),
      no_rooms: '1',
    });
    const bookingComDeepLink = `https://www.booking.com/searchresults.html?${searchParams.toString()}`;

    const apiKey = process.env.BOOKING_COM_API_KEY?.trim();
    const affiliateId = process.env.BOOKING_COM_AFFILIATE_ID?.trim();

    if (!apiKey || !affiliateId) {
      res.json({
        configured: false,
        bookingComDeepLink,
        paymentMethodsSupported: ['pay_at_property', 'card_reservation'],
        message:
          'Booking.com Demand API credentials (BOOKING_COM_API_KEY and BOOKING_COM_AFFILIATE_ID) are not configured. Use direct Booking.com lookup or submit an in-app reservation request below.',
        offers: [],
      });
      return;
    }

    try {
      const searchRes = await fetch('https://demandapi.booking.com/3.1/accommodations/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-Affiliate-Id': affiliateId,
        },
        body: JSON.stringify({
          checkin: checkInDate,
          checkout: checkOutDate || checkInDate,
          guests: { number_of_adults: guests, number_of_rooms: 1 },
          coordinates:
            typeof body.lat === 'number' && typeof body.lng === 'number'
              ? { latitude: body.lat, longitude: body.lng, radius: 5 }
              : undefined,
          currency: 'USD',
          rows: 5,
        }),
      });

      if (!searchRes.ok) {
        const errText = await searchRes.text();
        res.status(searchRes.status).json({
          configured: true,
          bookingComDeepLink,
          error: `Booking.com API returned ${searchRes.status}: ${errText}`,
          offers: [],
        });
        return;
      }

      const payload = (await searchRes.json()) as {
        data?: Array<{
          id: number;
          name?: string;
          price?: { total?: number; currency?: string };
          products?: Array<{
            id?: string;
            room_name?: string;
            price?: { total?: number; currency?: string };
            policies?: { payment?: { types?: string[] }; cancellation?: { type?: string } };
          }>;
          url?: string;
        }>;
      };

      const matched = payload.data?.[0];
      const offers =
        matched?.products?.map((p, idx) => ({
          offerId: p.id || String(idx + 1),
          roomName: p.room_name || matched.name || 'Standard Room',
          totalAmount: p.price?.total ?? matched.price?.total ?? 0,
          currency: p.price?.currency || matched.price?.currency || 'USD',
          cancellationPolicy: p.policies?.cancellation?.type || 'Standard policy',
          paymentTypes: p.policies?.payment?.types || ['card_reservation', 'pay_at_property'],
          checkoutUrl: matched.url || bookingComDeepLink,
        })) || [];

      res.json({
        configured: true,
        bookingComDeepLink: matched?.url || bookingComDeepLink,
        propertyName: matched?.name || placeName,
        offers,
      });
    } catch (err) {
      res.status(502).json({
        configured: true,
        bookingComDeepLink,
        error: err instanceof Error ? err.message : 'Unable to reach Booking.com Demand API',
        offers: [],
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nearby Rest Locations server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
