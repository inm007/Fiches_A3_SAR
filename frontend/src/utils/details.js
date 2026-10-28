/**
 * Lignes de la fenêtre « Voir » à partir des colonnes d'un tableau : toutes les colonnes,
 * y compris celles masquées du tableau (`detailOnly`), avec le même rendu que dans la liste.
 */
export function detailItems(columns, row, context) {
  return columns
    .filter((column) => !column.hideInDetails)
    .map((column) => ({
      label: column.detailLabel ?? column.label,
      value: column.detailValue
        ? column.detailValue(row, context)
        : column.render
          ? column.render(row, context)
          : column.value
            ? column.value(row, context)
            : row[column.key],
    }))
}
