/**
 * seed-test.ts — Minimal test data for QA / manual testing under the
 * Google-OAuth + Admin/NikIdentity model.
 *
 * Creates a separate "Test Family" owned by a test Admin account, with:
 *   - one ACTIVE NikIdentity linked to a test personal account
 *   - one DEACTIVATED NikIdentity (no linked account)
 *
 * Sign-in still requires real Google OAuth — these test rows only pre-provision
 * the Account/NikIdentity/NikLink rows so a real Google login can "claim" them
 * by email.
 *
 * Run: pnpm --filter @genyra/api db:seed:test
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TEST_ADMIN_EMAIL  = process.env['SEED_TEST_ADMIN_EMAIL']  ?? 'test-admin@example.com'
const TEST_MEMBER_EMAIL = process.env['SEED_TEST_MEMBER_EMAIL'] ?? 'test-member@example.com'

async function main() {
  // Clean up previous test data
  const existing = await prisma.familyGroup.findFirst({ where: { name: 'Test Family' } })
  if (existing) {
    const nodes = await prisma.personNode.findMany({ where: { familyGroupId: existing.id } })
    for (const n of nodes) await prisma.personNode.delete({ where: { id: n.id } })
    await prisma.familyGroup.delete({ where: { id: existing.id } })
  }
  await prisma.nikIdentity.deleteMany({ where: { nik: { in: ['9000000000000001', '9000000000000002'] } } })
  await prisma.account.deleteMany({ where: { email: { in: [TEST_ADMIN_EMAIL, TEST_MEMBER_EMAIL] } } })

  const admin = await prisma.account.create({ data: { email: TEST_ADMIN_EMAIL, isAdmin: true } })
  const family = await prisma.familyGroup.create({
    data: { name: 'Test Family', adminAccountId: admin.id },
  })

  // ACTIVE member, pre-linked to a test personal account
  await prisma.nikIdentity.create({
    data: {
      nik:    '9000000000000001',
      status: 'ACTIVE',
      personNodes: {
        create: {
          displayName:   'Test Member',
          surname:       'Member',
          gender:        'FEMALE',
          birthDate:     new Date('1985-06-15'),
          birthPlace:    'Bandung',
          familyGroupId: family.id,
        },
      },
    },
  })
  const memberAccount = await prisma.account.create({ data: { email: TEST_MEMBER_EMAIL } })
  await prisma.nikLink.create({ data: { accountId: memberAccount.id, nik: '9000000000000001' } })

  // DEACTIVATED member, no linked account
  await prisma.nikIdentity.create({
    data: {
      nik:    '9000000000000002',
      status: 'DEACTIVATED',
      personNodes: {
        create: {
          displayName:   'Test Deactivated',
          surname:       'Deact',
          gender:        'MALE',
          birthDate:     new Date('1990-03-20'),
          birthPlace:    'Surabaya',
          familyGroupId: family.id,
        },
      },
    },
  })

  console.log('\n✓ Test data created:')
  console.log('  Test Family, admin account:', TEST_ADMIN_EMAIL, '(sign in with Google as this email to reach /admin)')
  console.log('  ACTIVE NIK 9000000000000001, linked account:', TEST_MEMBER_EMAIL)
  console.log('  DEACTIVATED NIK 9000000000000002, no linked account')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
