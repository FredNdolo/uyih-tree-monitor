import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

export default function AuthCallback() {
  const [params] = useSearchParams()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setError('No token received')
      return
    }

    // Fetch full user profile
    api<{ user: any }>('/auth/me', {}, token)
      .then((data) => {
        login(token, data.user)
        navigate('/dashboard', { replace: true })
      })
      .catch((err) => {
        // Fallback if /auth/me fails
        login(token, { id: '', email: '', role: 'donor' })
        navigate('/dashboard', { replace: true })
        console.error(err)
      })
  }, [params, login, navigate])

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>
  }

  return (
    <div className="p-8 text-center">
      <p>Completing sign-in...</p>
    </div>
  )
}