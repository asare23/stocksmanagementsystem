import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      !localStorage.getItem("refreshToken")
    ) {
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !original._retry &&
      localStorage.getItem("refreshToken")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        const { data } = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken,
        });
        localStorage.setItem("accessToken", data.accessToken);
        queue.forEach((p) => p.resolve(data.accessToken));
        queue = [];
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        queue.forEach((p) => p.reject(refreshErr));
        queue = [];
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export default api;
