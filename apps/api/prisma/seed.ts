import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  await prisma.relationshipEdge.deleteMany()
  await prisma.personPhoto.deleteMany()
  await prisma.leaveRequest.deleteMany()
  await prisma.personNode.deleteMany()
  await prisma.invite.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.user.deleteMany()
  await prisma.familyGroup.deleteMany()

  console.log('✓ Cleared existing data')

  const passwordHash = await argon2.hash('password123')

  const familyGroup = await prisma.familyGroup.create({
    data: { name: 'Keluarga Besar Sadikin', description: 'Extended family of Aminah & Muniáh' },
  })
  const g = familyGroup.id

  // NIKs are sequential dummy values (0000000000000001 …) — not real NIKs.
  // Format: pad(n, 16) where n increments for each member in seed order.
  let nikCounter = 0
  const nextNik = () => String(++nikCounter).padStart(16, '0')

  const member = async (opts: {
    role?:        'FAMILY_HEAD' | 'FAMILY_MEMBER'
    displayName:  string
    gender:       'MALE' | 'FEMALE'
    surname?:     string
    birthDate:    Date
    birthPlace:   string
    isDeceased?:  boolean
    deathDate?:   Date
  }) => {
    const u = await prisma.user.create({
      data: {
        nik:          nextNik(),
        passwordHash,
        role:         opts.role ?? 'FAMILY_MEMBER',
        status:       'ACTIVE',
        personNodes: {
          create: {
            displayName:   opts.displayName,
            gender:        opts.gender,
            surname:       opts.surname ?? null,
            birthDate:     opts.birthDate,
            birthPlace:    opts.birthPlace,
            isDeceased:    opts.isDeceased ?? false,
            deathDate:     opts.deathDate ?? null,
            familyGroupId: g,
            role:          opts.role ?? 'FAMILY_MEMBER',
          },
        },
      },
      include: { personNodes: true },
    })
    return u.personNodes[0]!
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
  // GENERATION 0 — Uyut (great-great-grandparents)
  // ══════════════════════════════════════════════════════════════════════════

  // NIK 0000000000000001
  const aminah = await member({
    displayName: 'Aminah', surname: 'Uyut Cowo',
    gender: 'MALE',   birthDate: new Date('1920-01-01'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('1990-06-15'),
  })
  // NIK 0000000000000002
  const muniah = await member({
    displayName: "Muni'ah", surname: 'Uyut',
    gender: 'FEMALE', birthDate: new Date('1925-06-01'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('1995-03-20'),
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 1 — Aki / Nenek (children of Aminah + Muniáh, and their spouses)
  // ══════════════════════════════════════════════════════════════════════════

  // NIK 0000000000000003
  const sadikin = await member({
    displayName: 'Aki Sadikin', surname: 'Ikin',
    gender: 'MALE',   birthDate: new Date('1940-03-15'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2010-08-22'),
  })
  // NIK 0000000000000004  — Sadikin's wife
  const nani = await member({
    displayName: 'Nani Suryani', surname: 'Nani',
    gender: 'FEMALE', birthDate: new Date('1944-07-11'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2015-03-08'),
  })

  // NIK 0000000000000005
  const omang = await member({
    displayName: 'Aki Omang', surname: 'Omang',
    gender: 'MALE',   birthDate: new Date('1942-07-20'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2012-11-04'),
  })
  // NIK 0000000000000006
  const idik = await member({
    displayName: 'Aki Idik', surname: 'Idik',
    gender: 'MALE',   birthDate: new Date('1944-11-05'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2015-02-17'),
  })
  // NIK 0000000000000007
  const nEmi = await member({
    displayName: 'Nenek Emi', surname: 'Emi',
    gender: 'FEMALE', birthDate: new Date('1946-04-12'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2018-09-30'),
  })
  // NIK 0000000000000008
  const nTalon = await member({
    displayName: 'Nenek Talon', surname: 'Talon',
    gender: 'FEMALE', birthDate: new Date('1948-09-08'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2020-05-12'),
  })

  // Emun + Endang
  // NIK 0000000000000009
  const emun = await member({
    displayName: "Emun Munia'h", surname: 'Emun',
    gender: 'FEMALE', birthDate: new Date('1950-02-14'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2019-07-03'),
  })
  // NIK 0000000000000010
  const endang = await member({
    displayName: 'Aki Endang', surname: 'Endang',
    gender: 'MALE',   birthDate: new Date('1948-05-22'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2016-12-01'),
  })

  // Emin + Ono (†) + Yono
  // NIK 0000000000000011
  const emin = await member({
    displayName: "Emin Mu'minah", surname: 'Emin',
    gender: 'FEMALE', birthDate: new Date('1952-08-17'), birthPlace: 'Jawa Barat',
  })
  // NIK 0000000000000012
  const ono = await member({
    displayName: 'Ono Supratna', surname: 'Ono',
    gender: 'MALE',   birthDate: new Date('1945-10-03'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2000-04-19'),
  })
  // NIK 0000000000000013
  const yono = await member({
    displayName: 'Yono Budiono', surname: 'Yono',
    gender: 'MALE',   birthDate: new Date('1950-03-25'), birthPlace: 'Jawa Barat',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 2 — Wa / parent level
  // ══════════════════════════════════════════════════════════════════════════

  // Children of Emun + Endang
  // NIK 0000000000000014
  const tato = await member({
    displayName: 'Sutisna Riyanto', surname: 'Tato',
    gender: 'MALE',   birthDate: new Date('1970-09-01'), birthPlace: 'Bandung',
  })
  // NIK 0000000000000015
  const santi = await member({
    displayName: 'Santi Kusumawati', surname: 'Santi',
    gender: 'FEMALE', birthDate: new Date('1971-07-11'), birthPlace: 'Cimahi',
  })

  // NIK 0000000000000016
  const rini = await member({
    displayName: 'Wa Rini', surname: 'Rini',
    gender: 'FEMALE', birthDate: new Date('1972-04-20'), birthPlace: 'Bandung',
  })
  // NIK 0000000000000017
  const rudiHo = await member({
    displayName: 'Rudi Ho', surname: 'Rudi',
    gender: 'MALE',   birthDate: new Date('1970-02-28'), birthPlace: 'Bandung',
  })

  // NIK 0000000000000018
  const iwan = await member({
    displayName: 'Wa Iwan', surname: 'Iwan',
    gender: 'MALE',   birthDate: new Date('1975-12-15'), birthPlace: 'Bandung',
  })

  // Child of Sadikin + Nani — older branch that leads to Gen 5
  // NIK 0000000000000019
  const tatang = await member({
    displayName: 'Tatang Sadikin', surname: 'Tatang',
    gender: 'MALE',   birthDate: new Date('1963-04-08'), birthPlace: 'Bandung',
  })
  // NIK 0000000000000020  — Tatang's wife
  const lisna = await member({
    displayName: 'Lisna Halimah', surname: 'Lisna',
    gender: 'FEMALE', birthDate: new Date('1965-10-19'), birthPlace: 'Sumedang',
  })

  // Child of Emin + Ono
  // NIK 0000000000000021
  const diding = await member({
    displayName: 'Diding Saefudin', surname: 'Diding',
    gender: 'MALE',   birthDate: new Date('1968-06-12'), birthPlace: 'Bandung',
  })
  // NIK 0000000000000022
  const astrid = await member({
    displayName: 'Astrid Wulandari', surname: 'Astrid',
    gender: 'FEMALE', birthDate: new Date('1970-08-30'), birthPlace: 'Bogor',
  })

  // Children of Emin + Yono
  // NIK 0000000000000023
  const andi = await member({
    role: 'FAMILY_HEAD',
    displayName: 'Andi Budiono', surname: 'Endis',
    gender: 'MALE',   birthDate: new Date('1972-03-07'), birthPlace: 'Bandung',
  })
  // NIK 0000000000000024
  const eno = await member({
    displayName: 'Eno Songkoyono', surname: 'Eno',
    gender: 'FEMALE', birthDate: new Date('1974-05-16'), birthPlace: 'Bekasi',
  })

  // NIK 0000000000000025
  const retno = await member({
    displayName: 'Retno Budiyati', surname: 'Enok',
    gender: 'FEMALE', birthDate: new Date('1975-11-22'), birthPlace: 'Bandung',
  })
  // NIK 0000000000000026
  const jati = await member({
    displayName: 'Om Jati Sejati', surname: 'Jati',
    gender: 'MALE',   birthDate: new Date('1973-01-19'), birthPlace: 'Sumedang',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 3 — grandchild level
  // ══════════════════════════════════════════════════════════════════════════

  // Children of Tato + Santi
  // NIK 0000000000000027
  const andika = await member({
    displayName: 'Andika', surname: 'Andika',
    gender: 'MALE',   birthDate: new Date('1993-03-12'), birthPlace: 'Bandung',
  })
  // NIK 0000000000000028
  const siska = await member({
    displayName: 'Siska Andriani', surname: 'Siska',
    gender: 'FEMALE', birthDate: new Date('1993-02-14'), birthPlace: 'Cimahi',
  })

  // NIK 0000000000000029
  const pipit = await member({
    displayName: 'Pipit', surname: 'Pipit',
    gender: 'FEMALE', birthDate: new Date('1995-09-05'), birthPlace: 'Bandung',
  })
  // NIK 0000000000000030
  const agus = await member({
    displayName: 'Agus Sujatmiko', surname: 'Agus',
    gender: 'MALE',   birthDate: new Date('1993-06-22'), birthPlace: 'Garut',
  })

  // Children of Rini + Rudi
  // NIK 0000000000000031
  const adya = await member({
    displayName: 'Adya', surname: 'Adya',
    gender: 'MALE',   birthDate: new Date('1994-11-21'), birthPlace: 'Bandung',
  })
  // NIK 0000000000000032
  const alya = await member({
    displayName: 'Alya Ariesta Riyantina', surname: 'Alya',
    gender: 'FEMALE', birthDate: new Date('1997-06-08'), birthPlace: 'Bandung',
  })

  // Child of Tatang + Lisna — the branch leading to Gen 5
  // NIK 0000000000000033
  const cahya = await member({
    displayName: 'Cahya Pratama', surname: 'Cahya',
    gender: 'MALE',   birthDate: new Date('1985-07-14'), birthPlace: 'Bandung',
  })
  // NIK 0000000000000034  — Cahya's wife
  const rima = await member({
    displayName: 'Rima Destiani', surname: 'Rima',
    gender: 'FEMALE', birthDate: new Date('1987-11-02'), birthPlace: 'Garut',
  })

  // Children of Diding + Astrid
  // NIK 0000000000000035
  const favian = await member({
    displayName: 'Favian Izza Diasputra', surname: 'Vian',
    gender: 'MALE',   birthDate: new Date('1998-01-10'), birthPlace: 'Bandung',
  })
  // NIK 0000000000000036
  const saffa = await member({
    displayName: 'Saffanah Elvaretta Diasputri', surname: 'Saffa',
    gender: 'FEMALE', birthDate: new Date('2001-07-25'), birthPlace: 'Bandung',
  })

  // Children of Andi + Eno
  // NIK 0000000000000037
  const dino = await member({
    displayName: 'Eldino Muhammad Rafif', surname: 'Dino',
    gender: 'MALE',   birthDate: new Date('1997-04-15'), birthPlace: 'Bekasi',
  })
  // NIK 0000000000000038  — Dino's wife
  const mira = await member({
    displayName: 'Mira Aulia', surname: 'Mira',
    gender: 'FEMALE', birthDate: new Date('1999-08-23'), birthPlace: 'Jakarta',
  })

  // NIK 0000000000000039
  const noy = await member({
    displayName: 'Anne Akeyla Aishabira', surname: 'Noy',
    gender: 'FEMALE', birthDate: new Date('2000-09-12'), birthPlace: 'Bekasi',
  })
  // NIK 0000000000000040
  const andin = await member({
    displayName: 'Andin Akeyla Aishabira', surname: 'Andin',
    gender: 'FEMALE', birthDate: new Date('2002-12-03'), birthPlace: 'Bekasi',
  })

  // Children of Retno + Jati
  // NIK 0000000000000041
  const afnan = await member({
    displayName: 'Afnan The Waffles', surname: 'Afnan',
    gender: 'MALE',   birthDate: new Date('2000-08-17'), birthPlace: 'Sumedang',
  })
  // NIK 0000000000000042
  const afika = await member({
    displayName: 'Afika Akeyla Aishabira', surname: 'Afika',
    gender: 'FEMALE', birthDate: new Date('2003-05-24'), birthPlace: 'Sumedang',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 4
  // ══════════════════════════════════════════════════════════════════════════

  // Child of Pipit + Agus
  // NIK 0000000000000043
  const naya = await member({
    displayName: 'Naya', surname: 'Naya',
    gender: 'FEMALE', birthDate: new Date('2020-11-07'), birthPlace: 'Bandung',
  })

  // Child of Andika + Siska
  // NIK 0000000000000044
  const raka = await member({
    displayName: 'Raka Andika Putra', surname: 'Raka',
    gender: 'MALE',   birthDate: new Date('2019-05-03'), birthPlace: 'Bandung',
  })

  // Children of Cahya + Rima — the oldest Gen 4, able to be parents
  // NIK 0000000000000045
  const dzaky = await member({
    displayName: 'Dzaky Pratama', surname: 'Dzaky',
    gender: 'MALE',   birthDate: new Date('2006-02-18'), birthPlace: 'Bandung',
  })
  // NIK 0000000000000046  — Dzaky's wife
  const putri = await member({
    displayName: 'Putri Ramadhani', surname: 'Putri',
    gender: 'FEMALE', birthDate: new Date('2007-06-09'), birthPlace: 'Bandung',
  })

  // Child of Dino + Mira
  // NIK 0000000000000047
  const azka = await member({
    displayName: 'Azka Rafif', surname: 'Azka',
    gender: 'MALE',   birthDate: new Date('2023-03-15'), birthPlace: 'Bekasi',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 5 — children of Dzaky + Putri (great-great-great-grandchildren)
  // ══════════════════════════════════════════════════════════════════════════

  // NIK 0000000000000048
  const rayyan = await member({
    displayName: 'Rayyan Al-Fatih', surname: 'Rayyan',
    gender: 'MALE',   birthDate: new Date('2025-01-20'), birthPlace: 'Bandung',
  })
  // NIK 0000000000000049
  const arsa = await member({
    displayName: 'Arsa Aulia', surname: 'Arsa',
    gender: 'FEMALE', birthDate: new Date('2026-02-14'), birthPlace: 'Bandung',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // RELATIONSHIPS
  // ══════════════════════════════════════════════════════════════════════════

  // Gen 0 couple
  await rel('SPOUSE', aminah.id, muniah.id, { marriageDate: new Date('1939-04-10') })

  // Gen 0 → Gen 1 (7 blood children of Aminah + Muniáh)
  for (const child of [sadikin, omang, idik, nEmi, nTalon, emun, emin]) {
    await rel('PARENT_CHILD', aminah.id, child.id)
    await rel('PARENT_CHILD', muniah.id, child.id)
  }

  // Gen 1 couples
  await rel('SPOUSE', sadikin.id, nani.id,   { marriageDate: new Date('1962-08-17') })
  await rel('SPOUSE', endang.id,  emun.id,   { marriageDate: new Date('1968-05-17') })
  await rel('SPOUSE', ono.id,     emin.id,   { marriageDate: new Date('1966-09-20') })
  await rel('SPOUSE', yono.id,    emin.id,   { marriageDate: new Date('2003-01-15') })

  // Gen 1 → Gen 2
  // Sadikin + Nani → Tatang
  await rel('PARENT_CHILD', sadikin.id, tatang.id)
  await rel('PARENT_CHILD', nani.id,    tatang.id)
  // Emun + Endang → Tato, Rini, Iwan
  for (const id of [tato.id, rini.id, iwan.id]) {
    await rel('PARENT_CHILD', emun.id,   id)
    await rel('PARENT_CHILD', endang.id, id)
  }
  // Emin + Ono → Diding
  await rel('PARENT_CHILD', emin.id, diding.id)
  await rel('PARENT_CHILD', ono.id,  diding.id)
  // Emin + Yono → Andi, Retno
  for (const id of [andi.id, retno.id]) {
    await rel('PARENT_CHILD', emin.id, id)
    await rel('PARENT_CHILD', yono.id, id)
  }

  // Gen 2 couples
  await rel('SPOUSE', tato.id,   santi.id,  { marriageDate: new Date('1992-03-08') })
  await rel('SPOUSE', rudiHo.id, rini.id,   { marriageDate: new Date('1993-11-25') })
  await rel('SPOUSE', tatang.id, lisna.id,  { marriageDate: new Date('1984-02-21') })
  await rel('SPOUSE', diding.id, astrid.id, { marriageDate: new Date('1996-08-17') })
  await rel('SPOUSE', andi.id,   eno.id,    { marriageDate: new Date('1996-02-14') })
  await rel('SPOUSE', jati.id,   retno.id,  { marriageDate: new Date('1999-07-07') })

  // Gen 2 → Gen 3
  for (const id of [andika.id, pipit.id]) {
    await rel('PARENT_CHILD', tato.id,  id)
    await rel('PARENT_CHILD', santi.id, id)
  }
  for (const id of [adya.id, alya.id]) {
    await rel('PARENT_CHILD', rudiHo.id, id)
    await rel('PARENT_CHILD', rini.id,   id)
  }
  // Tatang + Lisna → Cahya
  await rel('PARENT_CHILD', tatang.id, cahya.id)
  await rel('PARENT_CHILD', lisna.id,  cahya.id)
  for (const id of [favian.id, saffa.id]) {
    await rel('PARENT_CHILD', diding.id, id)
    await rel('PARENT_CHILD', astrid.id, id)
  }
  for (const id of [dino.id, noy.id, andin.id]) {
    await rel('PARENT_CHILD', andi.id, id)
    await rel('PARENT_CHILD', eno.id,  id)
  }
  for (const id of [afnan.id, afika.id]) {
    await rel('PARENT_CHILD', jati.id,  id)
    await rel('PARENT_CHILD', retno.id, id)
  }

  // Gen 3 couples
  await rel('SPOUSE', andika.id, siska.id, { marriageDate: new Date('2018-06-10') })
  await rel('SPOUSE', agus.id,   pipit.id, { marriageDate: new Date('2019-09-21') })
  await rel('SPOUSE', cahya.id,  rima.id,  { marriageDate: new Date('2007-03-15') })
  await rel('SPOUSE', dino.id,   mira.id,  { marriageDate: new Date('2022-11-05') })

  // Gen 3 → Gen 4
  await rel('PARENT_CHILD', agus.id,   naya.id)
  await rel('PARENT_CHILD', pipit.id,  naya.id)
  await rel('PARENT_CHILD', andika.id, raka.id)
  await rel('PARENT_CHILD', siska.id,  raka.id)
  await rel('PARENT_CHILD', cahya.id,  dzaky.id)
  await rel('PARENT_CHILD', rima.id,   dzaky.id)
  await rel('PARENT_CHILD', dino.id,   azka.id)
  await rel('PARENT_CHILD', mira.id,   azka.id)

  // Gen 4 couple
  await rel('SPOUSE', dzaky.id, putri.id, { marriageDate: new Date('2024-08-10') })

  // Gen 4 → Gen 5
  await rel('PARENT_CHILD', dzaky.id, rayyan.id)
  await rel('PARENT_CHILD', putri.id, rayyan.id)
  await rel('PARENT_CHILD', dzaky.id, arsa.id)
  await rel('PARENT_CHILD', putri.id, arsa.id)

  console.log('✓ Created family: Keluarga Besar Sadikin')
  console.log('')
  console.log('  Gen 0 : Aminah (Uyut Cowo) ↔ Muniáh (Uyut)')
  console.log('  Gen 1 : Sadikin↔Nani | Omang | Idik | Nenek Emi | Nenek Talon')
  console.log('          Emun↔Endang | Emin↔Ono(†)↔Yono')
  console.log('  Gen 2 : Tato↔Santi | Rini↔Rudi | Iwan | Tatang↔Lisna')
  console.log('          Diding↔Astrid | Andi↔Eno | Retno↔Jati')
  console.log('  Gen 3 : Andika↔Siska | Pipit↔Agus | Adya | Alya | Cahya↔Rima')
  console.log('          Favian (Vian) | Saffa | Dino↔Mira | Noy | Andin | Afnan | Afika')
  console.log('  Gen 4 : Naya | Raka | Dzaky↔Putri | Azka')
  console.log('  Gen 5 : Rayyan | Arsa')
  console.log('')
  console.log('  49 family members, all NIKs are sequential dummies (0000000000000001…)')
  console.log('  All passwords: password123')
  console.log('  Family Head: Andi Budiono — NIK 0000000000000023')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => { void prisma.$disconnect() })
