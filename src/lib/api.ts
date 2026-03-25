import axios, { AxiosInstance } from 'axios'

export const api: AxiosInstance = axios.create({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
