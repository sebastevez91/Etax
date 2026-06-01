import axios from 'axios';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const BASE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

// Buscar sugerencias mientras el usuario escribe
export const searchPlaces = async (query) => {
  if (!query || query.length < 3) return [];

  try {
    const res = await axios.get(`${BASE_URL}/${encodeURIComponent(query)}.json`, {
      params: {
        access_token: MAPBOX_TOKEN,
        country: 'AR',
        language: 'es',
        limit: 5,
        types: 'address,place,neighborhood,locality',
      },
    });

    return res.data.features.map((f) => ({
      id: f.id,
      name: f.place_name,
      lat: f.center[1],
      lng: f.center[0],
    }));
  } catch (err) {
    console.error('Mapbox search error:', err);
    return [];
  }
};

// Convertir coordenadas a dirección (reverse geocoding)
export const reverseGeocode = async (lat, lng) => {
  try {
    const res = await axios.get(`${BASE_URL}/${lng},${lat}.json`, {
      params: {
        access_token: MAPBOX_TOKEN,
        country: 'AR',
        language: 'es',
        limit: 1,
      },
    });

    const feature = res.data.features[0];
    return feature ? feature.place_name : `${lat}, ${lng}`;
  } catch (err) {
    console.error('Reverse geocode error:', err);
    return `${lat}, ${lng}`;
  }
};

// Obtener ruta entre dos puntos (Directions API)
export const fetchRoute = async (originLat, originLng, destLat, destLng) => {
  if (!MAPBOX_TOKEN) {
    console.error('Mapbox: configurá EXPO_PUBLIC_MAPBOX_TOKEN en mobile/.env');
    return [];
  }

  const coords = [originLat, originLng, destLat, destLng].map(Number);
  if (coords.some((n) => Number.isNaN(n))) {
    console.warn('Mapbox directions: coordenadas inválidas');
    return [];
  }

  try {
    const res = await axios.get(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}`,
      {
        params: {
          geometries: 'geojson',
          overview: 'full',
          access_token: MAPBOX_TOKEN,
        },
      }
    );

    const route = res.data?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) {
      console.warn(
        'Mapbox directions: sin ruta',
        res.data?.code,
        res.data?.message
      );
      return [];
    }

    return route.geometry.coordinates.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }));
  } catch (err) {
    const detail = err.response?.data?.message || err.message;
    console.error('Mapbox directions error:', detail);
    return [];
  }
};