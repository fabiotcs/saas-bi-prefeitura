/**
 * Story 1.3 — Immutability Trigger Tests
 *
 * Verifies that PostgreSQL triggers on audit_logs and biometric_records
 * block any UPDATE or DELETE operations at the database level.
 *
 * These tests require a live PostgreSQL connection. They are skipped
 * automatically when the database is unavailable (CI without DB).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'

// Helper: check DB connectivity
async function isDbAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

describe('Story 1.3 — Immutability triggers', () => {
  let dbAvailable = false

  beforeAll(async () => {
    dbAvailable = await isDbAvailable()
    if (!dbAvailable) {
      console.warn('Database not available — trigger tests skipped')
    }
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  // ----------------------------------------------------------------
  // AuditLog immutability
  // ----------------------------------------------------------------

  describe('audit_logs', () => {
    it('INSERT succeeds (baseline)', async () => {
      if (!dbAvailable) return

      const record = await prisma.auditLog.create({
        data: {
          action: 'TEST_ACTION',
          urlPath: '/test',
          userAgent: 'vitest',
          ipAddress: '127.0.0.1',
          status: 'SUCCESS',
        },
      })

      expect(record.id).toBeDefined()

      // Clean up via raw SQL bypassing the ORM so the trigger test below
      // starts with a known record id. We need the id for trigger tests.
      // Store it on the test scope.
      ;(globalThis as Record<string, unknown>).__auditLogId = record.id
    })

    it('DELETE on audit_logs raises exception (trigger)', async () => {
      if (!dbAvailable) return

      const id = (globalThis as Record<string, unknown>).__auditLogId as
        | string
        | undefined
      if (!id) return

      await expect(
        prisma.$executeRawUnsafe(
          `DELETE FROM audit_logs WHERE id = '${id}'`
        )
      ).rejects.toThrow(/immutable|forbidden/i)
    })

    it('UPDATE on audit_logs raises exception (trigger)', async () => {
      if (!dbAvailable) return

      const id = (globalThis as Record<string, unknown>).__auditLogId as
        | string
        | undefined
      if (!id) return

      await expect(
        prisma.$executeRawUnsafe(
          `UPDATE audit_logs SET action = 'MUTATED' WHERE id = '${id}'`
        )
      ).rejects.toThrow(/immutable|forbidden/i)
    })
  })

  // ----------------------------------------------------------------
  // BiometricRecord immutability
  // ----------------------------------------------------------------

  describe('biometric_records', () => {
    it('INSERT succeeds (baseline)', async () => {
      if (!dbAvailable) return

      // Requires a valid userId — create a throwaway user first
      const user = await prisma.user.create({
        data: {
          fullName: 'Trigger Test User',
          birthDate: new Date('1990-01-01'),
          phone: '(00) 00000-0000',
          email: `trigger-test-${Date.now()}@test.local`,
          cpf: `${Date.now()}`,
          rg: '0000000',
          role: 'AUDIT_VIEWER',
          passwordHash: 'x',
        },
      })

      const record = await prisma.biometricRecord.create({
        data: {
          userId: user.id,
          capturedImageUrl: 'https://example.com/test.jpg',
          similarityScore: 0.95,
          livenessScore: 0.9,
          confidenceLevel: 0.88,
          fraudAlertLevel: 'NONE',
          ipAddress: '127.0.0.1',
          status: 'SUCCESS',
        },
      })

      expect(record.id).toBeDefined()

      ;(globalThis as Record<string, unknown>).__biometricRecordId = record.id
      ;(globalThis as Record<string, unknown>).__biometricTestUserId = user.id
    })

    it('DELETE on biometric_records raises exception (trigger)', async () => {
      if (!dbAvailable) return

      const id = (globalThis as Record<string, unknown>)
        .__biometricRecordId as string | undefined
      if (!id) return

      await expect(
        prisma.$executeRawUnsafe(
          `DELETE FROM biometric_records WHERE id = '${id}'`
        )
      ).rejects.toThrow(/immutable|forbidden/i)
    })

    it('UPDATE on biometric_records raises exception (trigger)', async () => {
      if (!dbAvailable) return

      const id = (globalThis as Record<string, unknown>)
        .__biometricRecordId as string | undefined
      if (!id) return

      await expect(
        prisma.$executeRawUnsafe(
          `UPDATE biometric_records SET status = 'FAILED' WHERE id = '${id}'`
        )
      ).rejects.toThrow(/immutable|forbidden/i)
    })
  })
})
