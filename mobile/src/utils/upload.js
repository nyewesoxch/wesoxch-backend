import * as SecureStore from 'expo-secure-store';
import { BASE_SERVER_URL } from '../api/client';

// Sends one photo to the server and returns the server's JSON reply.
export async function uploadPhoto(path, field, asset) {
  const token = await SecureStore.getItemAsync('wesoxch_token');
  return new Promise((resolve, reject) => {
    const uri = asset.uri;
    const name = uri.split('/').pop() || 'photo.jpg';
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    const body = new FormData();
    body.append(field, { uri, name, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
    const xhr = new XMLHttpRequest();
    xhr.open('POST', BASE_SERVER_URL + path);
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.timeout = 60000;
    xhr.onload = () => {
      try { resolve(JSON.parse(xhr.responseText)); }
      catch { reject(new Error('The server sent an unexpected reply')); }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.ontimeout = () => reject(new Error('The upload took too long'));
    xhr.send(body);
  });
}
