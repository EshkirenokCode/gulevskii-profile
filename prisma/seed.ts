import { createPrismaClient } from '../src/database/prisma.js';
import { PROFILE_ID } from '../src/profile/profile-id.js';

const profile = {
  name: 'Илья Гулевский',
  description: 'Я fullstack-разработчик. Делаю CRM, пишу бэкенд-сервисы и подключаю LLM.',
};

const links = [
  { key: 'portfolio', label: 'Портфолио', url: 'https://gulevskii.dev/' },
  { key: 'github', label: 'GitHub', url: 'https://github.com/EshkirenokCode' },
];

const skills = [
  'TypeScript', 'Node.js', 'React', 'Next.js', 'Python', 'FastAPI', 'Go',
  'PostgreSQL', 'Docker', 'REST API', 'Git', 'LLM API', 'MCP',
].map((name) => ({ key: name, name }));

const experience = [
  {
    key: 'tander',
    company: 'АО «Тандер»',
    position: 'IT-специалист',
    startMonth: '2021-05',
    endMonth: '2023-11',
    achievements: ['Работал с Windows Server, Active Directory, IIS, SQL Server и PowerShell.'],
  },
  {
    key: 'independent',
    company: 'Самостоятельная работа',
    position: 'Fullstack-разработчик',
    startMonth: '2023-11',
    endMonth: null,
    achievements: [
      'С нуля разработал CRM МАЯК, которой пользуются три строительные компании.',
      'Добавил ИИ-сводку по стройплощадкам, которую руководители запускают из CRM.',
    ],
  },
];

const projects = [
  { key: 'mayak', name: 'МАЯК', url: 'https://gulevskii.dev/#work' },
  { key: 'saipport', name: 'sAIpport', url: 'https://github.com/EshkirenokCode/S-AI-pport' },
  { key: 'entitylens', name: 'EntityLens', url: 'https://github.com/EshkirenokCode/EntityLens' },
];

async function seed() {
  const prisma = createPrismaClient();
  try {
    await prisma.$transaction(async (tx) => {
      // Two app instances can seed the same profile during a deploy.
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${PROFILE_ID}))`;
      await tx.profile.upsert({
        where: { id: PROFILE_ID },
        create: { id: PROFILE_ID, ...profile },
        update: profile,
      });

      for (const [position, link] of links.entries()) {
        const data = { profileId: PROFILE_ID, position, ...link };
        await tx.link.upsert({
          where: { profileId_key: { profileId: PROFILE_ID, key: link.key } },
          create: data,
          update: data,
        });
      }

      for (const [position, skill] of skills.entries()) {
        const data = { profileId: PROFILE_ID, position, ...skill };
        await tx.skill.upsert({
          where: { profileId_key: { profileId: PROFILE_ID, key: skill.key } },
          create: data,
          update: data,
        });
      }

      for (const job of experience) {
        const data = { profileId: PROFILE_ID, ...job };
        await tx.experience.upsert({
          where: { profileId_key: { profileId: PROFILE_ID, key: job.key } },
          create: data,
          update: data,
        });
      }

      for (const [position, project] of projects.entries()) {
        const data = { profileId: PROFILE_ID, position, ...project };
        await tx.project.upsert({
          where: { profileId_key: { profileId: PROFILE_ID, key: project.key } },
          create: data,
          update: data,
        });
      }
    });
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
