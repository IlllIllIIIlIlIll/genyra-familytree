/**
 * Static, non-persisted demo family used by the public `/demo` route.
 *
 * Structure (2 grandparent couples whose children marry each other, plus
 * grandchildren — 8 people, 3 generations):
 *
 *   Ahmad ♡ Siti        Budi ♡ Wati
 *        \                 /
 *         Deni ─────────Rina
 *              /       \
 *           Andi       Maya
 *
 * This is typed against the real `MapData`/`PersonNode`/`RelationshipEdge`
 * shapes so the demo canvas can reuse the exact same layout engine and node
 * components as the authenticated map — but it is never sent to, or fetched
 * from, the backend. All timestamps/NIKs below are made up.
 */
import type { MapData, PersonNode, RelationshipEdge } from '@genyra/shared-types'

const NOW = '2024-01-01T00:00:00.000Z'

function isoDate(date: string): string {
  return `${date}T00:00:00.000Z`
}

function person(overrides: Pick<PersonNode, 'id' | 'displayName' | 'gender' | 'surname' | 'birthDate' | 'birthPlace' | 'nik'>): PersonNode {
  return {
    bio: null,
    avatarUrl: null,
    deathDate: null,
    isDeceased: false,
    isPlaceholder: false,
    canvasX: 0,
    canvasY: 0,
    nikId: null,
    familyGroupId: 'demo-family',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export const DEMO_FAMILY_GROUP_ID = 'demo-family'

export const demoNodes: PersonNode[] = [
  // ── Generation 0: grandparents ─────────────────────────────────────────
  person({
    id: 'demo-ahmad',
    displayName: 'Ahmad Wijaya',
    gender: 'MALE',
    surname: 'Ahmad',
    nik: '3271010305540001',
    birthDate: isoDate('1954-03-12'),
    birthPlace: 'Jakarta',
  }),
  person({
    id: 'demo-siti',
    displayName: 'Siti Aminah',
    gender: 'FEMALE',
    surname: 'Siti',
    nik: '3271014907570002',
    birthDate: isoDate('1957-07-22'),
    birthPlace: 'Bandung',
  }),
  person({
    id: 'demo-budi',
    displayName: 'Budi Santoso',
    gender: 'MALE',
    surname: 'Budi',
    nik: '3578013001530003',
    birthDate: isoDate('1953-01-30'),
    birthPlace: 'Surabaya',
  }),
  person({
    id: 'demo-wati',
    displayName: 'Wati Lestari',
    gender: 'FEMALE',
    surname: 'Wati',
    nik: '3404014511580004',
    birthDate: isoDate('1958-11-05'),
    birthPlace: 'Yogyakarta',
  }),

  // ── Generation 1: children who married each other ──────────────────────
  person({
    id: 'demo-deni',
    displayName: 'Deni Wijaya',
    gender: 'MALE',
    surname: 'Deni',
    nik: '3271011805820005',
    birthDate: isoDate('1982-05-18'),
    birthPlace: 'Jakarta',
  }),
  person({
    id: 'demo-rina',
    displayName: 'Rina Santoso',
    gender: 'FEMALE',
    surname: 'Rina',
    nik: '3578014909840006',
    birthDate: isoDate('1984-09-09'),
    birthPlace: 'Surabaya',
  }),

  // ── Generation 2: grandchildren ─────────────────────────────────────────
  person({
    id: 'demo-andi',
    displayName: 'Andi Wijaya',
    gender: 'MALE',
    surname: 'Andi',
    nik: '3271011402120007',
    birthDate: isoDate('2012-02-14'),
    birthPlace: 'Jakarta',
  }),
  person({
    id: 'demo-maya',
    displayName: 'Maya Wijaya',
    gender: 'FEMALE',
    surname: 'Maya',
    nik: '3271013008150008',
    birthDate: isoDate('2015-08-30'),
    birthPlace: 'Jakarta',
  }),
]

export const demoEdges: RelationshipEdge[] = [
  // Grandparent couples
  { id: 'demo-e-ahmad-siti', relationshipType: 'SPOUSE', sourceId: 'demo-ahmad', targetId: 'demo-siti', marriageDate: isoDate('1978-06-10'), divorceDate: null, notes: null, createdAt: NOW },
  { id: 'demo-e-budi-wati', relationshipType: 'SPOUSE', sourceId: 'demo-budi', targetId: 'demo-wati', marriageDate: isoDate('1979-04-02'), divorceDate: null, notes: null, createdAt: NOW },

  // Ahmad + Siti -> Deni
  { id: 'demo-e-ahmad-deni', relationshipType: 'PARENT_CHILD', sourceId: 'demo-ahmad', targetId: 'demo-deni', marriageDate: null, divorceDate: null, notes: null, createdAt: NOW },
  { id: 'demo-e-siti-deni', relationshipType: 'PARENT_CHILD', sourceId: 'demo-siti', targetId: 'demo-deni', marriageDate: null, divorceDate: null, notes: null, createdAt: NOW },

  // Budi + Wati -> Rina
  { id: 'demo-e-budi-rina', relationshipType: 'PARENT_CHILD', sourceId: 'demo-budi', targetId: 'demo-rina', marriageDate: null, divorceDate: null, notes: null, createdAt: NOW },
  { id: 'demo-e-wati-rina', relationshipType: 'PARENT_CHILD', sourceId: 'demo-wati', targetId: 'demo-rina', marriageDate: null, divorceDate: null, notes: null, createdAt: NOW },

  // Deni + Rina (the two families marrying each other)
  { id: 'demo-e-deni-rina', relationshipType: 'SPOUSE', sourceId: 'demo-deni', targetId: 'demo-rina', marriageDate: isoDate('2008-10-25'), divorceDate: null, notes: null, createdAt: NOW },

  // Deni + Rina -> Andi, Maya
  { id: 'demo-e-deni-andi', relationshipType: 'PARENT_CHILD', sourceId: 'demo-deni', targetId: 'demo-andi', marriageDate: null, divorceDate: null, notes: null, createdAt: NOW },
  { id: 'demo-e-rina-andi', relationshipType: 'PARENT_CHILD', sourceId: 'demo-rina', targetId: 'demo-andi', marriageDate: null, divorceDate: null, notes: null, createdAt: NOW },
  { id: 'demo-e-deni-maya', relationshipType: 'PARENT_CHILD', sourceId: 'demo-deni', targetId: 'demo-maya', marriageDate: null, divorceDate: null, notes: null, createdAt: NOW },
  { id: 'demo-e-rina-maya', relationshipType: 'PARENT_CHILD', sourceId: 'demo-rina', targetId: 'demo-maya', marriageDate: null, divorceDate: null, notes: null, createdAt: NOW },
]

export const demoMapData: MapData = {
  familyName: 'The Wijaya–Santoso Family (Demo)',
  nodes: demoNodes,
  edges: demoEdges,
}
