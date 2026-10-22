// Rôles, étapes et libellés fixes du PRD. Les listes administrables viennent de /referentiels.

export const VALIDATOR_ROLES = [
  'VALIDEUR_PRODUCTION',
  'VALIDEUR_HSE',
  'VALIDEUR_PROCEDE',
  'VALIDEUR_DSI',
  'VALIDEUR_MAINTENANCE',
  'VALIDEUR_INSPECTION',
]

export const BUSINESS_ROLES = ['AGENT', 'PILOTE', 'CHEF_DEPARTEMENT', ...VALIDATOR_ROLES, 'CONTROLE_GESTION', 'DIRECTION', 'ADMIN_FONCTIONNEL']

export const DECIDING_ROLES = ['CHEF_DEPARTEMENT', ...VALIDATOR_ROLES, 'CONTROLE_GESTION', 'DIRECTION']

export const ETAPES = {
  OUVERT: { label: 'Ouvert', tone: 'ouvert' },
  EN_VALIDATION_PERTINENCE: { label: 'En validation de la pertinence', tone: 'validation' },
  EN_COURS: { label: 'En cours', tone: 'encours' },
  EN_VALIDATION_PLAN: { label: 'En validation du plan', tone: 'validation' },
  REALISATION_ACTIONS: { label: 'Réalisation des actions', tone: 'realisation' },
  MESURE_RESULTATS: { label: 'Mesure des résultats', tone: 'mesure' },
  VERIFICATION_MAINTIEN: { label: 'Vérification du maintien', tone: 'maintien' },
  EN_VALIDATION_CLOTURE: { label: 'En validation de clôture', tone: 'validation' },
  EN_ATTENTE: { label: 'En attente', tone: 'attente' },
  CLOTURE: { label: 'Clôturé', tone: 'cloture' },
  CLASSE_SANS_SUITE: { label: 'Classée sans suite', tone: 'neutral' },
}

export const PARCOURS = [
  'OUVERT', 'EN_VALIDATION_PERTINENCE', 'EN_COURS', 'EN_VALIDATION_PLAN', 'REALISATION_ACTIONS',
  'MESURE_RESULTATS', 'VERIFICATION_MAINTIEN', 'EN_VALIDATION_CLOTURE', 'CLOTURE',
]

export const STATUTS_GENERAUX = {
  OUVERT: 'Ouvert',
  EN_COURS: 'En cours',
  EN_ATTENTE: 'En attente',
  CLOTURE: 'Clôturé',
  CLASSE: 'Classée sans suite',
}

export const STATUTS_ACTION = {
  A_FAIRE: { label: 'À faire', tone: 'a-faire' },
  EN_COURS: { label: 'En cours', tone: 'encours' },
  REALISE: { label: 'Réalisée', tone: 'realisee' },
  ANNULE: { label: 'Annulée', tone: 'annulee' },
  BLOQUE: { label: 'Bloquée', tone: 'attente' },
}

export const TRANSITIONS = {
  T0: { label: 'Soumettre au chef de département', primary: true },
  T2: { label: 'Commencer l’analyse', primary: true },
  T3: { label: 'Soumettre le plan', primary: true },
  T6: { label: 'Terminer les actions', primary: true },
  T7: { label: 'Passer à la vérification du maintien', primary: true },
  T8: { label: 'Soumettre la clôture', primary: true },
  T11: { label: 'Nouvelle boucle', motif: 'Motif : objectif non atteint, partiellement atteint ou gain non maintenu' },
  T12: { label: 'Mettre en attente', motif: 'Motif du blocage (obligatoire)' },
  T13: { label: 'Lever le blocage' },
  T14: { label: 'Classer sans suite', motif: 'Motif du classement (doublon, hors sujet, déjà traité…)', danger: true },
}

// Ce que débloque chaque transition, affiché dans le panneau « Prochaine étape ».
export const PROCHAINES_ETAPES = {
  T0: { titre: 'Soumettre au chef de département', texte: 'Renseignez les sections 1 à 4 (identification, contexte, situation actuelle, objectif) : votre chef de département jugera la pertinence de l’idée, puis la fiche partira au pilote.' },
  T2: { titre: 'Commencer l’analyse', texte: 'Vous prenez la fiche en main : les sections 1 à 7 s’ouvrent à la saisie, pour vous et votre équipe.' },
  T3: { titre: 'Soumettre le plan', texte: 'Le plan part en même temps chez les directeurs des domaines cochés : tous doivent l’approuver.' },
  T6: { titre: 'Terminer la réalisation', texte: 'Toutes les actions sont réalisées ou annulées : vous pourrez mesurer les résultats.' },
  T7: { titre: 'Passer à la vérification du maintien', texte: 'La mesure Après est faite et l’objectif atteint : le maintien se vérifie à J+30, J+60 et J+90.' },
  T8: { titre: 'Soumettre la clôture', texte: 'Le Contrôle de gestion (si gains) puis la Direction valident la clôture.' },
}

export const ROLES_INDICATEUR = [
  ['PRINCIPAL', 'KPI principal'],
  ['A_NE_PAS_DEGRADER', 'À ne pas dégrader'],
  ['SUIVI', 'Suivi'],
]

export const MAINTIEN_JALONS = [['J30', 'J+30'], ['J60', 'J+60'], ['J90', 'J+90']]

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

// Les directeurs sollicités pour chaque domaine viennent du serveur (écran Circuit de validation).
export const DOMAINES = [
  ['QHSE', 'QHSE'],
  ['PROCEDE', 'Procédé'],
  ['FIABILITE', 'Fiabilité'],
  ['INTEGRITE', 'Intégrité'],
  ['PRODUCTION', 'Production / Exploitation'],
  ['SURETE_CYBERSECURITE', 'Sûreté / Cybersécurité'],
  ['AUTRES', 'Autres'],
]

export const TYPES_ENTITE = [['DIRECTION', 'Direction'], ['DEPARTEMENT', 'Département'], ['SERVICE', 'Service']]

export const PORTES = { 0: 'Pertinence', 1: 'Plan', 2: 'Clôture' }

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
