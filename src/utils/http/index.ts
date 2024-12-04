import { message } from 'antd';

import axios from 'axios';

import Storage from '@/classes/Storage';

const http = axios.create({
  baseURL: 'https://api.github.com',
  timeout: 15000,
});

http.interceptors.request.use(async (config) => {
  const token = await Storage.getGistsToken();
  config.headers.Authorization = config.headers.Authorization ?? `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => {
    const responseJson = response.data;
    return responseJson;
  },
  (error) => {
    const { response } = error;
    let msg;

    switch (response.status) {
      case 401:
        msg = `Token错误 ${response.data.message}`;
        break;
      default:
        msg = response.data.message;
        break;
    }

    message.error(msg);

    return Promise.reject(msg);
  },
);

export default http;
