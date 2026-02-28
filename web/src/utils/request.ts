import type { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'

interface CustomAxiosInstance extends Omit<AxiosInstance, 'get' | 'post' | 'put' | 'patch' | 'delete'> {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
}

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 600000,
  headers: {
    'Content-Type': 'application/json'
  }
}) as CustomAxiosInstance

request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.success) {
      return res.data
    } else {
      return Promise.reject(new Error(res.error?.message || '请求失败'))
    }
  },
  (error: AxiosError<any>) => {
    const serverMsg =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      '请求失败'
    return Promise.reject(new Error(serverMsg))
  }
)

export default request
