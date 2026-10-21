// 浏览器禁止本地存储时，浏览功能与当前会话的设置仍然可用。
export const readPreference = (key: string, fallback = "") => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};
export const writePreference = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 设置继续保留于当前会话。 */
  }
};
