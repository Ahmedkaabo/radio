'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface TestResults {
  error?: string
  details?: string
  result?: {
    url: string
    success: boolean
    error?: string
    details?: {
      title: string
      duration: string
      formatsCount: number
    }
  }
  recommendation?: string
}

export default function TestPage() {
  const [url, setUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TestResults | null>(null)

  const testYouTubeAccess = async () => {
    setLoading(true)
    setResults(null)

    try {
      const response = await fetch('/api/test-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      setResults({ 
        error: 'Test request failed', 
        details: String(error) 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">YouTube Access Tester (Simplified)</h1>
        
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test YouTube URL Access</h2>
          
          <div className="flex gap-4 mb-4">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter YouTube URL..."
              className="flex-1"
            />
            <Button 
              onClick={testYouTubeAccess}
              disabled={loading || !url}
            >
              {loading ? 'Testing...' : 'Test Access'}
            </Button>
          </div>
          
          <div className="text-sm text-gray-600 mb-4">
            <p><strong>Test URLs:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Rick Roll: https://www.youtube.com/watch?v=dQw4w9WgXcQ</li>
              <li>Me at the zoo: https://www.youtube.com/watch?v=jNQXAC9IVRw</li>
              <li>Short URL: https://youtu.be/dQw4w9WgXcQ</li>
            </ul>
          </div>
        </Card>

        {results && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Test Results</h3>
            
            {results.error ? (
              <div className="bg-red-100 border border-red-300 rounded p-4">
                <h4 className="font-semibold text-red-800">Error</h4>
                <p className="text-red-700">{results.error}</p>
                {results.details && (
                  <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-x-auto">
                    {results.details}
                  </pre>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">URL Tested:</h4>
                  <p className="text-sm text-gray-600">{results.result?.url}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Recommendation:</h4>
                  <p className={`text-sm ${
                    results.recommendation?.includes('works') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {results.recommendation}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">@distube/ytdl-core Result</h4>
                  <div className={`border rounded p-3 ${
                    results.result?.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                  }`}>
                    <p className="text-sm">
                      <strong>Status:</strong> {results.result?.success ? '✅ Success' : '❌ Failed'}
                    </p>
                    {results.result?.error && (
                      <p className="text-xs text-red-600 mt-1">
                        <strong>Error:</strong> {results.result.error}
                      </p>
                    )}
                    {results.result?.details && (
                      <div className="text-xs mt-2">
                        <p><strong>Title:</strong> {results.result.details.title}</p>
                        <p><strong>Duration:</strong> {results.result.details.duration}s</p>
                        <p><strong>Formats:</strong> {results.result.details.formatsCount}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}