import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { User, MemberStatus } from '@genyra/shared-types'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundException('User not found')
    return this.toUserDto(user)
  }

  async findPendingByGroup(familyGroupId: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { familyGroupId, status: 'PENDING_APPROVAL' },
    })
    return users.map((u) => this.toUserDto(u))
  }

  async updateStatus(userId: string, status: MemberStatus): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
    })
    return this.toUserDto(user)
  }

  private toUserDto(user: {
    id: string
    email: string
    role: string
    status: string
    familyGroupId: string | null
    createdAt: Date
  }): User {
    return {
      id: user.id,
      email: user.email,
      role: user.role as User['role'],
      status: user.status as User['status'],
      familyGroupId: user.familyGroupId,
      createdAt: user.createdAt.toISOString(),
    }
  }
}
