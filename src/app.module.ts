import { readFileSync } from 'node:fs';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ProfileModule } from './profile/profile.module.js';

const profileQuery = readFileSync(new URL('../../scripts/profile.graphql', import.meta.url), 'utf8');

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      path: '/graphql',
      autoSchemaFile: true,
      introspection: true,
      playground: false,
      plugins: [
        ApolloServerPluginLandingPageLocalDefault({
          embed: { runTelemetry: false },
          document: profileQuery,
        }),
      ],
    }),
    ProfileModule,
  ],
})
export class AppModule {}
