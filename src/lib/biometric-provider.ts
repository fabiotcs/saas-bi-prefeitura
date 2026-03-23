/**
 * BiometricProvider interface — abstrai o provider de reconhecimento facial.
 * PoC usa FaceApiProvider (client-side face-api.js via server embeddings).
 * Produção: trocar por AwsRekognitionProvider.
 */

export interface BiometricResult {
  match: boolean
  similarityScore: number
  livenessScore: number
  confidenceLevel: number
  fraudAlertLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
  aiEstimatedAge?: number
}

export interface BiometricProvider {
  verify(faceImageBuffer: Buffer, referenceImageUrl?: string): Promise<BiometricResult>
}

/**
 * MockBiometricProvider — usado em testes e quando face-api.js não está disponível.
 * Simula verificação bem-sucedida com scores altos.
 */
export class MockBiometricProvider implements BiometricProvider {
  async verify(_faceImageBuffer: Buffer, _referenceImageUrl?: string): Promise<BiometricResult> {
    return {
      match: true,
      similarityScore: 0.95,
      livenessScore: 0.98,
      confidenceLevel: 0.97,
      fraudAlertLevel: 'NONE',
      aiEstimatedAge: 35,
    }
  }
}

/**
 * Retorna o provider ativo baseado nas variáveis de ambiente.
 * BIOMETRIC_PROVIDER=mock|aws (default: mock para PoC)
 */
export function getBiometricProvider(): BiometricProvider {
  const provider = process.env.BIOMETRIC_PROVIDER ?? 'mock'

  if (provider === 'mock') {
    return new MockBiometricProvider()
  }

  // Futuro: AwsRekognitionProvider
  return new MockBiometricProvider()
}
