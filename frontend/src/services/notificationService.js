import { apiRequest } from '../auth/api.js'

export const notificationService = {
  list: (page = 1, perPage = 20, filters = {}) => apiRequest(`/notifications?${new URLSearchParams({ page, per_page: perPage, ...filters })}`),
  unreadCount: () => apiRequest('/notifications/non-lues', { passive: true }).then((result) => result.data.count),
  markRead: (id) => apiRequest(`/notifications/${id}/lu`, { method: 'POST' }),
  markAllRead: () => apiRequest('/notifications/tout-lu', { method: 'POST' }),
}
