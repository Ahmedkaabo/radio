'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Music, Lock, Shield, Users } from 'lucide-react'
import { RadioCafeService } from '@/lib/radio-cafe-service'

export default function LoginPage() {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Authenticate user
      const user = await RadioCafeService.authenticateUser(passcode)

      if (user) {
        localStorage.setItem('userRole', user.role)
        router.push(user.role === 'admin' ? '/admin' : '/cafe')
      } else {
        setError('Invalid passcode. Please try again.')
      }
    } catch {
      setError('Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Music className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Radio Cafe</h1>
          <p className="text-gray-600 mt-2">Enter your access code to continue</p>
        </div>

        {/* Login Form */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-xl text-center flex items-center justify-center gap-2">
              <Lock className="h-5 w-5" />
              Access Control
            </CardTitle>
            <CardDescription className="text-center">
              Choose your role to access the system
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="text-center text-lg tracking-widest"
                  disabled={loading}
                />
              </div>
              
              {error && (
                <div className="text-red-600 text-sm text-center p-3 bg-red-50 rounded-lg">
                  {error}
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-3"
                disabled={loading || !passcode.trim()}
              >
                {loading ? 'Authenticating...' : 'Enter System'}
              </Button>
            </form>
            
            {/* Role Information */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <Shield className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <h3 className="font-semibold text-orange-900">Admin</h3>
                <p className="text-xs text-orange-700">Manage Playlist</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-green-900">Cafe</h3>
                <p className="text-xs text-green-700">Music Player</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Demo Info */}
        <Card className="bg-blue-50/90 backdrop-blur-sm shadow-lg border-0">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold text-blue-900 mb-2">Demo Credentials</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Admin:</strong> 1234</p>
                <p><strong>Cafe:</strong> 5678</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}