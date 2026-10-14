import { apiRequest } from '../auth/api.js'

export const notificationService = {
  list: (page = 1, perPage = 20) => apiRequest(`/notifications?page=${page}&per_page=${perPage}`),
  unreadCount: () => apiRequest('/notifications/non-lues', { passive: true }).then((result) => result.data.count),
  markRead: (id) => apiRequest(`/notifications/${id}/lu`, { method: 'POST' }),
  markAllRead: () => apiRequest('/notifications/tout-lu', { method: 'POST' }),
}
