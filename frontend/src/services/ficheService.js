import { apiDownload, apiRequest } from '../auth/api.js'

// Seul point d'accès de la fiche à l'API Laravel.

function send(path, method, body) {
  return apiRequest(path, { method, body: JSON.stringify(body) })
}

export const ficheService = {
  referentiels: () => apiRequest('/referentiels').then((result) => result.data),
  list: (params) => apiRequest(`/fiches?${new URLSearchParams(params)}`),
  create: (data) => send('/fiches', 'POST', data).then((result) => result.data),
  get: (id) => apiRequest(`/fiches/${id}`).then((result) => result.data),
  meDesignerPilote: (id) => send(`/fiches/${id}/me-designer`, 'POST').then((result) => result.data),
  options: (id) => apiRequest(`/fiches/${id}/options`).then((result) => result.data),
  saveSection: (id, section, data) => send(`/fiches/${id}/sections/${section}`, 'PUT', data).then((result) => result.data),
  transition: (id, code, etape, motif) => send(`/fiches/${id}/transitions`, 'POST', { code, etape, motif }).then((result) => result.data),
  confidentialite: (id, confidentialite, motif) => send(`/fiches/${id}/confidentialite`, 'POST', { confidentialite, motif }).then((result) => result.data),
  designerPilote: (id, piloteId, motif = null) => send(`/admin/fiches/${id}`, 'PATCH', { pilote_id: piloteId, motif }),
  validationsEnAttente: (id) => apiRequest(`/admin/fiches/${id}/validations`).then((result) => result.data),
  partagerValidation: (validationId, valideurId, motif) => send(`/admin/validations/${validationId}/partages`, 'POST', { valideur_id: valideurId, motif }).then((result) => result.data),
  retirerPartageValidation: (validationId, userId) => send(`/admin/validations/${validationId}/partages/${userId}`, 'DELETE').then((result) => result.data),
  partagerFiche: (id, userId, motif) => send(`/admin/fiches/${id}/copilotes`, 'POST', { user_id: userId, motif }).then((result) => result.data),
  retirerCopilote: (id, userId) => send(`/admin/fiches/${id}/copilotes/${userId}`, 'DELETE').then((result) => result.data),
  confidentialiteAdmin: (id, confidentialite) => send(`/admin/fiches/${id}`, 'PATCH', { confidentialite }),
  historique: (id) => apiRequest(`/fiches/${id}/historique`).then((result) => result.data),
  piecesJointes: (id) => apiRequest(`/fiches/${id}/pieces-jointes`),
  ajouterPieceJointe: (id, fichier, actionId) => {
    const body = new FormData()
    body.append('fichier', fichier)
    if (actionId) body.append('action_id', actionId)
    return apiRequest(`/fiches/${id}/pieces-jointes`, { method: 'POST', body })
  },
  telechargerPieceJointe: (id) => apiDownload(`/pieces-jointes/${id}/telechargement`),
  commentaires: (id) => apiRequest(`/fiches/${id}/commentaires`).then((result) => result.data),
  commenter: (id, texte, contexte = 'FICHE', objetId = null) => send(`/fiches/${id}/commentaires`, 'POST', { texte, contexte, objet_id: objetId }).then((result) => result.data),
  actionStatut: (actionId, data) => send(`/actions/${actionId}/statut`, 'POST', data).then((result) => result.data),
  modifierAction: (actionId, data) => send(`/actions/${actionId}`, 'PATCH', data).then((result) => result.data),
  ajouterAction: (id, data) => send(`/fiches/${id}/actions`, 'POST', data).then((result) => result.data),
  controle: (controleId, data) => send(`/controles/${controleId}`, 'PATCH', data).then((result) => result.data),
  decision: (validationId, data) => send(`/validations/${validationId}/decision`, 'POST', data).then((result) => result.data),
  decisionGain: (gainId, decision) => send(`/gains/${gainId}/decision`, 'POST', { decision }).then((result) => result.data),
  relancer: (cibleType, cibleId) => send('/relances', 'POST', { cible_type: cibleType, cible_id: cibleId }).then((result) => result.data),
  validations: () => apiRequest('/validations').then((result) => result.data),
}

// Traduit une erreur d'API en messages lisibles : champs (422), manques métier, conflit (409).
export function describeError(error) {
  const data = error?.data ?? {}
  const fieldMessages = data.errors ? Object.values(data.errors).flat() : []
  return {
    message: error?.status === 409 ? `${error.message}` : (error?.message || 'Une erreur est survenue.'),
    manques: [...(data.manques ?? []), ...fieldMessages],
    emplacements: data.emplacements ?? [],
    conflict: error?.status === 409,
  }
}
