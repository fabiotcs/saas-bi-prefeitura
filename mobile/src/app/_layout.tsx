import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { hasValidToken } from '../services/secure-storage'
import { router } from 'expo-router'

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const valid = await hasValidToken()
        if (valid) {
          router.replace('/(app)')
        } else {
          router.replace('/(auth)/login')
        }
      } catch {
        router.replace('/(auth)/login')
      } finally {
        setIsReady(true)
      }
    }
    checkAuth()
  }, [])

  if (!isReady) return null

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
