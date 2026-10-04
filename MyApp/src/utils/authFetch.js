import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/config';
let onExpired = () => {};
export function onSessionExpired(callback) { onExpired = callback; return () => { onExpired = () => {}; }; }
export function installAuthFetch() {
  const original = global.fetch;
  let clearing = false;
  global.fetch = async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (typeof url !== 'string' || !url.startsWith(API_BASE_URL + '/api/')) return original(input, options);
    const token = await AsyncStorage.getItem('userToken');
    const headers = new Headers(options.headers || input?.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await original(input, {...options, headers});
    if (response.status === 401 && !clearing) {
      const data = await response.clone().json().catch(() => ({}));
      if (data.code === 'SESSION_EXPIRED') {
        clearing = true;
        try {
          // Ignore responses from an older session if the user has just signed in again.
          if (await AsyncStorage.getItem('userToken') === token) {
            await AsyncStorage.multiRemove(['userToken', 'userData', 'userEmail']);
            onExpired();
          }
        } finally { clearing = false; }
      }
    }
    return response;
  };
}
