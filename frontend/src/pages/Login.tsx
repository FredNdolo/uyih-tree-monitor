export default function Login() {
  const handleGoogleLogin = () => {
    // Hits the backend Google OAuth start
    window.location.href = 'http://localhost:4000/auth/google'
  }

  return (
    <div className="max-w-md mx-auto mt-16 bg-white rounded-xl shadow-md p-8 text-center">
      <h1 className="text-2xl font-bold text-uyih-green mb-2">Sign in</h1>
      <p className="text-slate-600 mb-8">
        Use your Google account to access the Tree Monitor.
      </p>
      <button
        onClick={handleGoogleLogin}
        className="w-full bg-uyih-orange hover:bg-uyih-orange-light text-white font-medium py-3 px-4 rounded-lg"
      >
        Continue with Google
      </button>
    </div>
  )
}