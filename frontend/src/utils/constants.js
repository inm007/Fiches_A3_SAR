// Rôles, étapes et libellés fixes du PRD. Les listes administrables viennent de /referentiels.

export const VALIDATOR_ROLES = [
  'VALIDEUR_PRODUCTION',
  'VALIDEUR_HSE',
  'VALIDEUR_PROCEDE',
  'VALIDEUR_MAINTENANCE',
  'VALIDEUR_INSPECTION',
]

export const BUSINESS_ROLES = ['AGENT', 'PILOTE', ...VALIDATOR_ROLES, 'CONTROLE_GESTION', 'DIRECTION', 'ADMIN_FONCTIONNEL']

export const DECIDING_ROLES = [...VALIDATOR_ROLES, 'CONTROLE_GESTION', 'DIRECTION']

export const ETAPES = {
  OUVERT: { label: 'Ouvert', tone: 'ouvert' },
  EN_COURS: { label: 'En cours', tone: 'encours' },
  EN_VALIDATION_PLAN: { label: 'En validation du plan', tone: 'validation' },
  REALISATION_ACTIONS: { label: 'Réalisation des actions', tone: 'realisation' },
  MESURE_RESULTATS: { label: 'Mesure des résultats', tone: 'mesure' },
  VERIFICATION_MAINTIEN: { label: 'Vérification du maintien', tone: 'maintien' },
  EN_VALIDATION_CLOTURE: { label: 'En validation de clôture', tone: 'validation' },
  EN_ATTENTE: { label: 'En attente', tone: 'attente' },
  CLOTURE: { label: 'Clôturé', tone: 'cloture' },
}

export const PARCOURS = [
  'OUVERT', 'EN_COURS', 'EN_VALIDATION_PLAN', 'REALISATION_ACTIONS',
  'MESURE_RESULTATS', 'VERIFICATION_MAINTIEN', 'EN_VALIDATION_CLOTURE', 'CLOTURE',
]

export const STATUTS_GENERAUX = {
  OUVERT: 'Ouvert',
  EN_COURS: 'En cours',
  EN_ATTENTE: 'En attente',
  CLOTURE: 'Clôturé',
}

export const STATUTS_ACTION = {
  A_FAIRE: { label: 'À faire', tone: 'a-faire' },
  EN_COURS: { label: 'En cours', tone: 'encours' },
  REALISE: { label: 'Réalisée', tone: 'realisee' },
  ANNULE: { label: 'Annulée', tone: 'annulee' },
  BLOQUE: { label: 'Bloquée', tone: 'attente' },
}

export const TRANSITIONS = {
  T2: { label: 'Commencer l’analyse', primary: true },
  T3: { label: 'Soumettre le plan', primary: true },
  T6: { label: 'Terminer les actions', primary: true },
  T7: { label: 'Valider la mesure', primary: true },
  T8: { label: 'Soumettre la clôture', primary: true },
  T11: { label: 'Nouvelle boucle', motif: 'Motif : objectif non atteint, partiellement atteint ou gain non maintenu' },
  T12: { label: 'Mettre en attente', motif: 'Motif du blocage (obligatoire)' },
  T13: { label: 'Lever le blocage' },
}

export const SECTIONS = [
  'Identification', 'Contexte, enjeu et problème', 'Situation actuelle', 'Objectif',
  'Analyse des causes racines', 'Plan de contre-mesures', 'Risques et MOC',
  'Résultats après action', 'Gains économiques', 'Standardisation et pérennisation',
  'Leçons apprises', 'Validation',
]

export const IMPACTS = [
  ['HSE', 'HSE'],
  ['PRODUCTION', 'Production'],
  ['QUALITE', 'Qualité'],
  ['ENERGIE', 'Énergie et environnement'],
  ['SURETE', 'Sûreté et cybersécurité'],
]

export const DOMAINES = [
  ['QHSE', 'QHSE', 'Valideur HSE'],
  ['PROCEDE', 'Procédé', 'Valideur Procédé / Technique'],
  ['FIABILITE', 'Fiabilité', 'Valideur Maintenance'],
  ['INTEGRITE', 'Intégrité', 'Valideur Inspection / Intégrité'],
  ['PRODUCTION', 'Production / Exploitation', 'Valideur Production / Exploitation'],
  ['SURETE_CYBERSECURITE', 'Sûreté / Cybersécurité', 'Valideur Procédé / Technique'],
  ['AUTRES', 'Autres', 'Valideur choisi par le pilote'],
]

export const MOC_STATUTS = [['A_OUVRIR', 'À ouvrir'], ['OUVERT', 'Ouvert'], ['CLOTURE', 'Clôturé']]

export const STATUTS_GAIN = { PROPOSE: 'Proposé', VALIDE: 'Validé', REFUSE: 'Refusé' }

export const STATUTS_SIMPLES = [['A_FAIRE', 'À faire'], ['EN_COURS', 'En cours'], ['REALISE', 'Réalisé']]

export const RUBRIQUES_LECONS = [
  ['A_FONCTIONNE', 'Ce qui a fonctionné'],
  ['N_A_PAS_FONCTIONNE', 'Ce qui n’a pas fonctionné'],
  ['STANDARD_A_REPLIQUER', 'Standard à répliquer'],
  ['RETOUR_EXPERIENCE', 'Retour d’expérience'],
  ['PROJET_SUIVANT', 'Projet suivant'],
]

export const OBJECTIF_ATTEINT = [['OUI', 'Oui'], ['PARTIELLEMENT', 'Partiellement'], ['NON', 'Non']]

export const DECISIONS = { EN_ATTENTE: 'En attente', VALIDE: 'Approuvé', REFUSE: 'Refusé', ANNULE: 'Close' }

export const JALONS = { J30: 'J+30', J60: 'J+60', J90: 'J+90', CORRECTIF: 'Vérification corrective' }
