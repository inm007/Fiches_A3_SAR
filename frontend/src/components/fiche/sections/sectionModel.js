// Brouillon de chaque section : construit depuis la fiche, renvoyé à l'API à l'enregistrement.
// Les champs numériques restent des chaînes dans le formulaire et sont convertis ici.

const toNumber = (value) => (value === '' || value === null || value === undefined ? null : Number(value))
const toInt = (value) => (value === '' || value === null || value === undefined ? null : Math.round(Number(value)))
const toText = (value) => (value === null || value === undefined ? '' : String(value))
const nullable = (value) => (value === '' || value === undefined ? null : value)
const keepId = (row) => (row.id ? { id: row.id } : {})

export const sectionModel = {
  1: {
    toDraft: (fiche) => {
      const identification = fiche.identification
      return {
        ...identification,
        unite_id: toText(identification.unite_id),
        equipement_id: toText(identification.equipement_id),
        sponsor_id: toText(identification.sponsor_id),
        origine_id: toText(identification.origine_id),
        titre: fiche.titre,
      }
    },
    toPayload: (draft) => ({
      titre: draft.titre,
      unite_id: toInt(draft.unite_id),
      equipement_id: toInt(draft.equipement_id),
      numero_avis_sap: nullable(draft.numero_avis_sap),
      numero_ordre_sap: nullable(draft.numero_ordre_sap),
      sponsor_id: toInt(draft.sponsor_id),
      date_lancement: nullable(draft.date_lancement),
      date_cible: nullable(draft.date_cible),
      type_amelioration: nullable(draft.type_amelioration),
      origine_id: toInt(draft.origine_id),
      origine_precision: nullable(draft.origine_precision),
    }),
  },
  2: {
    toDraft: (fiche) => ({
      ...fiche.contexte,
      frequence_id: toText(fiche.contexte.frequence_id),
      impacts: { ...(fiche.contexte.impacts ?? {}) },
      impact_financier_estime: toText(fiche.contexte.impact_financier_estime),
    }),
    toPayload: (draft) => ({
      contexte: nullable(draft.contexte),
      enonce_probleme: draft.enonce_probleme,
      frequence_id: toInt(draft.frequence_id),
      impacts: Object.fromEntries(Object.entries(draft.impacts).filter(([, texte]) => texte?.trim())),
      impact_financier_estime: toInt(draft.impact_financier_estime),
    }),
  },
  3: {
    toDraft: (fiche) => ({
      indicateurs: fiche.indicateurs.map((indicateur) => ({
        ...indicateur,
        reference: toText(indicateur.reference),
        cible: toText(indicateur.cible),
        actuelle: toText(indicateur.actuelle),
        role: indicateur.role ?? 'SUIVI',
      })),
    }),
    toPayload: (draft) => ({
      indicateurs: draft.indicateurs.map((row) => ({
        ...keepId(row),
        libelle: row.libelle,
        unite_mesure: row.unite_mesure,
        sens: row.sens || 'hausse',
        source: nullable(row.source),
        periode: nullable(row.periode),
        reference: toNumber(row.reference),
        cible: toNumber(row.cible),
        actuelle: toNumber(row.actuelle),
        role: row.role || 'SUIVI',
      })),
    }),
  },
  4: {
    // Le rôle des indicateurs (KPI principal, à ne pas dégrader) se choisit en section 3.
    // Le chef qui valide la pertinence est proposé d'après l'organigramme du pilote.
    toDraft: (fiche, options) => ({
      ...fiche.objectif,
      chef_pertinence_id: toText(fiche.objectif.chef_pertinence_id ?? options?.chef_propose),
    }),
    toPayload: (draft) => ({
      objectif_smart: nullable(draft.objectif_smart),
      perimetre: nullable(draft.perimetre),
      resultats_attendus: nullable(draft.resultats_attendus),
      chef_pertinence_id: toInt(draft.chef_pertinence_id),
    }),
  },
  5: {
    toDraft: (fiche) => ({
      methode_analyse: fiche.analyse.methode_analyse ?? '',
      methode_precision: fiche.analyse.methode_precision ?? '',
      causes: fiche.analyse.causes.map((cause) => ({ ...cause, niveau: toText(cause.niveau) })),
    }),
    toPayload: (draft) => ({
      methode_analyse: nullable(draft.methode_analyse),
      methode_precision: nullable(draft.methode_precision),
      causes: draft.causes.map((row) => ({
        ...keepId(row),
        categorie: row.categorie,
        libelle: row.libelle,
        niveau: toInt(row.niveau) ?? 1,
        racine: Boolean(row.racine),
        preuve: nullable(row.preuve),
      })),
    }),
  },
  6: {
    toDraft: (fiche) => ({
      actions: fiche.actions.filter((action) => !action.action_origine_id).map((action) => ({
        ...action,
        cause_id: toText(action.cause_id),
        responsable_id: toText(action.responsable_id),
        risque_id: toText(action.risque_id),
        cout_estime: toText(action.cout_estime),
        critere_efficacite: action.critere_efficacite ?? '',
      })),
    }),
    toPayload: (draft) => ({
      actions: draft.actions.map((row) => ({
        ...keepId(row),
        cause_id: toInt(row.cause_id),
        description: row.description,
        type_action: row.type_action,
        responsable_id: toInt(row.responsable_id),
        echeance: nullable(row.echeance),
        cout_estime: toInt(row.cout_estime) ?? 0,
        risque_id: toInt(row.risque_id),
        critere_efficacite: nullable(row.critere_efficacite),
      })),
    }),
  },
  7: {
    toDraft: (fiche) => ({
      domaines: fiche.domaines.map((domaine) => ({ domaine: domaine.domaine, valideur_role_code: domaine.valideur_role_code ?? '', precision: domaine.precision ?? '' })),
      risques: fiche.risques.map((risque) => ({ ...risque, responsable_id: toText(risque.responsable_id) })),
    }),
    toPayload: (draft) => ({
      domaines: draft.domaines.map((domaine) => ({
        domaine: domaine.domaine,
        valideur_role_code: domaine.domaine === 'AUTRES' ? nullable(domaine.valideur_role_code) : null,
        precision: domaine.domaine === 'AUTRES' ? nullable(domaine.precision) : null,
      })),
      risques: draft.risques.map((row) => ({
        ...keepId(row),
        domaine: row.domaine,
        description: row.description,
        moc_requis: Boolean(row.moc_requis),
        moc_reference: nullable(row.moc_reference),
        moc_statut: nullable(row.moc_statut),
        moc_preuve: nullable(row.moc_preuve),
        mesure_maitrise: nullable(row.mesure_maitrise),
        responsable_id: toInt(row.responsable_id),
      })),
    }),
  },
  8: {
    toDraft: (fiche) => ({
      objectif_atteint: fiche.resultats.objectif_atteint ?? '',
      ecart_objectif: fiche.resultats.ecart_objectif ?? '',
      mesures: fiche.indicateurs.map((indicateur) => ({
        indicateur_id: indicateur.id,
        valeur: toText(indicateur.apres),
        date_mesure: indicateur.date_mesure_apres ?? '',
        periode_verification: indicateur.periode_verification ?? '',
        commentaire: indicateur.commentaire_apres ?? '',
      })),
      maintien: (fiche.maintien ?? []).map((jalon) => ({
        jalon: jalon.jalon,
        valeur: toText(jalon.valeur),
        date_mesure: jalon.date_mesure ?? '',
        commentaire: jalon.commentaire ?? '',
      })),
    }),
    toPayload: (draft) => ({
      objectif_atteint: nullable(draft.objectif_atteint),
      ecart_objectif: nullable(draft.ecart_objectif),
      mesures: draft.mesures.map((mesure) => ({
        indicateur_id: mesure.indicateur_id,
        valeur: toNumber(mesure.valeur),
        date_mesure: nullable(mesure.date_mesure),
        periode_verification: nullable(mesure.periode_verification),
        commentaire: nullable(mesure.commentaire),
      })),
      maintien: draft.maintien
        .filter((jalon) => jalon.valeur !== '')
        .map((jalon) => ({
          jalon: jalon.jalon,
          valeur: toNumber(jalon.valeur),
          date_mesure: nullable(jalon.date_mesure),
          commentaire: nullable(jalon.commentaire),
        })),
    }),
  },
  9: {
    toDraft: (fiche) => ({
      gains: fiche.gains.lignes.map((gain) => ({ ...gain, montant_annuel: toText(gain.montant_annuel) })),
      cout_mise_en_oeuvre_b: toText(fiche.gains.cout_mise_en_oeuvre_b || ''),
      gain_net_annuel: toText(fiche.gains.gain_net_annuel),
      payback_mois: toText(fiche.gains.payback_mois),
      sans_gain_chiffre: fiche.gains.sans_gain_chiffre,
    }),
    toPayload: (draft) => ({
      gains: draft.gains.map((row) => ({
        ...keepId(row),
        categorie: row.categorie,
        hypothese_calcul: row.hypothese_calcul,
        montant_annuel: toInt(row.montant_annuel),
      })),
      cout_mise_en_oeuvre_b: toInt(draft.cout_mise_en_oeuvre_b) ?? 0,
      gain_net_annuel: toInt(draft.gain_net_annuel),
      payback_mois: toNumber(draft.payback_mois),
      sans_gain_chiffre: Boolean(draft.sans_gain_chiffre),
    }),
  },
  10: {
    toDraft: (fiche) => ({
      perennisation: fiche.perennisation.map((ligne) => ({ ...ligne, responsable_id: toText(ligne.responsable_id), date: ligne.date ?? '' })),
    }),
    toPayload: (draft) => ({
      perennisation: draft.perennisation.map((row) => ({
        ...keepId(row),
        type: row.type,
        responsable_id: toInt(row.responsable_id),
        date: nullable(row.date),
        statut: row.statut || 'A_FAIRE',
        preuve: nullable(row.preuve),
      })),
    }),
  },
  11: {
    toDraft: (fiche) => ({ lecons: { ...(fiche.lecons ?? {}) } }),
    toPayload: (draft) => ({ lecons: draft.lecons }),
  },
  12: {
    toDraft: () => ({}),
    toPayload: () => ({}),
  },
}
