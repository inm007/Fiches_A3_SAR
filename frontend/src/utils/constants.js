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
  OUVERT: { label: 'Ouvert' },
  EN_VALIDATION_PERTINENCE: { label: 'En validation de la pertinence' },
  EN_COURS: { label: 'En cours' },
  EN_VALIDATION_PLAN: { label: 'En validation du plan' },
  REALISATION_ACTIONS: { label: 'Réalisation des actions' },
  MESURE_RESULTATS: { label: 'Mesure des résultats' },
  VERIFICATION_MAINTIEN: { label: 'Vérification du maintien' },
  EN_VALIDATION_CLOTURE: { label: 'En validation de clôture' },
  EN_ATTENTE: { label: 'En attente' },
  CLOTURE: { label: 'Clôturé' },
  CLASSE_SANS_SUITE: { label: 'Classée sans suite' },
}

export const PARCOURS = [
  'OUVERT', 'EN_VALIDATION_PERTINENCE', 'EN_COURS', 'EN_VALIDATION_PLAN', 'REALISATION_ACTIONS',
  'MESURE_RESULTATS', 'VERIFICATION_MAINTIEN', 'EN_VALIDATION_CLOTURE', 'CLOTURE',
]

export const STATUTS_ACTION = {
  A_FAIRE: { label: 'À faire', tone: 'a-faire' },
  EN_COURS: { label: 'En cours', tone: 'encours' },
  REALISE: { label: 'Réalisée', tone: 'realisee' },
  ANNULE: { label: 'Annulée', tone: 'annulee' },
  BLOQUE: { label: 'Bloquée', tone: 'attente' },
}

export const TRANSITIONS = {
  T0: { label: 'Soumettre au chef de département', primary: true, enCours: 'Envoi de la fiche au chef de département…' },
  T3: { label: 'Soumettre le plan', primary: true, enCours: 'Soumission du plan aux directeurs…' },
  T6: { label: 'Terminer les actions', primary: true, enCours: 'Fin de la réalisation des actions…' },
  T7: { label: 'Passer à la vérification du maintien', primary: true, enCours: 'Passage à la vérification du maintien…' },
  T8: { label: 'Soumettre la clôture', primary: true, enCours: 'Soumission de la clôture…' },
  T11: { label: 'Nouvelle boucle', motif: 'Motif : objectif non atteint, partiellement atteint ou gain non maintenu', enCours: 'Lancement d’une nouvelle boucle…' },
  T12: { label: 'Mettre en attente', motif: 'Motif du blocage (obligatoire)', enCours: 'Mise en attente de la fiche…' },
  T13: { label: 'Lever le blocage', enCours: 'Levée du blocage…' },
  T14: { label: 'Classer sans suite', motif: 'Motif du classement (doublon, hors sujet, déjà traité…)', danger: true, enCours: 'Classement sans suite…' },
}

// Ce que débloque chaque transition, affiché dans le panneau « Prochaine étape ».
export const PROCHAINES_ETAPES = {
  T0: { titre: 'Soumettre au chef de département', texte: 'Renseignez les sections 1 à 4 (identification et sponsor, contexte, situation actuelle, objectif) puis choisissez en section 4 le chef qui juge la pertinence et les membres de votre équipe. Une fois la pertinence validée, l’équipe et vous poursuivez l’analyse.' },
  T3: { titre: 'Soumettre le plan', texte: 'Le plan part en même temps chez les directeurs des domaines cochés : tous doivent l’approuver.' },
  T6: { titre: 'Terminer la réalisation', texte: 'Toutes les actions sont réalisées ou annulées : vous pourrez mesurer les résultats.' },
  T7: { titre: 'Passer à la vérification du maintien', texte: 'La mesure Après est faite et l’objectif atteint : le maintien se vérifie à J+30, J+60 et J+90.' },
  T8: { titre: 'Soumettre la clôture', texte: 'Le Contrôle de gestion (si gains) puis le directeur sponsor valident la clôture.' },
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

// Les 12 sections se lisent en quatre temps ; chaque temps a sa couleur (theme/colors.css, --phase-*).
export const PHASES_SECTIONS = [
  { code: 'probleme', titre: 'Poser le problème', sections: [1, 2, 3, 4] },
  { code: 'analyse', titre: 'Analyser et agir', sections: [5, 6, 7] },
  { code: 'resultats', titre: 'Mesurer les résultats', sections: [8, 9] },
  { code: 'perennite', titre: 'Pérenniser et valider', sections: [10, 11, 12] },
]

export const phaseDeSection = (numero) => PHASES_SECTIONS.find((phase) => phase.sections.includes(numero))

// À quoi sert chaque section, en une phrase, sous son titre.
export const SECTIONS_BUT = [
  'Qui, quoi, où : la carte d’identité de la fiche.',
  'Pourquoi ce sujet, et quel est le problème, chiffré.',
  'Les indicateurs qui mesurent le problème aujourd’hui.',
  'Le but à atteindre, le chef qui valide la pertinence et l’équipe.',
  'Remonter jusqu’à la cause racine, preuves à l’appui.',
  'Une action par cause, avec un responsable et une échéance.',
  'Les risques, les MOC et les directeurs qui valident le plan.',
  'Mesurer après les actions, puis vérifier à J+30, J+60 et J+90.',
  'Ce que l’amélioration rapporte, en FCFA par an.',
  'Ce qui fera durer le résultat, preuves à l’appui.',
  'Ce qu’il faut retenir et partager avec les autres unités.',
  'Les décisions des trois portes, et l’impression de la fiche.',
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

// Objet de chaque porte de validation, tel qu'il suit « Porte N : ».
export const PORTES = { 0: 'pertinence de la fiche', 1: 'plan d’actions', 2: 'clôture' }

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
