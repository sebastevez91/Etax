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