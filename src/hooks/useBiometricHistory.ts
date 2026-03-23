import { useQuery } from '@tanstack/react-query'
import { listBiometricHistory } from '@/services/biometric-history.service'
import type { BiometricHistoryParams } from '@/services/biometric-history.service'

export function useBiometricHistory(params: BiometricHistoryParams = {}) {
  return useQuery({
    queryKey: ['biometric-history', params],
    queryFn: () => listBiometricHistory(params),
  })
}
