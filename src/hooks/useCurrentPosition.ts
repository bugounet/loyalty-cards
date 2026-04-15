import { useCallback, useState } from 'react';
import type { Coordinates } from '../utils/geo';

export type LocationStatus = 'idle' | 'checking' | 'granted' | 'denied' | 'unavailable' | 'unsupported';

type LocationState = {
  position?: Coordinates;
  status: LocationStatus;
};

export function useCurrentPosition() {
  const [state, setState] = useState<LocationState>({ status: 'idle' });

  const requestPosition = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unsupported' });
      return;
    }

    setState({ status: 'checking' });
    console.debug('[useCurrentPosition] requesting position');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        console.debug('[useCurrentPosition] position obtained', {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: position.coords.accuracy
        });
        setState({ position: coords, status: 'granted' });
      },
      (error) => {
        console.warn('[useCurrentPosition] position error', { code: error.code, message: error.message });
        setState({ status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable' });
      },
      {
        enableHighAccuracy: false,
        maximumAge: 0,
        timeout: 10000
      }
    );
  }, []);

  return {
    ...state,
    requestPosition
  };
}
