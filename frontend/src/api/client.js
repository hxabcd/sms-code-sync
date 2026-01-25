import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: true,
});

export const fetchProfiles = () => api.get('/api/profiles');
export const checkSession = (profile) => api.get(`/api/profiles/${profile}/session`);
export const verifyTOTP = (profile, token) => api.post(`/api/profiles/${profile}/session`, { token });
export const fetchCodes = (profile) => api.get(`/api/profiles/${profile}/codes`);
export const logoutProfile = (profile) => api.delete(`/api/profiles/${profile}/session`);

export default api;
