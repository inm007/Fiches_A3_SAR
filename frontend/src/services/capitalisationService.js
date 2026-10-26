import { apiRequest } from '../auth/api.js'

export const capitalisationService = {
  list: (vue, page = 1, perPage = 20, filters = {}) => apiRequest(`/capitalisation?${new URLSearchParams({ vue, page, per_page: perPage, ...filters })}`),
}
