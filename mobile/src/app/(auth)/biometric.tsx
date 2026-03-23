import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera'
import * as LocalAuthentication from 'expo-local-authentication'
import { router, useLocalSearchParams } from 'expo-router'
import { verifyBiometric } from '../../services/auth.service'

export default function BiometricScreen() {
  const { challengeToken } = useLocalSearchParams<{ challengeToken: string }>()
  const [permission, requestPermission] = useCameraPermissions()
  const [loading, setLoading] = useState(false)
  const [hasFaceID, setHasFaceID] = useState(false)
  const cameraRef = useRef<CameraView>(null)

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then(setHasFaceID)
  }, [])

  async function handleCapture() {
    if (!cameraRef.current) return
    setLoading(true)
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 })
      if (!photo?.base64) throw new Error('Falha ao capturar imagem')

      await verifyBiometric({
        challengeToken,
        imageData: photo.base64,
      })
      router.replace('/(app)')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verificação biométrica falhou.'
      Alert.alert('Erro', message)
    } finally {
      setLoading(false)
    }
  }

  async function handleFaceID() {
    setLoading(true)
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentique-se para acessar o BI Araçuaí',
        fallbackLabel: 'Usar senha',
      })
      if (result.success) {
        router.replace('/(app)')
      } else {
        Alert.alert('Falha', 'Autenticação não reconhecida.')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro no Face ID.'
      Alert.alert('Erro', message)
    } finally {
      setLoading(false)
    }
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Acesso à câmera é necessário para verificação biométrica.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Permitir câmera</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verificação Biométrica</Text>
      <Text style={styles.subtitle}>Posicione seu rosto no centro e pressione verificar</Text>

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={'front' as CameraType}
        />
        <View style={styles.overlay} />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCapture}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verificar</Text>
          )}
        </TouchableOpacity>

        {hasFaceID && (
          <TouchableOpacity
            style={[styles.buttonSecondary, loading && styles.buttonDisabled]}
            onPress={handleFaceID}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonSecondaryText}>Usar Face ID / Touch ID</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#111827',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  permText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: '10%',
    left: '15%',
    right: '15%',
    bottom: '10%',
    borderWidth: 2,
    borderColor: '#1a56db',
    borderRadius: 120,
  },
  actions: {
    paddingVertical: 24,
    gap: 12,
  },
  button: {
    backgroundColor: '#1a56db',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#d1d5db',
    fontSize: 15,
    fontWeight: '600',
  },
})
