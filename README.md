# Цифровая визитка Ильи Гулевского

GraphQL API с моими навыками, опытом и проектами. Стек: Node.js 22, TypeScript, NestJS, Prisma, Apollo Server и PostgreSQL.

## Запуск

В корне репозитория выполните:

```sh
docker compose up --build
```

Откройте [Apollo Sandbox](http://localhost:3000/graphql) и запустите операцию **Profile**. Запрос уже в редакторе. Если Sandbox восстановил прошлую сессию, скопируйте [запрос из репозитория](scripts/profile.graphql).

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

При сборке Docker устанавливает зависимости из `package-lock.json` и генерирует Prisma Client. Compose ждёт готовности PostgreSQL. Контейнер приложения выполняет `prisma migrate deploy`, затем `prisma db seed` и запускает NestJS, если обе команды прошли.

## Как устроен профиль

У `Profile` четыре связи «один ко многим»: `Link`, `Skill`, `Experience` и `Project`. Ссылки, навыки и проекты идут в порядке seed. Опыт отсортирован по месяцу начала, сначала свежий. При равенстве позиций или дат порядок определяет ключ записи. Формат дат `YYYY-MM`. У текущей работы `endMonth` равен `null`.

Резолвер принимает `profile`, сервис возвращает публичный профиль, репозиторий читает его из Prisma. Схему GraphQL NestJS строит из TypeScript-классов.

Репозиторий читает профиль и четыре списка одним вложенным `select`. Prisma отправляет пять SQL-запросов, по одному на таблицу. Даже для `profile { name }` репозиторий читает все списки. Для одной небольшой анкеты это позволяет обойтись одним способом чтения. GraphQL отдаёт клиенту только имя.

Данные правятся в [prisma/seed.ts](prisma/seed.ts). После правок пересоберите образ. Seed в одной транзакции обновляет записи по ключам и добавляет новые. Если убрать запись из файла, её нужно отдельно удалить из базы. SQL-миграции хранятся в [prisma/migrations](prisma/migrations).

## Проверка на отдельной базе

Нужен Node.js 22 или новее. В чистом клоне выполните:

```sh
export COMPOSE_PROJECT_NAME=profile-check APP_PORT=3300 PRISMA_LOG_QUERIES=1
docker compose up --build -d --wait
npm run verify
docker compose down
```

Скрипт проверяет все поля, HTML Sandbox и introspection в production. Он печатает SQL для полного запроса, запроса имени и полного запроса с 50 дополнительными навыками и 50 проектами. Во всех трёх случаях должно быть пять `SELECT`. После перезапуска Compose скрипт сверяет ответ и число записей. Отдельная тестовая запись подтверждает, что база пережила перезапуск. Скрипт удаляет все свои тестовые записи.

## Публичный Sandbox

На хостинге запустите образ из `Dockerfile` и задайте `DATABASE_URL` для PostgreSQL. Приложение слушает `0.0.0.0` на `PORT` или 3000. Например, в Render создайте PostgreSQL и Docker Web Service в одном регионе и передайте внутренний URL базы. После запуска откройте `/graphql` по HTTPS в приватном окне и выполните **Profile**. В production включены встроенный Sandbox и introspection. [Docker на Render](https://render.com/docs/docker) · [PostgreSQL на Render](https://render.com/docs/postgresql-creating-connecting)

## Как добавить techStack

1. Добавьте `techStack String[] @default([])` в модель `Project`. Задайте `DATABASE_URL` для базы разработки, выполните `npx prisma migrate dev --name project-tech-stack` и сохраните SQL в Git. У существующих проектов после миграции будет пустой массив.
2. В seed укажите стек каждого проекта. Существующий upsert обновит проекты по их ключам. Сгенерируйте Prisma Client и добавьте `techStack: true` в `projects.select`.
3. Добавьте в GraphQL-класс `Project` свойство `techStack!: string[]` с декоратором `@Field(() => [String])`. Сервис и резолвер уже передают объект с полями проекта.
4. Пересоберите образ с существующей базой и выполните `{ profile { projects { name techStack } } }` в Sandbox. Сверьте значения, затем повторите исходный запрос. Загрузка списка проектов по-прежнему занимает один `SELECT`.
