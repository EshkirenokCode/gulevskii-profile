import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createPrismaClient } from './prisma.js';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client = createPrismaClient();

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
