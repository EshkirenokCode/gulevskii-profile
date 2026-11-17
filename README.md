# Цифровая визитка Ильи Гулевского

Публичный GraphQL API с профилем fullstack-разработчика. Node.js 22, TypeScript, NestJS, Apollo Server, Prisma и PostgreSQL.

## Запуск

В корне клона, с запущенным Docker и Docker Compose:

```sh
docker compose up --build
```

Откройте [Apollo Sandbox](http://localhost:3000/graphql) и нажмите **Run**. Полный запрос уже в редакторе. Если браузер восстановил предыдущую вкладку Sandbox, вставьте [запрос из репозитория](scripts/profile.graphql).

```graphql
query Profile {
  profile {
    name
    description
    links { label url }
    skills { name }
    experience { company position startMonth endMonth achievements }
    projects { name url }
  }
}
```

Compose ждёт готовности PostgreSQL. Образ собирается через `npm ci`, генерацию Prisma Client и компиляцию TypeScript. При запуске контейнер выполняет `prisma migrate deploy`, затем явно запускает `prisma db seed` и только после их успеха поднимает API. Миграции хранятся в [Git](prisma/migrations). Seed обновляет записи по стабильным ключам в одной транзакции. Повторный запуск сохраняет данные в томе PostgreSQL.

## Схема и слои

У `Profile` четыре связи «один ко многим» с `Link`, `Skill`, `Experience` и `Project`. Составной ключ `(profileId, key)` однозначно определяет дочернюю запись. Ссылки, навыки и проекты сортируются по позиции из seed, опыт — с более свежего месяца. При совпадении используется ключ записи. Месяцы хранятся в формате `YYYY-MM`, у текущей работы `endMonth: null`.

- **Resolver** связывает корневое поле `profile` с сервисом. Code-first модели определяют публичную схему и nullability.
- **Service** возвращает публичный профиль и сообщает об ошибке, если профиль отсутствует.
- **Repository** загружает публичные колонки и все четыре списка одним вызовом Prisma с вложенным `select`. Prisma выполняет пять SQL `SELECT`: по одному для профиля и каждого списка. Дополнительные строки увеличивают объём результата, а число запросов остаётся прежним.

Даже `profile { name }` загружает все четыре списка. Это даёт один предсказуемый путь чтения с небольшим постоянным объёмом данных. GraphQL при этом возвращает только запрошенные поля.

Обновляйте содержимое в [prisma/seed.ts](prisma/seed.ts) и пересобирайте образ. Существующий ключ позволяет обновить запись. Удаление строки из seed требует отдельно удалить её из базы. Для изменения схемы создайте миграцию через `prisma migrate dev` на базе разработки и добавьте SQL в Git. [Документация Prisma](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production)

## Проверка

Из корня чистого клона запустите отдельный проект Compose. Для скрипта нужен Node.js 22 или новее.

```sh
export COMPOSE_PROJECT_NAME=profile-check
export APP_PORT=3300
export PRISMA_LOG_QUERIES=1
docker compose up --build -d --wait
GRAPHQL_URL=http://localhost:3300/graphql npm run verify
docker compose down
```

Проверка подтверждает production-режим, HTML встроенного Sandbox, introspection и данные полного запроса. Она считает `SELECT` по локальному логу контейнера для полного запроса, для одного имени и после временной вставки 50 навыков и 50 проектов. Затем удаляет тестовые строки, останавливает и поднимает Compose с тем же томом и сравнивает ответ и число записей. Исходный SQL можно посмотреть командой `docker compose logs app`.

## Публичный стенд

Образ слушает `0.0.0.0` на порту `PORT` (по умолчанию 3000) и запускается с `NODE_ENV=production`. Передайте `DATABASE_URL` в окружении контейнера. Например, на Render создайте PostgreSQL и Docker Web Service из этого репозитория в одном регионе и передайте внутренний URL базы. После запуска откройте `https://<домен-сервиса>/graphql` без входа и выполните `Profile`. Встроенный Sandbox и introspection включены явно в обоих режимах. [Docker на Render](https://render.com/docs/docker) · [Подключение PostgreSQL](https://render.com/docs/postgresql-creating-connecting) · [Настройка Apollo Sandbox](https://www.apollographql.com/docs/apollo-server/api/plugin/landing-pages)

## Для собеседования — добавление `techStack`

1. В Prisma добавить к `Project` поле `techStack String[] @default([])`. Создать миграцию на базе разработки, убедиться, что у существующих проектов пустой список, и сохранить SQL в Git.
2. Заполнить стеки в `prisma/seed.ts`. Существующий upsert сохранит значения под теми же ключами. Сгенерировать Prisma Client и добавить `techStack: true` во вложенный `projects.select`.
3. В GraphQL-модели `Project` добавить `@Field(() => [String])` и свойство `techStack!: string[]`. Сервис уже передаёт выбранный профиль, а резолвер уже возвращает этот тип.
4. Пересобрать контейнер с существующей базой и выполнить в Sandbox `{ profile { projects { name techStack } } }`. Проверить значения, выполнить старый запрос и сверить количество SQL-запросов.
