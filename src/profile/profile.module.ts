import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { ProfileRepository } from './profile.repository.js';
import { ProfileResolver } from './profile.resolver.js';
import { ProfileService } from './profile.service.js';

@Module({
  providers: [PrismaService, ProfileRepository, ProfileService, ProfileResolver],
})
export class ProfileModule {}
