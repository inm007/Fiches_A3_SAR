import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import { normalizeSearchText } from '../../utils/listTools.js'
import './Dropdown.css'

const SEARCH_THRESHOLD = 9

/**
 * Liste déroulante de l'application (remplace le <select> natif, dont la liste suit le système).
 * Bouton + liste en surcouche, utilisable entièrement au clavier (flèches, Origine/Fin, Entrée, Échap,
 * saisie des premières lettres). Une recherche apparaît au-delà de 8 choix.
 *
 * @param {object} props
 * @param {string|number} props.value
 * @param {(value: string) => void} props.onChange Reçoit la valeur choisie (chaîne ; '' pour l'option vide).
 * @param {Array<[string|number, string]>} props.options Paires [valeur, libellé].
 * @param {string|null} [props.placeholder] Libellé de l'option vide ; `null` pour ne pas en proposer.
 * @param {string} [props.prefix] Libellé affiché devant la valeur (filtres : « Étape : Toutes »).
 * @param {'field'|'filter'|'small'} [props.variant='field']
 * @param {string} [props.id]
 * @param {boolean} [props.disabled]
 */
function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Choisir…',
  prefix,
  variant = 'field',
  id,
  disabled = false,
  invalid = false,
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-required': ariaRequired,
  ...props
}) {
  const autoId = useId()
  const buttonId = id ?? `${autoId}-button`
  const listId = `${autoId}-list`
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const searchRef = useRef(null)
  const typeahead = useRef({ text: '', at: 0 })
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState(null)

  const items = useMemo(() => [
    ...(placeholder !== null ? [['', placeholder]] : []),
    ...options.map(([optionValue, optionLabel]) => [String(optionValue), optionLabel]),
  ], [options, placeholder])
  const searchable = options.length >= SEARCH_THRESHOLD
  const visible = useMemo(() => (query
    ? items.filter(([, label]) => normalizeSearchText(label).includes(normalizeSearchText(query)))
    : items), [items, query])
  const current = items.find(([optionValue]) => optionValue === String(value ?? ''))
  const isEmpty = !current || current[0] === ''
  const display = current ? current[1] : (placeholder ?? '')

  function place() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const below = window.innerHeight - rect.bottom
    const up = below < 260 && rect.top > below
    const width = Math.max(rect.width, variant === 'field' ? rect.width : 220)
    setPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
      ...(up ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
      maxHeight: Math.max(160, Math.min(320, (up ? rect.top : below) - 24)),
    })
  }

  function openList() {
    if (disabled) return
    const selected = Math.max(0, items.findIndex(([optionValue]) => optionValue === String(value ?? '')))
    setQuery('')
    setActive(selected)
    place()
    setOpen(true)
  }

  function close(focusButton = true) {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }

  function choose(optionValue) {
    if (optionValue !== String(value ?? '')) onChange?.(optionValue)
    close()
  }

  useLayoutEffect(() => {
    if (!open) return
    if (searchable) searchRef.current?.focus()
    else listRef.current?.focus()
  }, [open, searchable])

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (!buttonRef.current?.contains(event.target) && !listRef.current?.parentElement?.contains(event.target)) close(false)
    }
    const onMove = () => place()
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  })

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function onListKey(event) {
    const last = visible.length - 1
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => Math.min(last, index + 1)) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(0, index - 1)) }
    else if (event.key === 'Home') { event.preventDefault(); setActive(0) }
    else if (event.key === 'End') { event.preventDefault(); setActive(last) }
    else if (event.key === 'Enter' || (event.key === ' ' && !searchable)) {
      event.preventDefault()
      if (visible[active]) choose(visible[active][0])
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      // Échap ne doit fermer que la liste, pas la fenêtre modale qui la contient
      event.preventDefault()
      event.stopPropagation()
      close()
    }
    else if (!searchable && event.key.length === 1) {
      const now = Date.now()
      typeahead.current = { text: (now - typeahead.current.at < 600 ? typeahead.current.text : '') + event.key.toLowerCase(), at: now }
      const match = visible.findIndex(([, label]) => normalizeSearchText(label).startsWith(normalizeSearchText(typeahead.current.text)))
      if (match >= 0) setActive(match)
    }
  }

  function onButtonKey(event) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openList()
    }
  }

  return (
    <>
      <button
        aria-controls={open ? listId : undefined}
        aria-describedby={ariaDescribedBy}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-required={ariaRequired}
        className={['sar-dropdown', `sar-dropdown--${variant}`, isEmpty ? 'is-empty' : 'has-value', open ? 'is-open' : '', className].filter(Boolean).join(' ')}
        disabled={disabled}
        id={buttonId}
        ref={buttonRef}
        role="combobox"
        type="button"
        onClick={() => (open ? close() : openList())}
        onKeyDown={onButtonKey}
        {...props}
      >
        <span className="sar-dropdown__value">
          {prefix && <span className="sar-dropdown__prefix">{prefix}{!isEmpty || variant !== 'filter' ? ' :' : ''}</span>}
          {(variant !== 'filter' || !isEmpty) && <span className="sar-dropdown__text">{display}</span>}
        </span>
        <Icon className="sar-dropdown__chevron" name="chevron-down" size={16} />
      </button>
      {open && position && createPortal(
        <div className="sar-dropdown__popover" style={position}>
          {searchable && (
            <div className="sar-dropdown__search">
              <Icon name="search" size={16} />
              <input
                aria-activedescendant={visible[active] ? `${listId}-${active}` : undefined}
                aria-controls={listId}
                aria-label="Filtrer la liste"
                placeholder="Rechercher…"
                ref={searchRef}
                value={query}
                onChange={(event) => { setQuery(event.target.value); setActive(0) }}
                onKeyDown={onListKey}
              />
            </div>
          )}
          <ul
            aria-activedescendant={visible[active] ? `${listId}-${active}` : undefined}
            aria-labelledby={ariaLabelledBy ?? buttonId}
            className="sar-dropdown__list"
            id={listId}
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            onKeyDown={onListKey}
          >
            {visible.length === 0 && <li className="sar-dropdown__none">Aucun résultat</li>}
            {visible.map(([optionValue, optionLabel], index) => {
              const selected = optionValue === String(value ?? '')
              return (
                <li
                  aria-selected={selected}
                  className={[index === active ? 'is-active' : '', optionValue === '' ? 'is-placeholder' : ''].filter(Boolean).join(' ') || undefined}
                  data-index={index}
                  id={`${listId}-${index}`}
                  key={optionValue}
                  role="option"
                  onClick={() => choose(optionValue)}
                  onMouseMove={() => setActive(index)}
                >
                  <span>{optionLabel}</span>
                  {selected && <Icon name="check" size={16} />}
                </li>
              )
            })}
          </ul>
        </div>,
        document.body,
      )}
    </>
  )
}

export default Dropdown
