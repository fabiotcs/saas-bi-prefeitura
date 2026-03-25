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
  aiEstimatedGender?: string
  documentMatch: boolean
  documentSimilarityScore?: number
}

export interface LivenessContext {
  /** Score de movimento médio entre frames capturados pelo cliente (0–100). 0 = foto/vídeo estático */
  motionScore?: number
  /** Número de frames analisados pelo cliente */
  frameCount?: number
}

export interface BiometricProvider {
  verify(
    faceImageBuffer: Buffer,
    referenceImageUrl?: string,
    documentImageBuffer?: Buffer,
    livenessContext?: LivenessContext
  ): Promise<BiometricResult>
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
 * Estima faixa etária a partir da variância de pixels.
 * Pele jovem (< 30 anos) tende a textura mais uniforme; pele madura tem maior variância.
 * Produção: substituir por modelo de IA real (ex: AWS Rekognition DetectFaces).
 */
export function estimateAgeFromBuffer(imageBuffer: Buffer): number {
  const variance = assessLivenessFromBuffer(imageBuffer)
  // Mapeia variância para faixa etária 20-65
  const age = Math.round(20 + (variance / 100) * 45)
  return Math.min(65, Math.max(20, age))
}

/**
 * Estima gênero a partir de checksum de bytes do buffer.
 * PoC determinístico — produção usa AWS Rekognition DetectFaces.Gender.
 */
export function estimateGenderFromBuffer(imageBuffer: Buffer): string {
  if (imageBuffer.length === 0) return 'UNKNOWN'
  const checksum = imageBuffer.slice(0, 64).reduce((a, b) => a + b, 0)
  return checksum % 2 === 0 ? 'MASCULINO' : 'FEMININO'
}

/**
 * Compara similaridade entre selfie e foto do documento.
 * PoC usa correlação de variância; produção usa FaceMatch do Rekognition.
 */
export function compareWithDocument(selfieBuffer: Buffer, docBuffer: Buffer): number {
  if (selfieBuffer.length === 0 || docBuffer.length === 0) return 0
  const selfieVariance = assessLivenessFromBuffer(selfieBuffer)
  const docVariance = assessLivenessFromBuffer(docBuffer)
  const diff = Math.abs(selfieVariance - docVariance)
  // Similaridade inversa à diferença: 0 diff = 100%, 100 diff = 0%
  return Math.max(0, Math.round(100 - diff))
}

/**
 * Combina score de variância de pixels (servidor) com score de movimento entre frames (cliente).
 *
 * Anti-spoofing logic:
 * - Foto impressa: baixa variância de pixels + motionScore ≈ 0 (frame único)
 * - Vídeo em replay: variância ok, mas motionScore baixo (frames idênticos)
 * - Máscara: variância reduzida + textura diferente de pele
 * - Face real: variância normal + motionScore >= 15 (micromovimentos naturais)
 */
export function combinedLivenessScore(
  pixelVarianceScore: number,
  motionScore?: number,
  frameCount?: number
): number {
  if (motionScore === undefined || frameCount === undefined || frameCount < 3) {
    // Sem dados de movimento — confia apenas na variância
    return pixelVarianceScore
  }

  // Vídeo em replay: frames consistentes = motionScore baixo (< 8)
  // Foto impressa: motionScore ≈ 0
  // Máscara: motionScore pode ser normal, variância anormal
  const motionBonus = Math.min(30, motionScore * 1.5)
  const motionPenalty = motionScore < 8 ? 30 : 0 // provável vídeo/foto

  const combined = pixelVarianceScore + motionBonus - motionPenalty
  return Math.max(0, Math.min(100, Math.round(combined)))
}

/**
 * MockBiometricProvider — liveness com análise de textura + movimento multi-frame.
 * Produção: substituir por AwsRekognitionProvider.
 */
export class MockBiometricProvider implements BiometricProvider {
  async verify(
    faceImageBuffer: Buffer,
    _referenceImageUrl?: string,
    documentImageBuffer?: Buffer,
    livenessContext?: LivenessContext
  ): Promise<BiometricResult> {
    // Liveness: variância de pixels + score de movimento entre frames
    const pixelScore = assessLivenessFromBuffer(faceImageBuffer)
    const livenessScore = combinedLivenessScore(
      pixelScore,
      livenessContext?.motionScore,
      livenessContext?.frameCount
    )

    // Para PoC: similaridade simulada (produção: embedding comparison)
    const similarityScore = faceImageBuffer.length > 0 ? 85 : 0

    const fraudAlertLevel = calculateFraudAlertLevel(livenessScore, similarityScore)
    const match = fraudAlertLevel !== 'HIGH' && similarityScore >= 60

    // Parâmetros de IA
    const aiEstimatedAge = estimateAgeFromBuffer(faceImageBuffer)
    const aiEstimatedGender = estimateGenderFromBuffer(faceImageBuffer)

    // Comparação com documento (se disponível)
    let documentMatch = false
    let documentSimilarityScore: number | undefined
    if (documentImageBuffer && documentImageBuffer.length > 0) {
      documentSimilarityScore = compareWithDocument(faceImageBuffer, documentImageBuffer)
      documentMatch = documentSimilarityScore >= 60
    }

    return {
      match,
      similarityScore: similarityScore / 100,
      livenessScore: livenessScore / 100,
      confidenceLevel: (livenessScore * 0.4 + similarityScore * 0.6) / 100,
      fraudAlertLevel,
      aiEstimatedAge,
      aiEstimatedGender,
      documentMatch,
      documentSimilarityScore: documentSimilarityScore !== undefined ? documentSimilarityScore / 100 : undefined,
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
