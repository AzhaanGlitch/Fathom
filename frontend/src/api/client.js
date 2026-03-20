// frontend/src/api/client.js  (FULL REPLACEMENT)
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://parthg2209-fathom.hf.space';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Remove trailing slashes
apiClient.interceptors.request.use(
  (config) => {
    if (config.url && config.url.endsWith('/')) {
      config.url = config.url.slice(0, -1);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// ── Mentor APIs ────────────────────────────────────────────────────────────────
export const mentorApi = {
  getAll: () => apiClient.get('/api/mentors'),
  getById: (id) => apiClient.get(`/api/mentors/${id}`),
  create: (data) => apiClient.post('/api/mentors', data),
  update: (id, data) => apiClient.put(`/api/mentors/${id}`, data),
  delete: (id) => apiClient.delete(`/api/mentors/${id}`),
  getStats: (id) => apiClient.get(`/api/mentors/${id}/stats`),
};

// ── Session APIs ───────────────────────────────────────────────────────────────
export const sessionApi = {
  getAll: (params) => apiClient.get('/api/sessions', { params }),
  getById: (id) => apiClient.get(`/api/sessions/${id}`),
  create: (formData) =>
    apiClient.post('/api/sessions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id, data) => apiClient.put(`/api/sessions/${id}`, data),
  delete: (id) => apiClient.delete(`/api/sessions/${id}`),
};

// ── Evaluation APIs ────────────────────────────────────────────────────────────
export const evaluationApi = {
  startEvaluation: (sessionId) =>
    apiClient.post(`/api/evaluations/sessions/${sessionId}/evaluate`),
  getBySessionId: (sessionId) =>
    apiClient.get(`/api/evaluations/sessions/${sessionId}`),
  getById: (id) => apiClient.get(`/api/evaluations/${id}`),
  getSummary: (id) => apiClient.get(`/api/evaluations/${id}/summary`),
  getAll: (params) => apiClient.get('/api/evaluations', { params }),
};

// ── Access Code APIs ───────────────────────────────────────────────────────────
export const accessCodeApi = {
  /**
   * Admin: Save a newly generated code hash to the database.
   * payload: { institution_name: string, code_hash: string, description?: string }
   */
  create: (payload) => apiClient.post('/api/access-codes', payload),

  /**
   * Faculty login: Verify that a code hash is valid and (optionally) bind it
   * to the current Firebase user.
   * payload: { code_hash: string, user_uid?: string }
   * Returns: { valid: boolean, institution_name: string|null, message: string }
   */
  verify: (payload) => apiClient.post('/api/access-codes/verify', payload),

  /**
   * Admin: List all access codes (hashes are never returned).
   */
  getAll: () => apiClient.get('/api/access-codes'),

  /**
   * Admin: Deactivate (revoke) an access code without deleting it.
   */
  deactivate: (codeId) => apiClient.patch(`/api/access-codes/${codeId}/deactivate`),

  /**
   * Admin: Permanently delete an access code.
   */
  delete: (codeId) => apiClient.delete(`/api/access-codes/${codeId}`),
};

export default apiClient;