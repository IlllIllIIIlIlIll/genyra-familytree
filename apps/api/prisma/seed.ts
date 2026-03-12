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

  // ── Users (registered accounts) ───────────────────────────────────────────
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

  const siti = await prisma.user.create({
    data: {
      email: 'siti@example.com',
      passwordHash,
      displayName: 'Siti Rahayu',
      gender: 'FEMALE',
      surname: 'Rahayu',
      nik: '3271014505920002',
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

  await prisma.user.updateMany({
    where: { id: { in: [budi.id, siti.id] } },
    data: { familyGroupId: familyGroup.id },
  })

  const g = familyGroup.id

  // ── Generation 0: Ahmad (father) & Sri (mother) ───────────────────────────
  //   canvasX/Y are ignored — the frontend auto-layout computes positions.

  const ahmad = await prisma.personNode.create({ data: {
    displayName: 'Ahmad Santoso', gender: 'MALE', surname: 'Santoso',
    nik: '3276010101500003', birthDate: new Date('1950-01-01'), birthPlace: 'Yogyakarta',
    deathDate: new Date('2020-06-15'), isDeceased: true,
    familyGroupId: g, canvasX: 0, canvasY: 0,
  }})

  const sri = await prisma.personNode.create({ data: {
    displayName: 'Sri Mulyani', gender: 'FEMALE', surname: 'Mulyani',
    nik: '3276014602520004', birthDate: new Date('1952-02-06'), birthPlace: 'Solo',
    familyGroupId: g, canvasX: 0, canvasY: 0,
  }})

  // ── Generation 1: Three children of Ahmad & Sri ───────────────────────────

  // Child 1 — Budi (registered user)  
  const budiNode = await prisma.personNode.create({ data: {
    displayName: 'Budi Santoso', gender: 'MALE', surname: 'Santoso',
    nik: budi.nik, birthDate: new Date('1990-09-10'), birthPlace: 'Jakarta',
    userId: budi.id, familyGroupId: g, canvasX: 0, canvasY: 0,
  }})

  // Child 1 spouse — Siti (registered user)
  const sitiNode = await prisma.personNode.create({ data: {
    displayName: 'Siti Rahayu', gender: 'FEMALE', surname: 'Rahayu',
    nik: siti.nik, birthDate: new Date('1992-05-05'), birthPlace: 'Bandung',
    userId: siti.id, familyGroupId: g, canvasX: 0, canvasY: 0,
  }})

  // Child 2 — Dewi (second child of Ahmad+Sri)
  const dewi = await prisma.personNode.create({ data: {
    displayName: 'Dewi Santoso', gender: 'FEMALE', surname: 'Santoso',
    nik: '3276015510880005', birthDate: new Date('1988-10-15'), birthPlace: 'Yogyakarta',
    familyGroupId: g, canvasX: 0, canvasY: 0,
  }})

  // Dewi's husband — Reza Purnama
  const reza = await prisma.personNode.create({ data: {
    displayName: 'Reza Purnama', gender: 'MALE', surname: 'Purnama',
    nik: '3271010812850006', birthDate: new Date('1985-12-08'), birthPlace: 'Surabaya',
    familyGroupId: g, canvasX: 0, canvasY: 0,
  }})

  // Child 3 — Eko (third child of Ahmad+Sri)
  const eko = await prisma.personNode.create({ data: {
    displayName: 'Eko Santoso', gender: 'MALE', surname: 'Santoso',
    nik: '3276010302930007', birthDate: new Date('1993-02-03'), birthPlace: 'Solo',
    familyGroupId: g, canvasX: 0, canvasY: 0,
  }})

  // Eko's wife — Ayu Lestari
  const ayu = await prisma.personNode.create({ data: {
    displayName: 'Ayu Lestari', gender: 'FEMALE', surname: 'Lestari',
    nik: '3271012005950008', birthDate: new Date('1995-05-20'), birthPlace: 'Bali',
    familyGroupId: g, canvasX: 0, canvasY: 0,
  }})

  // ── Generation 2: Children ────────────────────────────────────────────────

  // Budi + Siti's child
  const bagas = await prisma.personNode.create({ data: {
    displayName: 'Bagas Santoso', gender: 'MALE', surname: 'Santoso',
    nik: '3276011501150009', birthDate: new Date('2015-01-15'), birthPlace: 'Jakarta',
    familyGroupId: g, canvasX: 0, canvasY: 0,
  }})

  // Dewi + Reza's child
  const zahra = await prisma.personNode.create({ data: {
    displayName: 'Zahra Purnama', gender: 'FEMALE', surname: 'Purnama',
    nik: '3271012003120010', birthDate: new Date('2012-03-20'), birthPlace: 'Surabaya',
    familyGroupId: g, canvasX: 0, canvasY: 0,
  }})

  // Eko + Ayu's child
  const kiran = await prisma.personNode.create({ data: {
    displayName: 'Kiran Santoso', gender: 'MALE', surname: 'Santoso',
    nik: '3271010610190011', birthDate: new Date('2019-10-06'), birthPlace: 'Denpasar',
    familyGroupId: g, canvasX: 0, canvasY: 0,
  }})

  // ── Relationships ──────────────────────────────────────────────────────────

  const rel = async (type: 'PARENT_CHILD' | 'SPOUSE' | 'SIBLING', src: string, tgt: string, extra?: object) =>
    prisma.relationshipEdge.create({ data: { relationshipType: type, sourceId: src, targetId: tgt, ...extra } })

  // Gen 0: Ahmad ↔ Sri (spouse)
  await rel('SPOUSE', ahmad.id, sri.id, { marriageDate: new Date('1975-03-20') })

  // Gen 0 → Gen 1: Ahmad + Sri → children
  await rel('PARENT_CHILD', ahmad.id, budiNode.id)
  await rel('PARENT_CHILD', sri.id,   budiNode.id)
  await rel('PARENT_CHILD', ahmad.id, dewi.id)
  await rel('PARENT_CHILD', sri.id,   dewi.id)
  await rel('PARENT_CHILD', ahmad.id, eko.id)
  await rel('PARENT_CHILD', sri.id,   eko.id)

  // Gen 1: Budi ↔ Siti (spouse)
  await rel('SPOUSE', budiNode.id, sitiNode.id, { marriageDate: new Date('2015-08-17') })

  // Gen 1: Dewi ↔ Reza (spouse)
  await rel('SPOUSE', reza.id, dewi.id, { marriageDate: new Date('2010-04-10') })

  // Gen 1: Eko ↔ Ayu (spouse)
  await rel('SPOUSE', eko.id, ayu.id, { marriageDate: new Date('2018-11-21') })

  // Gen 1 → Gen 2: Budi + Siti → Bagas
  await rel('PARENT_CHILD', budiNode.id, bagas.id)
  await rel('PARENT_CHILD', sitiNode.id, bagas.id)

  // Gen 1 → Gen 2: Dewi + Reza → Zahra
  await rel('PARENT_CHILD', reza.id,  zahra.id)
  await rel('PARENT_CHILD', dewi.id, zahra.id)

  // Gen 1 → Gen 2: Eko + Ayu → Kiran
  await rel('PARENT_CHILD', eko.id, kiran.id)
  await rel('PARENT_CHILD', ayu.id, kiran.id)

  console.log('✓ Created family: Keluarga Santoso')
  console.log('')
  console.log('  Generation 0 : Ahmad (†) ↔ Sri')
  console.log('  Generation 1 : Budi ↔ Siti | Reza ↔ Dewi | Eko ↔ Ayu')
  console.log('  Generation 2 : Bagas | Zahra | Kiran')
  console.log('')
  console.log('Demo accounts:')
  console.log('  budi@example.com  / password123  (Family Head)')
  console.log('  siti@example.com  / password123  (Family Member)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
