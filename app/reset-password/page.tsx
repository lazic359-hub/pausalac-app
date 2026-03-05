'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  "https://ymiyqhblbqkkycpdnlaq.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltaXlxaGJsYnFra3ljcGRubGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTI0NzUsImV4cCI6MjA4NzYyODQ3NX0.0G7_IGfqFf7HgC-mKy9ehCt--WdnUUP--iPf-tW0Mvk"
)

export default function ResetPasswordPage() {
  const [pass, setPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState('')

  // Ključni deo: hvatanje sesije direktno iz linka
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setInfo('Greška: Sesija nije pronađena ili je link istekao. Pošalji novi mejl.')
      }
    }
    checkSession()
  }, [])

  const handleUpdate = async () => {
    if (pass !== confirmPass) {
      setInfo('Greška: Lozinke se ne podudaraju!')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pass })
    
    if (error) {
      setInfo('Greška: ' + error.message)
    } else {
      setInfo('✅ Uspeh! Lozinka je promenjena. Preusmeravam...')
      setTimeout(() => window.location.href = '/dashboard', 2000)
    }
    setLoading(false)
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'system-ui' }}>
      <div style={{ background: '#111', padding: 30, borderRadius: 16, border: '1px solid #222', width: '100%', maxWidth: 350 }}>
        <h2 style={{ marginBottom: 10, fontSize: 20 }}>Nova lozinka</h2>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>Unesi i potvrdi novu lozinku.</p>
        
        <div style={{ position: 'relative' }}>
          <input 
            type={showPass ? "text" : "password"} 
            placeholder="Nova lozinka" 
            value={pass} 
            onChange={(e) => setPass(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', marginBottom: 12, borderRadius: 10, border: '1px solid #333', background: '#000', color: '#fff', outline: 'none' }}
          />
          <button 
            type="button"
            onClick={() => setShowPass(!showPass)}
            style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#666' }}
          >
            {showPass ? '🔒' : '👁️'}
          </button>
        </div>

        <input 
          type={showPass ? "text" : "password"} 
          placeholder="Potvrdi lozinku" 
          value={confirmPass} 
          onChange={(e) => setConfirmPass(e.target.value)}
          style={{ width: '100%', padding: '12px 16px', marginBottom: 12, borderRadius: 10, border: '1px solid #333', background: '#000', color: '#fff', outline: 'none' }}
        />
        
        <button 
          onClick={handleUpdate} 
          disabled={loading || !pass || pass !== confirmPass}
          style={{ width: '100%', padding: 14, background: '#00c896', color: '#000', fontWeight: 'bold', borderRadius: 10, border: 'none', cursor: 'pointer', opacity: (loading || pass !== confirmPass) ? 0.5 : 1, marginTop: 8 }}
        >
          {loading ? 'Čuvanje...' : 'Sačuvaj lozinku'}
        </button>
        
        {info && (
          <div style={{ marginTop: 20, padding: 12, borderRadius: 8, background: info.includes('Greška') ? '#ff4d4d20' : '#00c89620', color: info.includes('Greška') ? '#ff6b6b' : '#00c896', fontSize: 13, textAlign: 'center' }}>
            {info}
          </div>
        )}
      </div>
    </div>
  )
}