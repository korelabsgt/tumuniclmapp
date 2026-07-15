'use client';

import { useQuery } from '@tanstack/react-query';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  ?? process.env.NEXT_PUBLIC_Maps_API_KEY
  ?? '';

export const GOOGLE_MAPS_LIBRARY_KEY = ['google-maps-library'] as const;

let googleMapsConfigured = false;

async function loadGoogleMapsLibrary(): Promise<google.maps.MapsLibrary> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('missing_api_key');
  }
  if (!googleMapsConfigured) {
    setOptions({ key: GOOGLE_MAPS_API_KEY, v: 'weekly' });
    googleMapsConfigured = true;
  }
  return importLibrary('maps');
}

export function useGoogleMapsLibrary(enabled: boolean) {
  return useQuery({
    queryKey: GOOGLE_MAPS_LIBRARY_KEY,
    queryFn: loadGoogleMapsLibrary,
    enabled: enabled && !!GOOGLE_MAPS_API_KEY,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });
}

export function getGoogleMapsApiKey(): string {
  return GOOGLE_MAPS_API_KEY;
}
