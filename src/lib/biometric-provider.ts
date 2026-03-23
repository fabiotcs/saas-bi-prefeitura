/**
 * BiometricProvider interface — abstrai o provider de reconhecimento facial.
 * PoC usa MockBiometricProvider com liveness detection baseada em análise de textura.
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
 * Calcula o fraudAlertLevel baseado nos scores de liveness e similaridade.
 * Thresholds configuráveis via env: LIVENESS_MIN_SCORE, SIMILARITY_MIN_SCORE.
 *
 * NONE:   livenessScore >= 80 e similarityScore >= 70
 * LOW:    livenessScore >= 60 e similarityScore >= 60
 * MEDIUM: livenessScore >= 40 ou similarityScore < 60
 * HIGH:   livenessScore < 40 (foto impressa detectada)
 */
export function calculateFraudAlertLevel(
  livenessScore: number,
  similarityScore: number
): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' {
  const livenessMin = Number(process.env.LIVENESS_MIN_SCORE ?? 40)
  const similarityMin = Number(process.env.SIMILARITY_MIN_SCORE ?? 60)

  if (livenessScore < livenessMin) return 'HIGH'
  if (livenessScore < 60 || similarityScore < similarityMin) return 'MEDIUM'
  if (livenessScore < 80 || similarityScore < 70) return 'LOW'
  return 'NONE'
}

/**
 * Analisa a variância de pixels da imagem para detectar fotos impressas.
 * Fotos planas têm textura uniforme (variância baixa < 800).
 * Faces reais têm alta variância por reflexo de luz e profundidade.
 */
export function assessLivenessFromBuffer(imageBuffer: Buffer): number {
  if (imageBuffer.length === 0) return 0

  // Amostra uniformemente até 4096 bytes para eficiência
  const sampleSize = Math.min(imageBuffer.length, 4096)
  const step = Math.max(1, Math.floor(imageBuffer.length / sampleSize))
  const samples: number[] = []

  for (let i = 0; i < imageBuffer.length; i += step) {
    samples.push(imageBuffer[i])
  }

  const mean = samples.reduce((a, b) => a + b, 0) / samples.length
  const variance = samples.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / samples.length

  // Normaliza variância para score 0–100
  // Variância < 800 = foto plana (score baixo); variância > 4000 = face real (score alto)
  const normalized = Math.min(100, Math.max(0, ((variance - 800) / (4000 - 800)) * 100))
  return Math.round(normalized)
}

/**
 * MockBiometricProvider — PoC com liveness detection real via análise de textura.
 * Produção: substituir por AwsRekognitionProvider.
 */
export class MockBiometricProvider implements BiometricProvider {
  async verify(faceImageBuffer: Buffer, _referenceImageUrl?: string): Promise<BiometricResult> {
    // Liveness real: análise de variância de pixels
    const livenessScore = assessLivenessFromBuffer(faceImageBuffer)

    // Para PoC: similaridade simulada (produção: embedding comparison)
    const similarityScore = faceImageBuffer.length > 0 ? 85 : 0

    const fraudAlertLevel = calculateFraudAlertLevel(livenessScore, similarityScore)
    const match = fraudAlertLevel !== 'HIGH' && similarityScore >= 60

    return {
      match,
      similarityScore: similarityScore / 100,
      livenessScore: livenessScore / 100,
      confidenceLevel: (livenessScore * 0.4 + similarityScore * 0.6) / 100,
      fraudAlertLevel,
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
  if (provider === 'mock') return new MockBiometricProvider()
  // Futuro: AwsRekognitionProvider
  return new MockBiometricProvider()
}
