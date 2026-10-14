import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import './ProfileSwitcher.css'

function ProfileSwitcher() {
  const { profiles, activeProfile, switchProfile } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const hasMultipleProfiles = profiles.length > 1

  async function handleChange(event) {
    const id = Number(event.target.value)
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
    <label className="profile-switcher">
      <span className="profile-switcher__label">Profil actif</span>
      <select
        aria-label="Profil actif"
        onChange={handleChange}
        value={activeProfile?.affectation_id || ''}
      >
        {profiles.map((profile) => (
          <option key={profile.affectation_id} value={profile.affectation_id}>{profile.label}</option>
        ))}
      </select>
      {error && <span className="profile-switcher__error" role="alert">{error}</span>}
    </label>
  )
}

export default ProfileSwitcher
