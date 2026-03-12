import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { FamilyGroupsModule } from './family-groups/family-groups.module'
import { PersonNodesModule } from './person-nodes/person-nodes.module'
import { RelationshipsModule } from './relationships/relationships.module'
import { InvitesModule } from './invites/invites.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FamilyGroupsModule,
    PersonNodesModule,
    RelationshipsModule,
    InvitesModule,
  ],
})
export class AppModule {}
