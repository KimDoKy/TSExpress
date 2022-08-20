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