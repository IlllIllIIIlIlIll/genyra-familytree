import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Clean slate ────────────────────────────────────────────────────────────
  await prisma.relationshipEdge.deleteMany()
  await prisma.personPhoto.deleteMany()
  await prisma.personNode.deleteMany()
  await prisma.invite.deleteMany()
  await prisma.user.deleteMany()
  await prisma.familyGroup.deleteMany()

  console.log('✓ Cleared existing data')

  // ── Demo family: Santoso ───────────────────────────────────────────────────
  const passwordHash = await argon2.hash('password123')

  // Family Head — Budi Santoso (the son who created the family)
  const budi = await prisma.user.create({
    data: {
      email: 'budi@example.com',
      passwordHash,
      displayName: 'Budi Santoso',
      gender: 'MALE',
      surname: 'Santoso',
      nik: '3276011009900001',
      birthDate: new Date('1990-09-10'),
      birthPlace: 'Jakarta',
      role: 'FAMILY_HEAD',
      status: 'ACTIVE',
    },
  })

  // Second member — Siti Santoso (Budi's wife, registered user)
  const siti = await prisma.user.create({
    data: {
      email: 'siti@example.com',
      passwordHash,
      displayName: 'Siti Rahayu',
      gender: 'FEMALE',
      surname: 'Rahayu',
      nik: '3276014505920002',
      birthDate: new Date('1992-05-05'),
      birthPlace: 'Bandung',
      role: 'FAMILY_MEMBER',
      status: 'ACTIVE',
    },
  })

  // ── Create family group ────────────────────────────────────────────────────
  const familyGroup = await prisma.familyGroup.create({
    data: {
      name: 'Keluarga Santoso',
      description: 'Demo family — Santoso lineage',
      members: {
        connect: [{ id: budi.id }, { id: siti.id }],
      },
    },
  })

  // Attach familyGroupId to users
  await prisma.user.updateMany({
    where: { id: { in: [budi.id, siti.id] } },
    data: { familyGroupId: familyGroup.id },
  })

  // ── Person nodes ───────────────────────────────────────────────────────────

  // Father — Ahmad Santoso (placeholder, deceased)
  const ahmad = await prisma.personNode.create({
    data: {
      displayName: 'Ahmad Santoso',
      gender: 'MALE',
      surname: 'Santoso',
      nik: '3276010101500003',
      birthDate: new Date('1950-01-01'),
      birthPlace: 'Yogyakarta',
      deathDate: new Date('2020-06-15'),
      isDeceased: true,
      isPlaceholder: false,
      familyGroupId: familyGroup.id,
      canvasX: 0,
      canvasY: 0,
    },
  })

  // Mother — Sri Santoso (placeholder)
  const sri = await prisma.personNode.create({
    data: {
      displayName: 'Sri Mulyani',
      gender: 'FEMALE',
      surname: 'Mulyani',
      nik: '3276014602520004',
      birthDate: new Date('1952-02-06'),
      birthPlace: 'Solo',
      isPlaceholder: false,
      familyGroupId: familyGroup.id,
      canvasX: 300,
      canvasY: 0,
    },
  })

  // Budi — the family head user's node
  const budiNode = await prisma.personNode.create({
    data: {
      displayName: 'Budi Santoso',
      gender: 'MALE',
      surname: 'Santoso',
      nik: budi.nik,
      birthDate: new Date('1990-09-10'),
      birthPlace: 'Jakarta',
      isPlaceholder: false,
      userId: budi.id,
      familyGroupId: familyGroup.id,
      canvasX: 150,
      canvasY: 250,
    },
  })

  // Siti — the wife's node
  const sitiNode = await prisma.personNode.create({
    data: {
      displayName: 'Siti Rahayu',
      gender: 'FEMALE',
      surname: 'Rahayu',
      nik: siti.nik,
      birthDate: new Date('1992-05-05'),
      birthPlace: 'Bandung',
      isPlaceholder: false,
      userId: siti.id,
      familyGroupId: familyGroup.id,
      canvasX: 450,
      canvasY: 250,
    },
  })

  // ── Relationships ──────────────────────────────────────────────────────────

  // Ahmad (father) married Sri (mother)
  await prisma.relationshipEdge.create({
    data: {
      relationshipType: 'SPOUSE',
      sourceId: ahmad.id,
      targetId: sri.id,
      marriageDate: new Date('1975-03-20'),
    },
  })

  // Ahmad is Budi's father
  await prisma.relationshipEdge.create({
    data: {
      relationshipType: 'PARENT_CHILD',
      sourceId: ahmad.id,
      targetId: budiNode.id,
    },
  })

  // Sri is Budi's mother
  await prisma.relationshipEdge.create({
    data: {
      relationshipType: 'PARENT_CHILD',
      sourceId: sri.id,
      targetId: budiNode.id,
    },
  })

  // Budi married Siti
  await prisma.relationshipEdge.create({
    data: {
      relationshipType: 'SPOUSE',
      sourceId: budiNode.id,
      targetId: sitiNode.id,
      marriageDate: new Date('2015-08-17'),
    },
  })

  console.log('✓ Created family: Keluarga Santoso')
  console.log('')
  console.log('Demo accounts:')
  console.log('  budi@example.com   / password123  (Family Head)')
  console.log('  siti@example.com   / password123  (Family Member)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
