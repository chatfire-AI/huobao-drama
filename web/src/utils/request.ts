import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig
} from 'axios'
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
  (config: InternalAxiosRequestConfig) => config,
  (error: AxiosError) => Promise.reject(error)
)

request.interceptors.response.use(
  (response) => {
    const responseType = response.config.responseType
    if (responseType === 'blob' || responseType === 'arraybuffer') {
      return response.data
    }

    const res = response.data

    // Legacy endpoints may directly return primitives or plain objects.
    if (res === null || res === undefined || typeof res !== 'object') {
      return res
    }

    if ('success' in res) {
      if (res.success) {
        return res.data
      }
      return Promise.reject(new Error(res.error?.message || '\u8bf7\u6c42\u5931\u8d25'))
    }

    return res
  },
  (error: AxiosError<any>) => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('\u8bf7\u6c42\u8d85\u65f6\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5'))
    }

    if (!error.response) {
      return Promise.reject(
        new Error('\u7f51\u7edc\u8fde\u63a5\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u540e\u91cd\u8bd5')
      )
    }

    const data = error.response.data
    const rawServerMsg = data?.error?.message || data?.message || data?.error
    if (typeof rawServerMsg === 'string' && rawServerMsg.trim()) {
      return Promise.reject(new Error(rawServerMsg.trim()))
    }

    if (error.response.status >= 500) {
      return Promise.reject(new Error('\u670d\u52a1\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5'))
    }

    return Promise.reject(new Error(error.message || '\u8bf7\u6c42\u5931\u8d25'))
  }
)

export default request
