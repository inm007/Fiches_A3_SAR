import { createContext } from 'react'
import { ficheService } from '../../services/ficheService.js'

// Formats acceptés par le serveur (PieceJointeService::MIME_EXTENSIONS) : documents et photos.
export const FICHIERS_ACCEPTES = '.pdf,.png,.jpg,.jpeg,.docx,.xlsx,.pptx'

/**
 * Pièces jointes de la fiche ouverte, chargées une fois par FicheDetail et partagées avec les
 * sections : chaque preuve (cause, MOC, pérennisation…) y retrouve ses fichiers.
 * { pieces: [], recharger: () => Promise }
 */
export const PiecesJointesContext = createContext({ pieces: [], recharger: async () => {} })

export async function telechargerPiece(piece) {
  const blob = await ficheService.telechargerPieceJointe(piece.id)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = piece.nom
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
