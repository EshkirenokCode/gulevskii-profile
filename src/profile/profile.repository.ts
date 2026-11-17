import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { PROFILE_ID } from './profile-id.js';

@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPublicProfile() {
    const displayOrder = [{ position: 'asc' }, { key: 'asc' }] as const;
    return this.prisma.client.profile.findUnique({
      where: { id: PROFILE_ID },
      select: {
        name: true,
        description: true,
        links: {
          orderBy: [...displayOrder],
          select: { label: true, url: true },
        },
        skills: {
          orderBy: [...displayOrder],
          select: { name: true },
        },
        experience: {
          orderBy: [{ startMonth: 'desc' }, { key: 'asc' }],
          select: {
            company: true,
            position: true,
            startMonth: true,
            endMonth: true,
            achievements: true,
          },
        },
        projects: {
          orderBy: [...displayOrder],
          select: { name: true, url: true },
        },
      },
    });
  }
}
