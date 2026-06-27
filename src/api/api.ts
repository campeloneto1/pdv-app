import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

// Configuração base da API
const API_BASE_URL = Config.API_BASE_URL || 'https://api.cariripdv.com.br/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor de requisição
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Adicionar token de autenticação
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Adicionar Company ID
    const companyId = await AsyncStorage.getItem('company_id');
    if (companyId) {
      config.headers['X-Company-ID'] = companyId;
    }

    console.log(`📡 API: ${config.method?.toUpperCase()} ${config.url}`);

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de resposta
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Token inválido - fazer logout
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
      // Navegar para login será feito pelo store
    }

    console.error(`❌ API Error: ${status}`, error.response?.data?.message);
    return Promise.reject(error);
  }
);

// Helper para extrair dados do response
export const extractArrayData = (response: any): any[] => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  return [];
};

export const extractSingleData = (response: any): any => {
  const data = response?.data;
  if (data?.data) return data.data;
  return data;
};

export default api;
