import { Injectable, NotFoundException } from '@nestjs/common';
import type { Profile } from './profile.model.js';
import { ProfileRepository } from './profile.repository.js';

@Injectable()
export class ProfileService {
  constructor(private readonly repository: ProfileRepository) {}

  async getPublicProfile(): Promise<Profile> {
    const profile = await this.repository.findPublicProfile();
    if (!profile) {
      throw new NotFoundException('Публичный профиль не найден');
    }

    return profile;
  }
}
