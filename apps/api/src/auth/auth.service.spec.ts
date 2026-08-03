import { JwtService } from '@nestjs/jwt'
import { ForbiddenException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { PrismaService } from '../prisma/prisma.service'

/**
 * Regression test for the C1 finding: selecting a NIK used to be blocked
 * forever by whichever account first held it, because the lock-release check
 * only looked at whether a refreshToken hash was present — which stays set
 * until an explicit logout, and almost nobody explicitly logs out. The fix
 * checks refreshTokenExpiresAt instead, so a holder whose session has
 * naturally expired no longer blocks a second linked account from taking over.
 */
describe('AuthService.selectNik — NIK session lock', () => {
  const NIK = '1234567890123456'
  const FAMILY_ID = 'family-1'
  const HOLDER_ACCOUNT_ID = 'account-holder'
  const CHALLENGER_ACCOUNT_ID = 'account-challenger'

  let prisma: {
    nikLink: { findUnique: jest.Mock }
    nikIdentity: { findUnique: jest.Mock; update: jest.Mock }
    personNode: { findFirst: jest.Mock }
    account: { findUnique: jest.Mock; update: jest.Mock }
  }
  let jwtService: { verifyAsync: jest.Mock; signAsync: jest.Mock }
  let service: AuthService

  beforeAll(() => {
    process.env['JWT_ACCESS_SECRET'] = 'test-access-secret'
    process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret'
  })

  beforeEach(() => {
    prisma = {
      nikLink: { findUnique: jest.fn().mockResolvedValue({ accountId: CHALLENGER_ACCOUNT_ID, nik: NIK }) },
      nikIdentity: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      personNode: { findFirst: jest.fn().mockResolvedValue({ id: 'node-1', nikId: NIK, familyGroupId: FAMILY_ID }) },
      account: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    }
    jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({ purpose: 'select', accountId: CHALLENGER_ACCOUNT_ID }),
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    }
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
    )
  })

  it('rejects a second account while the current holder still has a live (non-expired) session', async () => {
    prisma.nikIdentity.findUnique.mockResolvedValue({
      nik: NIK, status: 'ACTIVE', activeAccountId: HOLDER_ACCOUNT_ID,
    })
    prisma.account.findUnique.mockResolvedValue({
      id: HOLDER_ACCOUNT_ID,
      refreshToken: 'hashed-refresh-token',
      refreshTokenExpiresAt: new Date(Date.now() + 60_000), // still valid for another minute
    })

    await expect(service.selectNik('session-token', NIK, FAMILY_ID)).rejects.toThrow(ForbiddenException)
    expect(prisma.nikIdentity.update).not.toHaveBeenCalled()
  })

  it('allows a second account to take over once the holder’s session has naturally expired — even though refreshToken is still set (the actual bug)', async () => {
    prisma.nikIdentity.findUnique.mockResolvedValue({
      nik: NIK, status: 'ACTIVE', activeAccountId: HOLDER_ACCOUNT_ID,
    })
    prisma.account.findUnique.mockResolvedValue({
      id: HOLDER_ACCOUNT_ID,
      refreshToken: 'hashed-refresh-token', // never cleared — holder just closed the tab, no explicit logout
      refreshTokenExpiresAt: new Date(Date.now() - 1_000), // expired 1 second ago
    })

    await expect(service.selectNik('session-token', NIK, FAMILY_ID)).resolves.toBeDefined()
    expect(prisma.nikIdentity.update).toHaveBeenCalledWith({
      where: { nik: NIK },
      data:  { activeAccountId: CHALLENGER_ACCOUNT_ID },
    })
  })

  it('allows takeover when the holder was already explicitly logged out (refreshTokenExpiresAt null)', async () => {
    prisma.nikIdentity.findUnique.mockResolvedValue({
      nik: NIK, status: 'ACTIVE', activeAccountId: HOLDER_ACCOUNT_ID,
    })
    prisma.account.findUnique.mockResolvedValue({
      id: HOLDER_ACCOUNT_ID,
      refreshToken: null,
      refreshTokenExpiresAt: null,
    })

    await expect(service.selectNik('session-token', NIK, FAMILY_ID)).resolves.toBeDefined()
  })

  it('allows the same account to reselect a NIK it already holds', async () => {
    prisma.nikIdentity.findUnique.mockResolvedValue({
      nik: NIK, status: 'ACTIVE', activeAccountId: CHALLENGER_ACCOUNT_ID,
    })

    await expect(service.selectNik('session-token', NIK, FAMILY_ID)).resolves.toBeDefined()
    expect(prisma.account.findUnique).not.toHaveBeenCalled()
  })

  it('rejects when the account has no NikLink to the requested NIK', async () => {
    prisma.nikLink.findUnique.mockResolvedValue(null)

    await expect(service.selectNik('session-token', NIK, FAMILY_ID)).rejects.toThrow(ForbiddenException)
  })
})
