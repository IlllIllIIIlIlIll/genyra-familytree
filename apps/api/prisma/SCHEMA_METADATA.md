# Genyra — Database Schema Metadata

Last updated: 2026-03-17

---

## User

Authentication account. One-to-one with PersonNode.

| Field         | Type           | Description |
|---------------|----------------|-------------|
| id            | String (cuid)  | Primary key |
| nik           | String (unique)| 16-digit national ID — login credential |
| passwordHash  | String         | Argon2 hashed password |
| role          | UserRole       | `FAMILY_MEMBER` (default) or `FAMILY_HEAD` (admin) |
| status        | MemberStatus   | `PENDING_APPROVAL`, `ACTIVE`, or `DEACTIVATED` |
| refreshToken  | String?        | JWT refresh token (stored hashed or raw) |
| personNode    | PersonNode?    | Linked family tree node |
| createdAt     | DateTime       | Auto-set on creation |
| updatedAt     | DateTime       | Auto-updated on change |

## FamilyGroup

A private family network container. All nodes/edges belong to one group.

| Field       | Type          | Description |
|-------------|---------------|-------------|
| id          | String (cuid) | Primary key |
| name        | String        | Family group display name |
| description | String?       | Optional description |
| members     | PersonNode[]  | All nodes in this family |
| invites     | Invite[]      | Invite codes issued for this group |
| createdAt   | DateTime      | Auto-set on creation |
| updatedAt   | DateTime      | Auto-updated on change |

## PersonNode

A node on the family map. May or may not be linked to a User account (placeholder nodes represent deceased relatives, unregistered members, etc.).

| Field         | Type           | Description |
|---------------|----------------|-------------|
| id            | String (cuid)  | Primary key |
| displayName   | String         | Full display name (max 100 chars) |
| gender        | Gender?        | `MALE` or `FEMALE` — null if unknown |
| surname       | String?        | Nickname / panggilan (e.g. "Vian"), not family name |
| birthDate     | DateTime?      | Date of birth |
| birthPlace    | String?        | City of birth (max 100 chars) |
| deathDate     | DateTime?      | Date of death — only set if isDeceased |
| bio           | String?        | Free-text biography (max 2000 chars) |
| avatarUrl     | String?        | Base64 data URL of the profile photo (stored in DB) |
| isDeceased    | Boolean        | True if this person has passed away |
| isPlaceholder | Boolean        | True if this node was created as a structural placeholder |
| canvasX       | Float          | Persisted X position on the family map canvas |
| canvasY       | Float          | Persisted Y position on the family map canvas |
| userId        | String? (unique)| FK → User.id — null for placeholder/deceased nodes |
| familyGroupId | String?        | FK → FamilyGroup.id |
| photos        | PersonPhoto[]  | Memory photos attached to this person |
| createdAt     | DateTime       | Auto-set on creation |
| updatedAt     | DateTime       | Auto-updated on change |

> **NIK**: Not stored on PersonNode. For linked nodes (userId set), NIK is read from `User.nik`. Placeholders have no NIK.

## RelationshipEdge

A directed edge between two PersonNodes. Encodes family relationships.

| Field            | Type             | Description |
|------------------|------------------|-------------|
| id               | String (cuid)    | Primary key |
| relationshipType | RelationshipType | `PARENT_CHILD`, `SPOUSE`, or `SIBLING` |
| sourceId         | String           | FK → PersonNode.id |
| targetId         | String           | FK → PersonNode.id |
| marriageDate     | DateTime?        | Marriage date (SPOUSE edges only) |
| divorceDate      | DateTime?        | Divorce/separation date (SPOUSE edges only) |
| notes            | String?          | Free-text notes about the relationship |
| createdAt        | DateTime         | Auto-set on creation |

> Unique constraint on (sourceId, targetId, relationshipType) — no duplicate edges.

## PersonPhoto

A memory photo attached to a PersonNode. Image data stored as base64 data URL.

| Field       | Type          | Description |
|-------------|---------------|-------------|
| id          | String (cuid) | Primary key |
| url         | String        | Base64 data URL (`data:image/jpeg;base64,...`) — full image stored in DB |
| caption     | String?       | Optional caption (max 500 chars) |
| takenAt     | DateTime?     | When the photo was taken |
| sortOrder   | Int           | Display order (ascending) — default 0 |
| personNodeId| String        | FK → PersonNode.id |
| createdAt   | DateTime      | Auto-set on creation |

> **Limit**: Max 20 photos per PersonNode.

## Invite

An invite code granting access to a FamilyGroup.

| Field        | Type          | Description |
|--------------|---------------|-------------|
| id           | String (cuid) | Primary key |
| code         | String (unique)| Short code e.g. `GEN-X7K2` |
| status       | InviteStatus  | `UNUSED`, `USED`, or `EXPIRED` |
| expiresAt    | DateTime      | Expiry timestamp |
| familyGroupId| String        | FK → FamilyGroup.id |
| createdAt    | DateTime      | Auto-set on creation |
| usedAt       | DateTime?     | When the invite was redeemed |

---

## Enums

| Enum             | Values |
|------------------|--------|
| Gender           | `MALE`, `FEMALE` |
| UserRole         | `FAMILY_MEMBER`, `FAMILY_HEAD` |
| MemberStatus     | `PENDING_APPROVAL`, `ACTIVE`, `DEACTIVATED` |
| RelationshipType | `PARENT_CHILD`, `SPOUSE`, `SIBLING` |
| InviteStatus     | `UNUSED`, `USED`, `EXPIRED` |
