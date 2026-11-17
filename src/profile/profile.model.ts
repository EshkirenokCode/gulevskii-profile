import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Link {
  @Field()
  label!: string;

  @Field()
  url!: string;
}

@ObjectType()
export class Skill {
  @Field()
  name!: string;
}

@ObjectType()
export class Experience {
  @Field()
  company!: string;

  @Field()
  position!: string;

  @Field({ description: 'Месяц в формате YYYY-MM' })
  startMonth!: string;

  @Field(() => String, { nullable: true, description: 'YYYY-MM или null для текущей работы' })
  endMonth!: string | null;

  @Field(() => [String])
  achievements!: string[];
}

@ObjectType()
export class Project {
  @Field()
  name!: string;

  @Field()
  url!: string;
}

@ObjectType()
export class Profile {
  @Field()
  name!: string;

  @Field()
  description!: string;

  @Field(() => [Link])
  links!: Link[];

  @Field(() => [Skill])
  skills!: Skill[];

  @Field(() => [Experience])
  experience!: Experience[];

  @Field(() => [Project])
  projects!: Project[];
}
