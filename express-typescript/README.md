# Building REST API with Express, TypeScript and Swagger


## What you will build

- Express, TS으로 REST API Server를 구축
- `build` 커맨드로 JS 생성
- 개발 중 코드 변경시 자동 서버 재시작
- Swagger를 이용한 OpenAPI 문서 자동 생성

## Bootstrap project

- 노드 프로젝트를 생성
    - `init` 명령어 `-y` 플래그를 설정하여 package.json을 커스텀 할 수 있다.

```
mkdir express-typescript
cd express-typescript
npm init -y
```

- Dev 종속으로 TS 설치

```
npm i -D typescript
```

- 프로젝트 디렉터리 루트에 tsconfig.json을 추가
    - "outDir": 지정한 path에 컴파일된 js가 저장됨

```json
# tsconfig.json

{
  "compilerOptions": {
    "target": "es6",
    "module": "commonjs",
    "outDir": "./build",
    "strict": true,
    "esModuleInterop": true
  }
}
```

- express 설치
- express와 node의 types를 dev 종속으로 설치

```
npm i -S express
npm i -D @types/express @types/node
```

## Write server code

서버를 시작하기 위한 최소한의 코드를 추가한다.

- src 디렉터리 생성: ts 파일이 위치할 곳
- 8000 포트를 수신하여 express 서버를 실행
    - `/ping` 엔드포인트에 GET 호출에 대한 json 응답


```typescript
# src/index.ts

import express, { Application } from "express";

const PORT = process.env.PORT || 8000;

const app: Application = express();

app.get("/ping", async (_req, res) => {
  res.send({
    message: "pong",
  });
});

app.listen(PORT, () => {
  console.log("Server is running on port", PORT);
});
```

- tsconfig.json에 build 커맨드 추가

```json
"scripts": {
  "build": "tsc",
}
```

build 커맨드로 js 코드 빌드

```
npm run build
```

빌드된 js 파일로 노드 서버를 실행할 수 있다. http://localhost:8000/ping 으로 요청을 보내면 json 응답을 받을 수 있다.

```
node build/index.js

Server is running on port 8000
```

## Add development setup

- 코드가 변경되면 서버를 재시작하도록 설정
- ts-node으로 ts를 직접 실행하기 때문에 ts 컴파일러를 실행할 필요가 없다.
- nodemon은 코드를 관찰하고 변경되면 ts-node를 다시 시작한다.
- ts-node와 nodemon을 dev 종속으로 추가한다.

```
npm i -D ts-node nodemon
```

- package.json에 dev 커맨드를 추가한다.(nodemon실행)
    - nodemon 설정도 추가한다.
        - src 안의 `.ts` 파일을 감시
        - 변경시 `ts-node src/index.ts`를 실행

```json
# package.json

  "scripts": {
    "build": "tsc",
    "dev": "nodemon",
  },

  "nodemonConfig": {
    "watch": [
      "src"
    ],
    "ext": "ts",
    "exec": "ts-node src/index.ts"
  }
```

추가한 dev 커맨드를 실행하면 nodemon과 서버가 실행되는 것을 확인할 수 있다.

```
npm run dev

[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): src/**/*
[nodemon] watching extensions: ts
[nodemon] starting `ts-node src/index.ts`
Server is running on port 8000
```

## Add middlewares

미들웨어를 추가하여 서버를 확장한다.
- dev 종속으로 추가

```
npm i -S morgan
npm i -D @types/morgan
```

- 미들웨어를 설치후 `app.use()`를 통해 서버에 추가한다.
    - express.json(): req 본문을 구문 분석
    - express.static(): 정적 파일 제공
        - public 폴더 추가
    - morgan: req를 기록

```typescript
# src/index.ts

import express, { Application } from "express";
import morgan from "morgan";

const PORT = process.env.PORT || 8000;

const app: Application = express();

app.use(express.json());
app.use(morgan("tiny"));
app.use(express.static("public"));
```

서버 실행후 http://localhost:8000/ping를 요청하면, 터미널에 기록 됨을 볼 수 있다.

```
Server is running on port 8000
GET /ping 304 - - 2.224 ms
```

## Refactor

모든 코드가 하나의 파일에 있지만, 서버 확장성을 위해 여러 파일로 나누어야 한다.

```typescript
# src/controllers/ping.ts
# PingController 클래스를 추가
## getMessage 메서드 추가
# response 인터페이스를 정의
## 문자열 타입의 message 프로퍼티를 갖는다.

interface PingResponse {
  message: string;
}

export default class PingController {
  public async getMessage(): Promise<PingResponse> {
    return {
      message: "pong",
    };
  }
}
```

```typescript
# src/routes/index.ts
# 모든 라우팅을 여기로 옮긴다.
# 서버에서 이 라우터를 미들웨어로 추가해야 한다.

import express from "express";
import PingController from "../controllers/ping";

const router = express.Router();

router.get("/ping", async (_req, res) => {
  const controller = new PingController();
  const response = await controller.getMessage();
  return res.send(response);
});

export default router;
```

```typescript
# src/index.ts

import express, { Application } from "express";
import morgan from "morgan";
import Router from "./routes";  // 라우터 불러오기

const PORT = process.env.PORT || 8000;

const app: Application = express();

app.use(express.json());
app.use(morgan("tiny"));
app.use(express.static("public"));

app.use(Router);    // 라우터 추가

app.listen(PORT, () => {
  console.log("Server is running on port", PORT);
});
```

## Swagger integration

모든 API에 대해 OpenAPI 사양이 포함된 json 파일을 생성하려면 tsoa을 추가해야 한다.  
- Swagger UI로 swagger json을 호스팅하려면 `swagger-ui-express`를 추가해야 한다.

```
npm i -S tsoa swagger-ui-express
npm i -D @types/swagger-ui-express concurrently
```

tsconfig.json에 데코레이터에 대한 지원도 추가해야 한다.

```json
# tsconfig.json

{
  "compilerOptions": {
    ...
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

디렉터리의 루트에 tsoa.json을 추가한다.
- config에 `entryFile`, `outputDirectory`도 추가한다.
- 생성된 json 파일의 출력 폴더로 public을 설정한다.

```json
# tsoa.json

{
  "entryFile": "src/index.ts",
  "noImplicitAdditionalProperties": "throw-on-extras",
  "spec": {
    "outputDirectory": "public",
    "specVersion": 3
  }
}
```

Swagger docs를 생성하기 위해 dev, build 커맨드를 업데이트한다.
- predev, prebuild를 build, dev 전에 swagger를 각각 실행하도록 한다.
- nodemon, tsoa spec을 병렬로 실행하는 커맨드를 dev에 추가한다.
- Swagger 문서는 개발 코드가 변경되면 자동으로 업데이트된다.

```json
# package.json

  "scripts": {
    "start": "node build/index.js",
    "predev": "npm run swagger",
    "prebuild": "npm run swagger",
    "build": "tsc",
    "dev": "concurrently \"nodemon\" \"nodemon -x tsoa spec\"",
    "swagger": "tsoa spec",
  },
```

호스팅된 Swagger json에 대한 Swagger UI를 제공하기 위해 `swagger-ui-express`를 추가한다.

```typescript
# src/index.ts

import express, { Application, Request, Response } from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import Router from "./routes";

const PORT = process.env.PORT || 8000;

const app: Application = express();

app.use(express.json());
app.use(morgan("tiny"));
app.use(express.static("public"));

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: {
      url: "/swagger.json",
    },
  })
);

app.use(Router);
```

컨트롤러를 업데이트하고 클래스와 메서드에 데코레이터를 추가하여 API 문서의 경로와 endpoint를 정의한다.
- tsoa는 `/ping` endpoint에 대한 응답 유형으로 PingResponse를 선택한다.

```typescript
# src/controllers/ping.ts

import { Get, Route } from "tsoa";

interface PingResponse {
  message: string;
}

@Route("ping")
export default class PingController {
  @Get("/")
  public async getMessage(): Promise<PingResponse> {
    return {
      message: "pong",
    };
  }
}
```

모든 변경을 수행하고 서버를 실행후 http://localhost:8000/docs/를 방문하면 API문서를 볼 수 있다.

---

# Building REST API with Express, TypeScript - Part 2: Docker Setup

## Why Docker

Docker는 새로운 기기에 개발환경을 쉽게 설정할 수 있다. 그리고 프로젝트별로 격리시켜 프로젝트별로 종속성 문제가 발생하지 않는다.

## Write Dockerfile

Dockerfile의 각 라인은 명령이고, 고유한 새 이미지 계층을 생성한다.  
Docker는 빌드 중에 이미지를 캐시하므로, 모든 재구성은 마지막 빌드에서 변경된 새 계층만 생성한다. 이러한 동작 로직은 빌드 시간을 줄이는데 중요한 역할을 한다.

- 서버용 Dockerfile 작성
    - `node:12`를 기본 도커 이미지로 사용
    - package.json을 복사하고, `npm install`을 수행한 후 다른 파일을 복사한다.
    - Docker는 빌드 중에 이 두 단계의 이미지를 캐시후 재사용한다.
- 도커 이미지로 개발 서버를 실행할 것이므로 `npm run dev` 커맨드를 제공해야 한다.

```dockerfile
# Dockerfile

FROM node:12

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8000

CMD ["npm", "run", "dev"]
```

COPY 중 일부 파일을 무시하기 위해 .dockerignore를 추가한다.

```
# .dockerignore

node_modules
npm-debug.log
```

docker 이미지를 빌드한다.
- 이미지 이름은 express-ts로 정한다.

```
docker build -t express-ts .
```

`docker images`으로 빌드된 docker 이미지를 확인할 수 있다.

```
docker images
REPOSITORY                        TAG                 IMAGE ID            CREATED             SIZE
express-ts                        latest              d0ce1e38958b        2 minutes ago       1.11GB
```

`docker run`으로 컨테이너를 실행한다. 8000번 포트에 매핑한다.
http://localhost:8000/ping을 방문하면 서버 실행을 확인할 수 있다.

```
docker run -p 8000:8000 express-ts
```

## Add Docker Compose

Docker 컨테이너 내부의 nodemon은 로컬의 src 폴더를 볼 수 없기에, 개발 서버가 Docker 내부에서 `docker build`를 해야 한다.
로컬의 src 폴더를 Docker 컨테이너에서 마운트하여 컨테이너 내부의 nodemon이 소스 변경을 인지 및 개발 서버를 재시작한다.

- docker-compose.yml을 프로젝트 루트에 추가하여 src 폴더를 마운트한다.

```yml
# docker-compose.yml

version: "3"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - ./src:/app/src
    ports:
      - "8000:8000"
```

- `docker-compose up`으로 서버를 실행한다.
    - 이제 컨테이너의 서버는 코드 변경되면 서버를 재시작한다.

```
docker-compose up
```

- Dockerfile을 Dockerfile.dev로 변경하고, docker-compose.yml도 업데이트 하자.(개발이미지 분리)

```
mv Dockerfile Dockerfile.dev
```

```yml
# docker-compose.yml

version: "3"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - ./src:/app/src
    ports:
      - "8000:8000"
```

## Add Production Dockerfile

프로덕션 서버용 도커 이미지 빌드를 하자.  
- 새로운 Dockerfile을 생성
- JS을 복사 / 빌드 후 `npm start` 커맨드를 실행해야 한다.

```
FROM node:12

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 8000

CMD ["node", "start"]
```

- `docker build` 를 실행후 프로덕션 서버용 도커 이미지 생성을 확인할 수 있다.
    - 빌드 중 `Cannot find module 'multer' or its corresponding type declarations.`를 만난다면
    - `npm i -D @types/multer` 로 package.json 을 업데이트 후 빌드하면 됨

```
docker images
REPOSITORY                      TAG                 IMAGE ID            CREATED             SIZE
express-ts                      latest              d0ce1e38958b        2 minutes ago       1.11GB
```

- node:12를 alpine 이미지로 교체한다. 알파인 리눅스는 매우 가볍다.

```
FROM node:12-alpine
```

```
docker build -t express-ts/alpine .
```

빌드된 이미지를 보면 용량이 크게 줄어든 것을 알 수 있다.

```
docker images
REPOSITORY                       TAG                 IMAGE ID            CREATED             SIZE
express-ts                       alpine              2b06fcba880e        46 seconds ago      280MB
express-ts                       latest              d0ce1e38958b        2 minutes ago       1.11GB
```

프로덕션 빌드에는 dev 종속성이 있고, 프로덕션 환경에서 서버를 실행하는 동안 필요하지 않은 TS 코드가 있기 때문에 도커 이미지는 아직 완벽하지 않다.

2 단계(서버를 구축하기 위한 단계 / 서버를 실행하기 위한 단계)를 생성한다.  
빌더 단계에서는 TS 파일을 JS로 컴파일한다. 그후 서버 단계에서 생성된 파일을 빌더 단계에서 서버 단계로 복사한다.
서버 단계에서는 프로덕션 종속성만 필요하므로 `npm install`에 `--production` 플래그를 추가한다.

```
FROM node:12-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:12-alpine AS server
WORKDIR /app
COPY package* ./
RUN npm install --production
COPY --from=builder ./app/public ./public
COPY --from=builder ./app/build ./build
EXPOSE 8000
CMD ["npm", "start"]
```

- 업데이트된 Dockerfile로 이미지를 빌드
    - ms라는 태그를 지정하여 이전 이미지 크기와 비교한다.

```
docker build -t express-ts/ms .
```

```
docker images

REPOSITORY                       TAG                 IMAGE ID            CREATED             SIZE
express-ts                       alpine              2b06fcba880e        46 seconds ago      280MB
express-ts                       latest              d0ce1e38958b        2 minutes ago       1.11GB
express-ts                       ms                  26b67bfe45b0        9 minutes ago       194MB
```

---

# Building REST API with Express, TypeScript - Part 3: PostgreSQL and Typeorm

PostgreSQL 데이터베이스를 설정하고 일부 API를 서버에 추가한다.

- ORM의 장단점
    - 장점: 원시 쿼리에 대한 추상화로 개발 속도가 빠름
    - 단점: 일부 복잡한 작업의 경우 ORM 쿼리가 느린 경향이 있음

- ORM
    - Sequelize, Bookshelf, TypeORM
    - 여기서는 [TypeORM](https://typeorm.io/)을 사용

## Install PostgreSQL and TypeORM

- prod 종속성으로 `typeorm`, `reflect-metadata`를 설치
- postgres 드라이버 `pg` 설치

```
npm install typeorm@0.2.44 reflect-metadata --save
npm install pg --save
```

> typeorm 최신버전에서는 사용법이 모두 바뀌어서, 원본 포스트의 진행 버전인  0.2.44으로 설치해야 정상 진행이 가능함

## Setup Postgres database server

데이터베이스는 로컬 서버를 사용하며, Docker로 수행한다.
- docker-compose.yml에 postgres 이미지를 사용하여 db라는 데이터베이스 서비스를 추가하고, 앱 서비스 종속성으로 추가한다.

```yml
# docker-compose.yml

version: "3"

services:
  db:
    image: postgres:12
    environment:
      - POSTGRES_DB=express-ts
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - ./src:/app/src
    ports:
      - "8000:8000"
    depends_on:
      - db
    environment:
      - POSTGRES_DB=express-ts
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_HOST=db
```

- 서비스를 구축하고 시작한다.

```
docker-compose build
docker-compose up
```

## Setup TypeORM and database connection

- config 디렉터리에 `database.ts` 파일을 생성한다.
    - 이 파일은 모든 데이터베이스 관련 구성을 유지한다.
- 여기서는 docker-compose.yml 파일에 환경변수로 관리하고 있다.

```typescript
# src/config/database.ts

import { ConnectionOptions } from "typeorm";

const config: ConnectionOptions = {
  type: "postgres",
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT) || 5432,
  username: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "postgres",
  database: process.env.POSTGRES_DB || "postgres",
  entities: [],
  synchronize: true,
};

export default config;
```

- index.ts에서 데이터베이스 구성을 가져오고, TypeORM의 `createConnection`을 전달한다.
    - `createConnection`은 비동기식이므로, POST를 바인딩하고 수신 대기하기 전에 promise가 해결될 때까지 기다린다.
    - 데이터베이스 연결에 오류가 있으면 오류를 기록하고 서버를 종료한다.

```typescript
# src/index.ts

import "reflect-metadata";
import { createConnection } from "typeorm";
import express, { Application } from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import Router from "./routes";
import dbConfig from "./config/database";

const PORT = process.env.PORT || 8000;

const app: Application = express();

app.use(express.json());
app.use(morgan("tiny"));
app.use(express.static("public"));

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: {
      url: "/swagger.json",
    },
  })
);

app.use(Router);

createConnection(dbConfig)
  .then((_connection) => {
    app.listen(PORT, () => {
      console.log("Server is running on port", PORT);
    });
  })
  .catch((err) => {
    console.log("Unable to connect to db", err);
    process.exit(1);
  });
```

## Creating Models

REST 서버에 대한 모델을 생성한다.
- 서버에는 User, Post, Comment 3 가지 모델이 있다.
- `Entity` 데코레이터를 User 클래스에 추가해야 한다.
    - user 모델은 id, firstName, lastName, email, createdAt, UpdatedAt을 테이블 열로 사용한다.
    - id는 기본키 및 자동 증가 값으로 자동 생성된다.
    - createdAt, updatedAt은 자동 생성되며, 삽입 및 업데이트 설정된다.

```typescript
# src/models/user.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column()
  email!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```
`!`은 해당 속성이 생성자에 할당되지 않고 값이 정의되지 않을 수 있는 것을 의미한다.
tsconfig.json 파일에 `strictPropertyInitialization`을 true로 설정하거나 `!`를 추가할 수 있다.
`!`를 추가하는 것이 전체 프로젝트의 구성을 변경하는 것보다 좋다.

```typescript
# src/models/index.ts

import { User } from "./user";
export { User };
```

데이터베이스 구성 파일에서 User 모델을 가져와서 엔티티 속성에 추가한다.

```typescript
# src/config/database.ts

import { ConnectionOptions } from "typeorm";
import {User} from '../models'

const config: ConnectionOptions = {
  ...
  entities: [User],
  ...
};
```

다른 모델들도 동일한 작업을 수행한다.
- Post 모델은 
    - id, title, content, userId, createdAt, updatedAt을 테이블 열로 가진다.
    - 열 type을 텍스트로 명시적으로 정의하기 위해 content 열에 대한 열 데코레이터에 type을 text로 전달한다.
    - 모든 post이 일부 사용자에 의해 생성되므로, User 모델에 종속된다.
        - 따라서 userId는 User에게 매핑된다.(FK)
        - 사용자가 여러 post를 작성할 수 있기때문에 MTM 관계를 추가한다.

```typescript
# src/models/post.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { Comment } from "./comment";
import { User } from "./user";

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({
    type: "text",
  })
  content!: string;

  @Column({ nullable: true })
  userId!: number;
  @ManyToOne((_type) => User, (user: User) => user.posts)
  @JoinColumn()
  user!: User;

  @OneToMany((_type) => Comment, (comment: Comment) => comment.post)
  comments!: Array<Comment>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

- Comment 모델
    - Post 모델과 마찬가지로 User 모델에 종속되므로 userId를 FK로 추가 및 User 모델과 MTO 관계이다.
    - post에 여러 comment가 존재할 수 있기 때문에 Post 모델에 종속된다.
        - postId는 Post에 대한 FK가 된다.
    - Post type의 post라는 속성도 추가해야 한다.
    - Post 모델에 comment type의 comments라는 속성도 추가해야 한다.

```typescript
# src/models/comment.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { Post } from "./post";
import { User } from "./user";

@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: "text",
  })
  content!: string;

  @Column({ nullable: true })
  userId!: number;
  @ManyToOne((_type) => User, (user: User) => user.comments)
  @JoinColumn()
  user!: User;

  @Column({ nullable: true })
  postId!: number;
  @ManyToOne((_type) => Post, (post: Post) => post.comments)
  @JoinColumn()
  post!: Post;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

Post 모델과 Comment 모델은 모두 User 모델에 종속되어 있고, MTM 관계이다.
한명의 user가 여러 post와 comment를 가질 수 있으므로, OTM 관계를 사용하여 User 모델에 post, comment 속성을 추가해야 한다.
이러한 속성은 각각 Post의 배열, Comment의 배열 type이다.

```typescript
# src/models/user.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  UpdateDateColumn,
} from "typeorm";
import { Post } from "./post";
import { Comment } from "./comment";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column()
  email!: string;

  @OneToMany((_type) => Post, (post: Post) => post.user)
  posts!: Array<Post>;

  @OneToMany((_type) => Comment, (comment: Comment) => comment.user)
  comments!: Array<Comment>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

```typescript
# src/models/index.ts

import { User } from "./user";
import { Post } from "./post";
import { Comment } from "./comment";
export { User, Post, Comment };
```

데이터베이스 구성 파일에서 Post, Comment 모델을 가져와서 User 모델처럼 entity에 추가한다.

```typescript
# src/config/database.ts

import { ConnectionOptions } from "typeorm";
import {User, Post, Comment} from '../models'

const config: ConnectionOptions = {
  ...
  entities: [User, Post, Comment],
  ...
};
```

## Verify Database schema

서버에 모델을 추가하고 시작하면 데이터베이스에 테이블이 생성된다.
db docker 컨테이너에서 `psql cli`으로 확인할 수 있다.

```
docker exec -it express-typescript_db_1 bash
```

```
psql -U postgres
```

```
\l              # list database.
\c express-ts   # select `express-ts` database.
\dt             # list all tables.
\d user         # Show `user` table definition.
\d post         # Show `post` table definition.
\d comment      # Show `comment` table definition.
```

```
express-ts-# \dt
          List of relations
 Schema |  Name   | Type  |  Owner   
--------+---------+-------+----------
 public | comment | table | postgres
 public | post    | table | postgres
 public | user    | table | postgres
(3 rows)


express-ts-# \d user
                                        Table "public.user"
  Column   |            Type             | Collation | Nullable |             Default              
-----------+-----------------------------+-----------+----------+----------------------------------
 id        | integer                     |           | not null | nextval('user_id_seq'::regclass)
 firstName | character varying           |           | not null | 
 lastName  | character varying           |           | not null | 
 email     | character varying           |           | not null | 
 createdAt | timestamp without time zone |           | not null | now()
 updatedAt | timestamp without time zone |           | not null | now()
Indexes:
    "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY, btree (id)
Referenced by:
    TABLE "post" CONSTRAINT "FK_5c1cf55c308037b5aca1038a131" FOREIGN KEY ("userId") REFERENCES "user"(id)
    TABLE "comment" CONSTRAINT "FK_c0354a9a009d3bb45a08655ce3b" FOREIGN KEY ("userId") REFERENCES "user"(id)


express-ts-# \d post
                                        Table "public.post"
  Column   |            Type             | Collation | Nullable |             Default              
-----------+-----------------------------+-----------+----------+----------------------------------
 id        | integer                     |           | not null | nextval('post_id_seq'::regclass)
 title     | character varying           |           | not null | 
 content   | text                        |           | not null | 
 userId    | integer                     |           |          | 
 createdAt | timestamp without time zone |           | not null | now()
 updatedAt | timestamp without time zone |           | not null | now()
Indexes:
    "PK_be5fda3aac270b134ff9c21cdee" PRIMARY KEY, btree (id)
Foreign-key constraints:
    "FK_5c1cf55c308037b5aca1038a131" FOREIGN KEY ("userId") REFERENCES "user"(id)
Referenced by:
    TABLE "comment" CONSTRAINT "FK_94a85bb16d24033a2afdd5df060" FOREIGN KEY ("postId") REFERENCES post(id)


express-ts-# \d comment
                                        Table "public.comment"
  Column   |            Type             | Collation | Nullable |               Default               
-----------+-----------------------------+-----------+----------+-------------------------------------
 id        | integer                     |           | not null | nextval('comment_id_seq'::regclass)
 content   | text                        |           | not null | 
 userId    | integer                     |           |          | 
 postId    | integer                     |           |          | 
 createdAt | timestamp without time zone |           | not null | now()
 updatedAt | timestamp without time zone |           | not null | now()
Indexes:
    "PK_0b0e4bbc8415ec426f87f3a88e2" PRIMARY KEY, btree (id)
Foreign-key constraints:
    "FK_94a85bb16d24033a2afdd5df060" FOREIGN KEY ("postId") REFERENCES post(id)
    "FK_c0354a9a009d3bb45a08655ce3b" FOREIGN KEY ("userId") REFERENCES "user"(id)
```

## User Apis

User를 위한 API를 추가하자. 3개의 API를 생성한다.
- user 생성 / 패치 / 모두 가져오기
- [data mapper pattern](https://en.wikipedia.org/wiki/Data_mapper_pattern)
    - 각 모델에는 하나의 repository가 있는데, 서버에서 repository를 통해서만 DB에 쿼리한다.
    - type에 대해서만 앱에서 모델을 가져온다.
    - 모델을 통해 직접 작동하지 않는다.

- repositories 디렉터리를 생성한다.
    - 여기서 3가지 메서드를 내보낼 것이다.
    - 모두 비동기식이며, return type으로 Promise를 반환한다.
        - `getUsers`: user repository와 user list에서 `find` 함수를 호출한다.
        - `createUser`: `payload`라는 인수가 필요하다. `IUserPayload` 인터페이스를 유형으로 정의한다.
            - User 모델의 새 인스턴스를 만들고, user repository에서 `save` 메서드를 호출한다.
            - 그러면 User 테이블에 행이 삽입된다.
        - `getUser`: user repository의 `findOne` 메서드를 호출한다.
            - 값이 정의되지 않은 경우 null을 반환하고, 그렇지 않으면 찾은 usre를 반환한다.

```typescript
# src/repositories/user.ts

import { getRepository } from "typeorm";
import { User } from "../models";

export interface IUserPayload {
  firstName: string;
  lastName: string;
  email: string;
}

export const getUsers = async (): Promise<Array<User>> => {
  const userRepository = getRepository(User);
  return userRepository.find();
};

export const createUser = async (payload: IUserPayload): Promise<User> => {
  const userRepository = getRepository(User);
  const user = new User();
  return userRepository.save({
    ...user,
    ...payload,
  });
};

export const getUser = async (id: number): Promise<User | null> => {
  const userRepository = getRepository(User);
  const user = await userRepository.findOne({ id: id });
  if (!user) return null;
  return user;
};
```

user API용 컨트롤러를 추가하자.
- UserController 클래스를 생성하고, 여기에 Route, Tags 데코레이터를 추가한다.
    - 이는 Swagger 파일 생성을 위함이다.
- `getUsers`, `createUser`, `getUser` 3 가지 메서드를 정의한다.
- 그 후에 데코레이터를 추가한다.
- `createUser`는 POST 요청이고, 본문의 스키마는 `IUserPayload` 타입이다.

```typescript
# src/controllers/user.controller.ts

import { Get, Route, Tags, Post, Body, Path } from "tsoa";
import { User } from "../models";
import {
  getUsers,
  createUser,
  IUserPayload,
  getUser,
} from "../repositories/user";

@Route("users")
@Tags("User")
export default class UserController {
  @Get("/")
  public async getUsers(): Promise<Array<User>> {
    return getUsers();
  }

  @Post("/")
  public async createUser(@Body() body: IUserPayload): Promise<User> {
    return createUser(body);
  }

  @Get("/:id")
  public async getUser(@Path() id: string): Promise<User | null> {
    return getUser(Number(id));
  }
}
```

user API용 라우터를 생성하자.
- route 디렉터리에 user.router.ts 파일을 생성한다.
- 이 파일에서 새로운 express router를 만들고, 여기에 모든 user 경로를 추가한다.
- 루트 라우터에서 `/user` 경로로 추가한다.

```typescript
# src/routes/user.router.ts

import express from "express";
import UserController from "../controllers/user.controller";

const router = express.Router();

router.get("/", async (_req, res) => {
  const controller = new UserController();
  const response = await controller.getUsers();
  return res.send(response);
});

router.post("/", async (req, res) => {
  const controller = new UserController();
  const response = await controller.createUser(req.body);
  return res.send(response);
});

router.get("/:id", async (req, res) => {
  const controller = new UserController();
  const response = await controller.getUser(req.params.id);
  if (!response) res.status(404).send({ message: "No user found" });
  return res.send(response);
});

export default router;
```

```typescript
# src/routes/index.ts

import express from "express";
import PingController from "../controllers/ping.controller";
import UserRouter from "./user.router";

const router = express.Router();

router.get("/ping", async (_req, res) => {
  const controller = new PingController();
  const response = await controller.getMessage();
  return res.send(response);
});

router.use("/users", UserRouter);

export default router;
```
 
서버를 다시 시작하면 swagger 문서에서 API를 확인할 수 있다.
swagger 문서에서 API를 호출할 수도 있고, 터미널에서 호출할 수도 있다.
임의의 데이터로 사용자를 만들고 테스트 해볼 수 있다.

```
curl -X POST -H "Content-Type: application/json" -d '{"firstName": "foo", "lastName": "bar", "email": "foo@bar.com"}' http://localhost:8000/users

curl http://localhost:8000/users

curl http://localhost:8000/users/1
```

## Post and Comment Apis

Post, Comment의 API를 추가한다.
- 3 가지 메서드
    - post: create, fetch, get all post
    - comment: create, fetch, get all comment
- post.repository.ts, comment.repository.ts 를 생성하고 구현한다.
- `IPostPayload` 인터페이스는 `createPost` 페이로드의 타입
- `ICommentPayload`는 `createComment` 페이로드의 타입

```typescript
# src/repositories/post.repository.ts

import { getRepository } from "typeorm";
import { Post } from "../models";

export interface IPostPayload {
  title: string;
  content: string;
  userId: number;
}

export const getPosts = async (): Promise<Array<Post>> => {
  const postRepository = getRepository(Post);
  return postRepository.find();
};

export const createPost = async (payload: IPostPayload): Promise<Post> => {
  const postRepository = getRepository(Post);
  const post = new Post();
  return postRepository.save({
    ...post,
    ...payload,
  });
};

export const getPost = async (id: number): Promise<Post | null> => {
  const postRepository = getRepository(Post);
  const post = await postRepository.findOne({ id: id });
  if (!post) return null;
  return post;
};
```

```typescript
# src/repositories/comment.repository.ts

import { getRepository } from "typeorm";
import { Comment } from "../models";

export interface ICommentPayload {
  content: string;
  userId: number;
  postId: number;
}

export const getComments = async (): Promise<Array<Comment>> => {
  const commentRepository = getRepository(Comment);
  return commentRepository.find();
};

export const createComment = async (
  payload: ICommentPayload
): Promise<Comment> => {
  const commentRepository = getRepository(Comment);
  const comment = new Comment();
  return commentRepository.save({
    ...comment,
    ...payload,
  });
};

export const getComment = async (id: number): Promise<Comment | null> => {
  const commentRepository = getRepository(Comment);
  const comment = await commentRepository.findOne({ id: id });
  if (!comment) return null;
  return comment;
};
```

Post와 Comment API를 위한 컨트롤러를 만들어야 한다.
- post.controller.ts, comment.controller.ts를 controller에 생성하고, 각각 PostController, CommentController 클래스를 생성한다.

```typescript
# src/controllers/post.controller.ts

import { Get, Route, Tags, Post as PostMethod, Body, Path } from "tsoa";
import { Post } from "../models";
import {
  createPost,
  getPosts,
  IPostPayload,
  getPost,
} from "../repositories/post.repository";

@Route("posts")
@Tags("Post")
export default class PostController {
  @Get("/")
  public async getPosts(): Promise<Array<Post>> {
    return getPosts();
  }

  @PostMethod("/")
  public async createPost(@Body() body: IPostPayload): Promise<Post> {
    return createPost(body);
  }

  @Get("/:id")
  public async getPost(@Path() id: string): Promise<Post | null> {
    return getPost(Number(id));
  }
}
```

Post Controller에서 Post 모델과 Post 데코레이터가 충돌하기 때문에 Post 데코레이터를 `PostMethod`로 alias한다.

```typescript
# src/controllers/comment.controller.ts

import { Get, Route, Tags, Post, Body, Path } from "tsoa";
import { Comment } from "../models";
import {
  getComments,
  ICommentPayload,
  createComment,
  getComment,
} from "../repositories/comment.repository";

@Route("comments")
@Tags("Comment")
export default class CommentController {
  @Get("/")
  public async getComments(): Promise<Array<Comment>> {
    return getComments();
  }

  @Post("/")
  public async createComment(@Body() body: ICommentPayload): Promise<Comment> {
    return createComment(body);
  }

  @Get("/:id")
  public async getComment(@Path() id: string): Promise<Comment | null> {
    return getComment(Number(id));
  }
}
```

Post, Comment API에 대한 라우터를 생성한다.  
- `/post`, `/comments` 경로를 사용한다.

```typescript
# src/routes/post.router.ts

import express from "express";
import PostController from "../controllers/post.controller";

const router = express.Router();

router.get("/", async (_req, res) => {
  const controller = new PostController();
  const response = await controller.getPosts();
  return res.send(response);
});

router.post("/", async (req, res) => {
  const controller = new PostController();
  const response = await controller.createPost(req.body);
  return res.send(response);
});

router.get("/:id", async (req, res) => {
  const controller = new PostController();
  const response = await controller.getPost(req.params.id);
  if (!response) res.status(404).send({ message: "No post found" });
  return res.send(response);
});

export default router;
```

```typescript
# src/routes/comment.router.ts

import express from "express";
import CommentController from "../controllers/comment.controller";

const router = express.Router();

router.get("/", async (_req, res) => {
  const controller = new CommentController();
  const response = await controller.getComments();
  return res.send(response);
});

router.post("/", async (req, res) => {
  const controller = new CommentController();
  const response = await controller.createComment(req.body);
  return res.send(response);
});

router.get("/:id", async (req, res) => {
  const controller = new CommentController();
  const response = await controller.getComment(req.params.id);
  if (!response) res.status(404).send({ message: "No comment found" });
  return res.send(response);
});

export default router;
```

```typescript
# src/routes/index.ts

import express from "express";
import PingController from "../controllers/ping.controller";
import PostRouter from "./post.router";
import UserRouter from "./user.router";
import CommentRouter from "./comment.router";

const router = express.Router();

router.get("/ping", async (_req, res) => {
  const controller = new PingController();
  const response = await controller.getMessage();
  return res.send(response);
});

router.use("/users", UserRouter);
router.use("/posts", PostRouter);
router.use("/comments", CommentRouter);

export default router;
```

서버를 다시 시작하면 swagger 문서가 업데이트되고, post와 comment API가 포함된다.

---

# Building REST API with Express, TypeScript - Part 4: Jest and unit testing