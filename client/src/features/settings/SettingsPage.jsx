import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react'
import { stockroomApi, dataMode } from '../../services/api'

export default function SettingsPage({theme,toggleTheme,user,onProfileSaved,canAdmin=false}) {
  const [name,setName]=useState(user?.name||'Vittal')
  const [saving,setSaving]=useState(false)
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  useEffect(()=>setName(user?.name||'Vittal'),[user?.name])
  async function saveProfile(event){event.preventDefault();setError('');setNotice('');setSaving(true);try{const result=await stockroomApi.auth.updateProfile({name:name.trim()});onProfileSaved?.(result.name);setNotice('Profile changes saved.')}catch(requestError){setError(requestError.message||'Profile could not be saved.')}finally{setSaving(false)}}
  return <><div className="page-heading"><div><div className="eyebrow">PREFERENCES</div><h1>Settings</h1><p>Personalize your Stockroom workspace.</p></div></div>
    <section className="panel settings-panel"><div><div className="settings-icon"><Sun size={17}/></div><div><strong>Appearance</strong><p>Choose the theme that feels right for you.</p></div></div><button className="theme-choice" onClick={toggleTheme}>{theme==='light'?<Sun size={16}/>:<Moon size={16}/>} {theme==='light'?'Light mode':'Dark mode'} <ChevronDown size={14}/></button></section>
    <section className="panel profile-settings"><div className="settings-panel-heading"><span className="settings-icon"><UserRound size={17}/></span><div><strong>Your profile</strong><p>Update your display name. Email and sign-in credentials are managed securely.</p></div></div><form className="profile-form" onSubmit={saveProfile}><label>Display name<input name="name" value={name} onChange={event=>setName(event.target.value)} minLength="1" maxLength="120" required/></label><label>Email address<input value={user?.email||''} readOnly aria-readonly="true"/><small>Email cannot be changed from this profile form.</small></label>{error&&<p className="data-error" role="alert">{error}</p>}{notice&&<p className="profile-success" role="status">{notice}</p>}<button className="button button-primary" disabled={saving||!name.trim()}>{saving?'Saving…':'Save profile'}</button></form></section>
    {canAdmin&&<section className="panel settings-panel"><div><div className="settings-icon"><ShieldCheck size={17}/></div><div><strong>Roles and access</strong><p>Role assignments are managed for workspace members.</p></div></div><Link className="button button-secondary" to="/team">Manage team access</Link></section>}
    <footer className="page-footer"><span>{dataMode==='sample'?'Sample workspace profile · Changes last for this sample session':'Workspace profile · Email and credentials are protected'}</span></footer>
  </>
}
