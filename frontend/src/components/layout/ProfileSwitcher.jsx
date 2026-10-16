import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import Dropdown from '../ui/Dropdown.jsx'
import './ProfileSwitcher.css'

function ProfileSwitcher() {
  const { profiles, activeProfile, switchProfile } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const hasMultipleProfiles = profiles.length > 1

  async function handleChange(value) {
    const id = Number(value)
    if (!id || id === activeProfile?.affectation_id) return

    setError('')
    try {
      const redirectTo = await switchProfile(id)
      navigate(redirectTo, { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Impossible de changer de profil.')
    }
  }

  if (!hasMultipleProfiles) {
    return (
      <div aria-label={`Profil actif : ${activeProfile?.label || activeProfile?.role || ''}`} className="profile-switcher profile-switcher--single">
        <span className="profile-switcher__label">Profil actif</span>
        <span className="profile-switcher__current">{activeProfile?.label || activeProfile?.role}</span>
      </div>
    )
  }

  return (
    <div className="profile-switcher">
      <span className="profile-switcher__label">Profil actif</span>
      <Dropdown
        aria-label="Profil actif"
        className="profile-switcher__dropdown"
        options={profiles.map((profile) => [profile.affectation_id, profile.label])}
        placeholder={null}
        value={activeProfile?.affectation_id || ''}
        variant="small"
        onChange={handleChange}
      />
      {error && <span className="profile-switcher__error" role="alert">{error}</span>}
    </div>
  )
}

export default ProfileSwitcher
