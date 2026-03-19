/**
 * seed-test.ts — Minimal test accounts for QA / manual testing.
 *
 * Creates a separate family group ("Test Family") with one account per role/status:
 *
 *   FAMILY_HEAD     NIK: 0000000000000001  password: testpass123
 *   FAMILY_MEMBER   NIK: 0000000000000002  password: testpass123
 *   DEACTIVATED     NIK: 0000000000000003  password: testpass123
 *   PENDING_APPROVAL NIK: 0000000000000004  password: testpass123
 *
 * Run: pnpm --filter @genyra/api db:seed:test
 */

import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()
const PASSWORD = 'testpass123'

async function main() {
  const hash = await argon2.hash(PASSWORD)

  // Clean up previous test data
  const existing = await prisma.familyGroup.findFirst({ where: { name: 'Test Family' } })
  if (existing) {
    // Cascade: delete all PersonNodes (edges cascade), then FamilyGroup, then orphan Users
    const nodes = await prisma.personNode.findMany({ where: { familyGroupId: existing.id } })
    for (const n of nodes) {
      await prisma.personNode.delete({ where: { id: n.id } })
    }
    await prisma.familyGroup.delete({ where: { id: existing.id } })
    await prisma.user.deleteMany({
      where: { nik: { in: ['0000000000000001', '0000000000000002', '0000000000000003', '0000000000000004'] } },
    })
  }

  // Create family
  const family = await prisma.familyGroup.create({ data: { name: 'Test Family' } })

  // FAMILY_HEAD
  const head = await prisma.user.create({
    data: {
      nik:          '0000000000000001',
      passwordHash: hash,
      role:         'FAMILY_HEAD',
      status:       'ACTIVE',
      personNode: {
        create: {
          displayName:   'Test Head',
          surname:       'Head',
          gender:        'MALE',
          birthDate:     new Date('1980-01-01'),
          birthPlace:    'Jakarta',
          familyGroupId: family.id,
        },
      },
    },
    include: { personNode: true },
  })

  // FAMILY_MEMBER (active)
  const member = await prisma.user.create({
    data: {
      nik:          '0000000000000002',
      passwordHash: hash,
      role:         'FAMILY_MEMBER',
      status:       'ACTIVE',
      personNode: {
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
    include: { personNode: true },
  })

  // Link head and member as SPOUSE
  await prisma.relationshipEdge.create({
    data: {
      sourceId:         head.personNode!.id,
      targetId:         member.personNode!.id,
      relationshipType: 'SPOUSE',
    },
  })

  // DEACTIVATED member
  await prisma.user.create({
    data: {
      nik:          '0000000000000003',
      passwordHash: hash,
      role:         'FAMILY_MEMBER',
      status:       'DEACTIVATED',
      personNode: {
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

  // PENDING_APPROVAL member
  const invite = await prisma.invite.create({
    data: {
      code:          'TEST0',
      familyGroupId: family.id,
      expiresAt:     new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })
  await prisma.user.create({
    data: {
      nik:          '0000000000000004',
      passwordHash: hash,
      role:         'FAMILY_MEMBER',
      status:       'PENDING_APPROVAL',
      personNode: {
        create: {
          displayName:    'Test Pending',
          surname:        'Pending',
          gender:         'FEMALE',
          birthDate:      new Date('1995-09-10'),
          birthPlace:     'Yogyakarta',
          familyGroupId:  family.id,
          pendingApproval: true,
        },
      },
    },
  })
  await prisma.invite.update({ where: { id: invite.id }, data: { status: 'USED', usedAt: new Date() } })

  console.log('\n✓ Test accounts created:')
  console.log('  FAMILY_HEAD      NIK: 0000000000000001  password:', PASSWORD)
  console.log('  FAMILY_MEMBER    NIK: 0000000000000002  password:', PASSWORD)
  console.log('  DEACTIVATED      NIK: 0000000000000003  password:', PASSWORD, '(cannot login)')
  console.log('  PENDING_APPROVAL NIK: 0000000000000004  password:', PASSWORD, '(cannot login until approved)')
  console.log('\n  Family:', family.name, '| ID:', family.id)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
