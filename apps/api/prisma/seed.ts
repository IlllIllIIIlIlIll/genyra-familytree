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

  const passwordHash = await argon2.hash('password123')

  // ── Family group ───────────────────────────────────────────────────────────
  const familyGroup = await prisma.familyGroup.create({
    data: { name: 'Keluarga Santoso', description: 'Santoso family tree' },
  })
  const g = familyGroup.id

  // Helper: create a user + linked person node in one call
  const member = async (opts: {
    nik:         string
    role?:       'FAMILY_HEAD' | 'FAMILY_MEMBER'
    displayName: string
    gender:      'MALE' | 'FEMALE'
    surname:     string
    birthDate:   Date
    birthPlace:  string
  }) => {
    const u = await prisma.user.create({
      data: {
        nik:          opts.nik,
        passwordHash,
        role:         opts.role ?? 'FAMILY_MEMBER',
        status:       'ACTIVE',
        personNode: {
          create: {
            displayName: opts.displayName,
            gender:      opts.gender,
            surname:     opts.surname,
            nik:         opts.nik,
            birthDate:   opts.birthDate,
            birthPlace:  opts.birthPlace,
            familyGroupId: g,
          },
        },
      },
      include: { personNode: true },
    })
    return u.personNode!
  }

  const rel = (
    type: 'PARENT_CHILD' | 'SPOUSE' | 'SIBLING',
    src:  string,
    tgt:  string,
    extra?: object,
  ) => prisma.relationshipEdge.create({
    data: { relationshipType: type, sourceId: src, targetId: tgt, ...extra },
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 0 — Grandparents
  // ══════════════════════════════════════════════════════════════════════════

  const ahmad = await member({
    nik: '3276010101500001', role: 'FAMILY_HEAD',
    displayName: 'Ahmad Santoso', gender: 'MALE', surname: 'Santoso',
    birthDate: new Date('1950-01-01'), birthPlace: 'Yogyakarta',
  })

  const sri = await member({
    nik: '3276014602520002',
    displayName: 'Sri Mulyani', gender: 'FEMALE', surname: 'Mulyani',
    birthDate: new Date('1952-02-06'), birthPlace: 'Solo',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 1 — Parents (Ahmad & Sri's children + their spouses)
  // ══════════════════════════════════════════════════════════════════════════

  const budi = await member({
    nik: '3276011009800003',
    displayName: 'Budi Santoso', gender: 'MALE', surname: 'Santoso',
    birthDate: new Date('1980-09-10'), birthPlace: 'Jakarta',
  })

  const siti = await member({
    nik: '3271014505820004',
    displayName: 'Siti Rahayu', gender: 'FEMALE', surname: 'Rahayu',
    birthDate: new Date('1982-05-05'), birthPlace: 'Bandung',
  })

  const dewi = await member({
    nik: '3276015510850005',
    displayName: 'Dewi Santoso', gender: 'FEMALE', surname: 'Santoso',
    birthDate: new Date('1985-10-15'), birthPlace: 'Yogyakarta',
  })

  const reza = await member({
    nik: '3271010812830006',
    displayName: 'Reza Purnama', gender: 'MALE', surname: 'Purnama',
    birthDate: new Date('1983-12-08'), birthPlace: 'Surabaya',
  })

  const eko = await member({
    nik: '3276010302900007',
    displayName: 'Eko Santoso', gender: 'MALE', surname: 'Santoso',
    birthDate: new Date('1990-02-03'), birthPlace: 'Solo',
  })

  const ayu = await member({
    nik: '3271012005920008',
    displayName: 'Ayu Lestari', gender: 'FEMALE', surname: 'Lestari',
    birthDate: new Date('1992-05-20'), birthPlace: 'Bali',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 2 — Grandchildren
  // ══════════════════════════════════════════════════════════════════════════

  const bagas = await member({
    nik: '3276011501120009',
    displayName: 'Bagas Santoso', gender: 'MALE', surname: 'Santoso',
    birthDate: new Date('2012-01-15'), birthPlace: 'Jakarta',
  })

  const zahra = await member({
    nik: '3271012003140010',
    displayName: 'Zahra Purnama', gender: 'FEMALE', surname: 'Purnama',
    birthDate: new Date('2014-03-20'), birthPlace: 'Surabaya',
  })

  const kiran = await member({
    nik: '3271010610180011',
    displayName: 'Kiran Santoso', gender: 'MALE', surname: 'Santoso',
    birthDate: new Date('2018-10-06'), birthPlace: 'Denpasar',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // RELATIONSHIPS
  // ══════════════════════════════════════════════════════════════════════════

  // Gen 0 couple
  await rel('SPOUSE', ahmad.id, sri.id, { marriageDate: new Date('1978-06-15') })

  // Gen 0 → Gen 1
  await rel('PARENT_CHILD', ahmad.id, budi.id)
  await rel('PARENT_CHILD', sri.id,   budi.id)
  await rel('PARENT_CHILD', ahmad.id, dewi.id)
  await rel('PARENT_CHILD', sri.id,   dewi.id)
  await rel('PARENT_CHILD', ahmad.id, eko.id)
  await rel('PARENT_CHILD', sri.id,   eko.id)

  // Gen 1 couples  (male always listed as source — woman to his right on canvas)
  await rel('SPOUSE', budi.id, siti.id, { marriageDate: new Date('2008-08-17') })
  await rel('SPOUSE', reza.id, dewi.id, { marriageDate: new Date('2010-04-10') })
  await rel('SPOUSE', eko.id,  ayu.id,  { marriageDate: new Date('2015-11-21') })

  // Gen 1 → Gen 2
  await rel('PARENT_CHILD', budi.id, bagas.id)
  await rel('PARENT_CHILD', siti.id, bagas.id)
  await rel('PARENT_CHILD', reza.id, zahra.id)
  await rel('PARENT_CHILD', dewi.id, zahra.id)
  await rel('PARENT_CHILD', eko.id,  kiran.id)
  await rel('PARENT_CHILD', ayu.id,  kiran.id)

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('✓ Created family: Keluarga Santoso')
  console.log('')
  console.log('  Gen 0 : Ahmad (Family Head) ↔ Sri')
  console.log('  Gen 1 : Budi↔Siti | Reza↔Dewi | Eko↔Ayu')
  console.log('  Gen 2 : Bagas | Zahra | Kiran')
  console.log('')
  console.log('All 11 members have user accounts (NIK login, password: password123)')
  console.log('')
  console.log('Demo accounts:')
  console.log('  NIK: 3276010101500001 / password123  (Ahmad — Family Head)')
  console.log('  NIK: 3276011009800003 / password123  (Budi)')
  console.log('  NIK: 3271014505820004 / password123  (Siti)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
