import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const endpoint = process.env.GRAPHQL_URL ?? `http://localhost:${process.env.APP_PORT ?? 3000}/graphql`;
const query = readFileSync(new URL('./profile.graphql', import.meta.url), 'utf8');
const compose = (...args) => execFileSync('docker', ['compose', ...args], { encoding: 'utf8' });
const sql = (statement) => compose(
  'exec', '-T', 'db', 'psql', '-XAt', '-v', 'ON_ERROR_STOP=1',
  '-U', 'profile', '-d', 'profile', '-c', statement,
);

async function graphql(operation) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: operation }),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.errors, undefined, JSON.stringify(result.errors));
  return result.data;
}

const page = await fetch(endpoint, { headers: { accept: 'text/html' } });
assert.equal(page.status, 200);
const html = await page.text();
assert.match(html, /embeddable-sandbox/i);
assert.match(html, /query Profile/);
assert.equal(compose('exec', '-T', 'app', 'printenv', 'NODE_ENV').trim(), 'production');
assert.deepEqual(
  (await graphql('{ __schema { queryType { fields { name } } mutationType { name } } }')).__schema,
  { queryType: { fields: [{ name: 'profile' }] }, mutationType: null },
);

const readQueryLog = () => compose('logs', '--no-color', '--no-log-prefix', 'app')
  .split('\n').filter((line) => /prisma:query\s+SELECT\b/i.test(line));

async function measure(label, operation) {
  const previousCount = readQueryLog().length;
  const result = await graphql(operation);
  // Compose may collect stdout shortly after the HTTP response reaches the client.
  await new Promise((resolve) => setTimeout(resolve, 250));
  const statements = readQueryLog().slice(previousCount);
  console.log(label, statements.length);
  for (const statement of statements) console.log(statement);
  const tables = statements.map((statement) => statement.match(/\bFROM "public"\."([^"]+)"/i)?.[1]);
  assert.deepEqual(tables.sort(), ['Experience', 'Link', 'Profile', 'Project', 'Skill']);
  return result.profile;
}

const profile = await measure('Полный профиль, SQL SELECT:', query);
assert.equal(profile.name, 'Илья Гулевский');
assert.match(profile.description, /CRM.*LLM/);
assert.deepEqual(profile.links, [
  { label: 'Портфолио', url: 'https://gulevskii.dev/' },
  { label: 'GitHub', url: 'https://github.com/EshkirenokCode' },
]);
assert.deepEqual(profile.skills.map(({ name }) => name), [
  'TypeScript', 'Node.js', 'React', 'Next.js', 'Python', 'FastAPI', 'Go',
  'PostgreSQL', 'Docker', 'REST API', 'Git', 'LLM API', 'MCP',
]);
assert.deepEqual(profile.experience, [
  {
    company: 'Самостоятельная работа',
    position: 'Fullstack-разработчик',
    startMonth: '2023-11',
    endMonth: null,
    achievements: [
      'С нуля разработал CRM МАЯК, которой пользуются три строительные компании.',
      'Добавил ИИ-сводку по стройплощадкам, которую руководители запускают из CRM.',
    ],
  },
  {
    company: 'АО «Тандер»',
    position: 'IT-специалист',
    startMonth: '2021-05',
    endMonth: '2023-11',
    achievements: ['Работал с Windows Server, Active Directory, IIS, SQL Server и PowerShell.'],
  },
]);
assert.deepEqual(profile.projects, [
  { name: 'МАЯК', url: 'https://gulevskii.dev/#work' },
  { name: 'sAIpport', url: 'https://github.com/EshkirenokCode/S-AI-pport' },
  { name: 'EntityLens', url: 'https://github.com/EshkirenokCode/EntityLens' },
]);

const nameOnly = await measure('Только имя, SQL SELECT:', '{ profile { name } }');
assert.deepEqual(nameOnly, { name: profile.name });

const prefix = 'verify-' + randomUUID() + '-';
const extraRows = 50;
try {
  sql(`BEGIN;
    INSERT INTO "Skill" ("profileId", "key", "position", "name")
      SELECT 'ilya-gulevskii', '${prefix}' || i, 1000 + i, 'Test skill ' || i
      FROM generate_series(1, ${extraRows}) AS i;
    INSERT INTO "Project" ("profileId", "key", "position", "name", "url")
      SELECT 'ilya-gulevskii', '${prefix}' || i, 1000 + i, 'Test project ' || i, 'https://example.com/'
      FROM generate_series(1, ${extraRows}) AS i;
    COMMIT;`);

  const expanded = await measure('По 50 дополнительных навыков и проектов, SQL SELECT:', query);
  assert.equal(expanded.skills.length, profile.skills.length + extraRows);
  assert.equal(expanded.projects.length, profile.projects.length + extraRows);
} finally {
  sql(`BEGIN;
    DELETE FROM "Skill" WHERE "profileId" = 'ilya-gulevskii' AND "key" LIKE '${prefix}%';
    DELETE FROM "Project" WHERE "profileId" = 'ilya-gulevskii' AND "key" LIKE '${prefix}%';
    COMMIT;`);
}

const counts = () => sql(`SELECT (SELECT count(*) FROM "Profile"),
  (SELECT count(*) FROM "Link"), (SELECT count(*) FROM "Skill"),
  (SELECT count(*) FROM "Experience"), (SELECT count(*) FROM "Project"),
  (SELECT count(*) FROM "_prisma_migrations");`).trim();
const beforeRestart = counts();
assert.match(beforeRestart, /^1\|2\|13\|2\|3\|[1-9]\d*$/);
const marker = `${prefix}restart`;
sql(`INSERT INTO "Profile" ("id", "name", "description")
  VALUES ('${marker}', 'Restart test', 'Created outside seed');`);
try {
  compose('stop');
  compose('up', '-d', '--wait');
  assert.equal(sql(`SELECT "name" FROM "Profile" WHERE "id" = '${marker}';`).trim(), 'Restart test');
} finally {
  sql(`DELETE FROM "Profile" WHERE "id" = '${marker}';`);
}
assert.equal(counts(), beforeRestart);
assert.deepEqual((await graphql(query)).profile, profile);
console.log('После перезапуска ответ и число записей совпали.');
