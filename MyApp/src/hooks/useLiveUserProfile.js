import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { refreshUserProfile } from '../utils/userProfile';

export default function useLiveUserProfile(onProfile) {
  const callback = useRef(onProfile);
  callback.current = onProfile;
  useFocusEffect(useCallback(() => {
    let active = true;
    const refresh = async () => {
      if (!active || (AppState?.currentState && AppState.currentState !== 'active')) return;
      try {
        const cached = JSON.parse(await AsyncStorage.getItem('userData') || 'null');
        const fresh = await refreshUserProfile(cached);
        if (active && fresh) callback.current(fresh);
      } catch { /* Preserve the cached profile while offline. */ }
    };
    const listener = AppState?.addEventListener?.('change', state => { if (state === 'active') refresh(); });
    const timer = setInterval(refresh, 15000);
    return () => { active = false; clearInterval(timer); listener?.remove(); };
  }, []));
}
