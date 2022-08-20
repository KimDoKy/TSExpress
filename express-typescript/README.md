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

---

# Building REST API with Express, TypeScript - Part 4: Jest and unit testing