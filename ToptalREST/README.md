# [Building a Node.js/TypeScript REST API, Part 1: Express.js](https://www.toptal.com/express-js/nodejs-typescript-rest-api-pt-1)

## How Do I Write a REST API in Node.js?

- Express.js 을 포함한 여러 라이브러리를 추가

```
npm i express debug winston express-winston cors
```

    - debug
        - 응용 프로그램을 개발하는 동안 `console.log()`를 피하기 위함
        - 디버그 문을 쉽게 필터링 할 수 있다.
        - 프로덕션 단계에서 수동으로 제거할 필요가 없다.
    - winston
        - API 요청과 응답을 기록
        - express-winston은 express.js와 직접 통합되므로, 모든 표준 API 관련 winston 로깅 코드가 이미 완료되었다.
    - cors
        - CORS 공유 가능 Express.js 미들웨어
        - 이게 없으면 API는 백엔드와 정확히 동일한 하위 도메인에서만 프론트엔드를 사용할 수 있다.

- TS 구성을 위한 일부 Dev 종속성 설치

```
npm i --save-dev @types/cors @types/express @types/debug source-map-support tslint typescript
```

코딩하는 동안 일부는 자동완성할 수 있다.(WebStorm, VSCode 등에서 지원)

최종적으로 package.json은 다음과 같아야 한다.

```json
"dependencies": {
    "debug": "^4.2.0",
    "express": "^4.17.1",
    "express-winston": "^4.0.5",
    "winston": "^3.3.3",
    "cors": "^2.8.5"
},
"devDependencies": {
    "@types/cors": "^2.8.7",
    "@types/debug": "^4.1.5",
    "@types/express": "^4.17.2",
    "source-map-support": "^0.5.16",
    "tslint": "^6.0.0",
    "typescript": "^3.7.5"
}
```

## TypeScript REST API Project Structure

여기서는 3개의 파일만 만들것이다.
- `./app.ts`
- `./common/common.routes.config.ts`
- `./users/users.routes.config.ts`

각 모듈에 대하 다음 중 일부 또는 전부를 갖게 될 것이다.

- API가 처리할 수 있는 요처을 정의하는 **route configuration**
- DB 모델 연결, 쿼리 수행, 특정 요청에 필요한 외부 서비스 연결 등의 작업을 위한 **services**
- route의 최종 컨트롤러가 세부 사항을 처리하기 전체 특정 요청 유효성 검사를 실행하기 위한 **middleware**
- 데이터 저장 및 검색을 위해 주어진 데이터베이스 스키마와 일치하는 데이터 모델을 정의하기 위한 **models**
- 최종적으로(미들웨어 이후) 경로 요청을 처리하고, 필요한 경우 위의 서비스 기능을 호출하고, 클라이언트에 응답을 제공하는 코드에서 경로 구성을 분리하기 위한 **controllers**

## A Common Routes File in TypeScript

- common.routes.config.ts

```typescript
import express from 'express';
export class CommonRoutesConfig {
    app: express.Application;
    name: string;

    constructor(app: express.Application, name: string) {
        this.app = app;
        this.name = name;
    }
    getName() {
        return this.name;
    }
}
```

TS로 작업하기 때문에 extends 키워드로 상속을 연습할 것이다.
이 프로젝트에서 모든 경로 파일은 동일한 동작을 한다.

- users.routes.config.ts

```typescript
import {CommonRoutesConfig} from '../common/common.routes.config';
import express from 'express';

export class UsersRoutes extends CommonRoutesConfig {
    constructor(app: express.Application) {
        super(app, 'UsersRoutes');
    }
}
```

`CommonRoutesConfig` 클래스를 가져와서 `UserRoutes` 클래스로 확장한다. 생성자(`constructor`)를 사용하여 앱(기본 express.Application 객체)과 UserRoutes를 CommonRoutesConfig의 생성자에 보낸다.

매우 간단한 예이지만, 여러 경로 파일을 생성하도록 확장할 때 중복 코드를 방지하는데 도움이 되는 예이다.

이 파일에 로깅과 같은 새로운 기능을 추가하려고 한다. CommonRoutesConfig 클래스에 필요한 필드를 추가하면 CommonRoutesConfg를 확장하는 모든 경로에 적용된다.

## Using TypeScript Abstract Functions for Similar Functionality Across Classes

**추상화(abstraction)**: 클래스 간에 유사한 기능 및 각 클래스 별로 다른 구현이 필요할 때 사용

`UsersRoutes` 클래스(추후 라우팅 클래스)가 `CommonRoutesConfig`에서 상속할 간단한 추상 함수를 만들자.
모든 경로에 `configureRoutes()`라는 함수를 호출할 수 있게 할 것이다.
여기에서 각 라우팅 클래스 리소스의 엔드포인트도 선언한자.

이를 위해 `common.routes.config.ts`에 3가지를 추가한다.
- 추상화를 위해 `aabstract` 키워드를 사용한다.
- 클래스의 끝에 새로운 함수를 선언
    - `abstract configureRoutes(): express.Application;`
    - 이렇게 하면 CommonRoutesConfig를 확장하는 모든 클래스는 해당 서명과 일치하는 구현을 강제하게 된다.
- `this.configureRoutes();`를 호출

```typescript
import express from 'express';
export abstract class CommonRoutesConfig {
    app: express.Application;
    name: string;

    constructor(app: express.Application, name: string) {
        this.app = app;
        this.name = name;
        this.configureRoutes();
    }
    getName() {
        return this.name;
    }
    abstract configureRoutes(): express.Application;
}
```

이를 통해 CommonRoutesConfig를 확장하는 모든 클래스는 express.Application 객체를 반환하는 configureRoutes() 함수를 만들어야만 한다.
즉, users.routes.config.ts도 업데이트해야 한다.

```typescript
import {CommonRoutesConfig} from '../common/common.routes.config';
import express from 'express';

export class UsersRoutes extends CommonRoutesConfig {
    constructor(app: express.Application) {
        super(app, 'UsersRoutes');
    }

    configureRoutes() {
        // 여기에 실제 route 구성이 추가될 예정
        return this.app;
    }
}
```

- 요약하자면
    - 먼저 common.routes.config 파일을 가져오고, express 모듈을 가져온다.
    - 그 후, CommonRoutesConfig 기본 클래스를 확장하는 UserRoutes 클래스를 정의했다.
    - CommonRoutesConfig 클래스와 함께 정보를 보내기 위해 클래스의 생성자(constructor)를 사용한다.
        - 다음 단계에서 express.Application 개체를 수신할 것이다.
    - `super()`를 사용하여 CommonRoutesConfig의 생성자에 애플리케이션과 경로 이름을 전달한다.
        - `super()`는 차례로 configureRoutes() 구현을 호출한다.

## Configuring the Express.js Routes of the Users Endpoints

configureRoutes() 함수는 REST API user 엔드포인트를 만드는 곳이다.
여기에 Express.js의 애플리케이션과 해당 route를 사용할 것이다.

app.route() 함수를 사용하는 이유는 코드 중복을 피하기 위함이다. 이 시나리오는 2가지 경우가 있다.
- 새로운 사용자를 생성하거나, 기존 사용자들을 모두 나열하는 경우
- 특정 사용자에 대한 작업을 수행하려는 경우

Express.js에서 route()의 작동방식을 사용하면 HTTP 메서드를 우아하게 해결할 수 있다.
`.get()`, `.post()` 등은 모두 첫 번째 `.route()` 호출과 동일한 IRoute 인스턴스를 반환한다.

```typescript
configureRoutes() {

    this.app.route(`/users`)
        .get((req: express.Request, res: express.Response) => {
            res.status(200).send(`List of users`);
        })
        .post((req: express.Request, res: express.Response) => {
            res.status(200).send(`Post to users`);
        });

    this.app.route(`/users/:userId`)
        .all((req: express.Request, res: express.Response, next: express.NextFunction) => {
            // 이 미들웨어 기능은 /users/:userId 에 요청이 있기 전에 실행됨
            // next()를 사용하여 아래의 다음 함수에 제어를 전달함
            next();
        })
        .get((req: express.Request, res: express.Response) => {
            res.status(200).send(`GET requested for id ${req.params.userId}`);
        })
        .put((req: express.Request, res: express.Response) => {
            res.status(200).send(`PUT requested for id ${req.params.userId}`);
        })
        .patch((req: express.Request, res: express.Response) => {
            res.status(200).send(`PATCH requested for id ${req.params.userId}`);
        })
        .delete((req: express.Request, res: express.Response) => {
            res.status(200).send(`DELETE requested for id ${req.params.userId}`);
        });

    return this.app;
}
```

위 코드로 users 엔드포인트에 GET / POST 요청을 호출할 수 있다. GET, PUT, PATCH, DELETE 요청도 `/users/:userId` 엔드포인트로 호출할 수 있다.

하지만 `/users/:userId` 의 경우 get(), put(), patch(), delete() 함수보다 먼저 all() 함수를 사용하여 일반 미들웨어도 추가했다. 이건 (나중에) 인증된 사용자만 액세스하기 위함이다.

`.all()`에는 다른 미들웨어처럼 3가지 타입의 필드가 있다.(Request, Response, NextFunction)
- Request: Express.js가 처리할 HTTP 요청을 나타내는 방식으로, 기본 Node.js 요청 타입으로 확장한다.
- Response: Express.js가 HTTP 응답을 나타내는 방식으로, 기본 Node.js 응답 타입을 다시 확장한다.
- NextFunction이 콜백함수 역할을 하여, 다른 미들웨어 함수를 통과할 수 있도록 한다. 그 과정에서 모든 미들웨어는 컨트롤러가 최종적으로 요청자아게 응답을 보내기 전에 동일한 요청과 응답 개체를 공유한다.

## Our Node.js Entry-point File, app.ts

이제 애플리케이션의 entry point 구성을 시작한다.
프로젝트 푸트에 app.ts 파일을 생성한다.

```typescript
import express from 'express';
import * as http from 'http';

import * as winston from 'winston';
import * as expressWinston from 'express-winston';
import cors from 'cors';
import {CommonRoutesConfig} from './common/common.routes.config';
import {UsersRoutes} from './users/users.routes.config';
import debug from 'debug';
```

- http: Node.js 네이티브 모듈이다. Express.js 애플리케이션을 시작하는데 필요하다.
- body-parser: Express.js와 함께 제공되는 미들웨어이다. 제어가 request handler에 이동하기 전에 요청 구문 분석을 한다.

사용할 변수를 선언한다.

```typescript
const app: express.Application = express();
const server: http.Server = http.createServer(app);
const port = 3000;
const routes: Array<CommonRoutesConfig> = [];
const debugLog: debug.IDebugger = debug('app');
```

`express()`는 `http.Server` 개체에 추가하는 것으로 시작하여 코드 전체에 전달할 기본 Express.js Application 개체를 반환한다.(express.Application을 구성한 후 http.Server를 시작해야 한다.) 

80이나 443 대신 TS가 자동으로 숫자를 유추하는 3000에서 수신을 대기한다. 3000을 프론트엔드에서 주고 사용하는 포트이다.
(Node.js, Express.js의 예전 문서에서 3000을 사용했던 전통. 필수는 아니다.)

`routes` 배열은 디버깅 목적으로 경로 파일을 추적한다.

`debugLog`는 `console.log`와 유사한 기능이지만, 파일/모듈 컨텍스트를 호출하려는 범위가 자동으로 저장되기 때문에 미세한 조정이 더 쉽다.(지금은 'app')

이제 Express.js 미들웨어 모듈과 API route를 구성할 준비가 되었다.

```typescript
// 여기에 들어오는 모든 요청을 JSON으로 구문 분석하는 미들웨어 추가
app.use(express.json());

// CORS를 허용하는 미들웨어 추가
app.use(cors());

// expressWinston 로깅 미들웨어 구성을 준비
// Express.js에서 처리한 모든 HTTP 요청은 자동으로 기록함
const loggerOptions: expressWinston.LoggerOptions = {
    transports: [new winston.transports.Console()],
    format: winston.format.combine(
        winston.format.json(),
        winston.format.prettyPrint(),
        winston.format.colorize({ all: true })
    ),
};

if (!process.env.DEBUG) {
    loggerOptions.meta = false; // 디버깅하지 않을때 한 줄로 기록
}

// 위의 구성으로 logger를 초기화
app.use(expressWinston.logger(loggerOptions));

// 앱의 경로를 추가하기 위해 Express.js 애플리케이션 객체를 보낸 후 UserRoutes를 배열에 추가
routes.push(new UsersRoutes(app));

// 모든 것이 제대로 작동하는지 확인할 경로
const runningMessage = `Server running at http://localhost:${port}`;
app.get('/', (req: express.Request, res: express.Response) => {
    res.status(200).send(runningMessage)
});
```

expressWinston.logger는 Express.js에 연결되어 디버그와 동일한 인프라를 통해 완료된 모든 요청에 대해 세부 정보를 자동으로 로깅한다.
전달한 옵션은 디버그 모드에 있을 때 더 자사한 로깅을 해당 터미널 출력을 깔끔한 형식과 색생을 지정한다.

expressWinston.logger를 설정한 후 경로를 정의해야 한다.

```typescript
server.listen(port, () => {
    routes.forEach((route: CommonRoutesConfig) => {
        debugLog(`Routes configured for ${route.getName()}`);
    });
    // console.log()를 사용하는 유일한 경우는 서버 시작이 완료되는 시점을 알릴 때 뿐이다.
    console.log(runningMessage);
});
```

이제 실제로 서버를 시작한다. 일단 시작하면 Node.js는 디버그 모드에서 우리가 구성한 모든 경로의 이름을 보고하는 콜백함수를 실행한다. 그 후 콜백은 프로덕션 모드에서 실행 중일 때도 백엔드가 요청을 수신할 준비가 되었음을 알려준다.

## Updating package.json to Transpile TypeScript to JavaScript and Run the App

TS 변환을 활성화 하기 위한 구성이 필요하다. tsconfig.json을 프로젝트 루트에 추가한다.

```json
{
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "inlineSourceMap": true
  }
}
```

package.json에 스크립트를 추가한다.

```json
"scripts": {
    "start": "tsc && node --unhandled-rejections=strict ./dist/app.js",
    "debug": "export DEBUG=* && npm run start",
    "test": "echo \"Error: no test specified\" && exit 1"
},
```

`start` 스크립트의 `tsc`는 TS 코드를 JS로 변환하여 dist 폴더에 출력하는 역할이다. 그 후 ./dist/app.js를 노드로 실행한다.
`--unhandled-rejections=strict`를 Node.js에 전달한다. 직접적인 "크래시 및 스택 표시" 접근 방식을 사용하여 디버깅하는 것이 expressWinston.errorLogger 객체를 사용하는 것보다 더 간단하고 멋지기 때문이다.
이는 처리되지 않은 거부에도 Node.js가 계속 실행되도록 하면 프로덕션 환경의 서버에서도 예기치 못한 버그가 발생할 수 있다.

`debug` 스크립트는 DEBUG 환경 변수를 정의 후 `start` 스크립트를 호출한다.
이는 모든 `debugLog()`를 활성화하여 터미널에 유용한 세부 정보를 출력한다.

`npm run debug`를 직접 실행하고, `npm start`와 비교하여 콘솔 출력을 비교해보자.

- tip: DEBUG=* 대신 DEBUG=app을 사용하여 app.ts 파일 자체 `debugLog()`만으로 제한할 수 있다.

`export`는 프로젝트에서 여러 개발 환경을 지원해야 하는 경우 교차 환경 패키지를 제공하기 위한 간단한 솔루션을 제공한다.

## Testing the Live Express.js Back End

`npm run debug` 또는 `npm start`를 실행하면  3000 포트에서 요청을 처리할 준비가 된다.
cURL, Postman, Insomnia 등으로 백엔드를 테스트할 수 있다.

user 리소스가 예상대로 작동하는지 확인하기 위해 본문 없이 요청을 보낼 수 있다.

```
curl --request GET 'localhost:3000/users/12345'
```

백엔드는 id 12345에 대한 GET 응답을 다시 보내야 한다.

POST 요청은

```
curl --request POST 'localhost:3000/users' \
--data-raw ''
```

다른 요청들도 비슷하다.

## Poised for Rapid Node.js REST API Development with TypeScript

여기서 프로젝트를 처음부터 구성하고 Express.js의 기본 사항을 살펴봄으로써 REST API를 만들기 시작했다.
그리고 다음 편에서 재사용할 패턴인 CommonRoutesConfig를 확장하는 UsersRoutesConfig로 패턴을 구축하여 TS를 마스터하기 위한 첫 단계를 밟았다.
애플리케이션을 빌드하고 실행하기 위한 스크립트와 route와 package.json을 사용하도록 app.ts entry point 구성을 완료했다.

다음 시리즈에서는 user 리소스에 대한 적절한 컨트롤러를 만들고, 미들웨어, 컨트롤러, 모델에 대한 몇 가지 유용한 패턴을 알아본다.

---

# [Building a Node.js/TypeScript REST API, Part 2: Models, Middleware, and Services](https://www.toptal.com/express-js/nodejs-typescript-rest-api-pt-2)

## REST API Services, Middleware, Controllers, and Models

## Hands-on: First Steps with DAOs, DTOs, and Our Temporary Database

## Why DTOs?

## Our User REST API Model at the TypeScript Level

## Our REST API Services Layer

## Async/Await and Node.js

## Building Our REST API Controller

## Node.js REST Middleware with Express.js

## Putting it All Together: Refactoring Our Routes

## Testing Our Express/TypeScript REST API

## Node.js/TypeScript REST API

---

# [Building a Node.js/TypeScript REST API, Part 3: MongoDB, Authentication, and Automated Tests](https://www.toptal.com/express-js/nodejs-typescript-rest-api-pt-3)

## A REST API With Mongoose, Authentication, and Automated Testing


## Installing MongoDB As a Container

## Using Mongoose to Access MongoDB

## Removing Our In-memory Database and Adding MongoDB

## DTO Change No. 1: id vs. _id

## DTO Change No. 2: Preparing for Flags-based Permissions

## Testing Our Mongoose-backed REST API

## Hidden Passwords and Direct Data Debugging With MongoDB Containers

## Adding express-validator

## Authentication vs. Permissions (or “Authorization”) Flow

## Adding the Authentication Module

## Storing JWT Secrets

## The Authentication Controller

## JWT Middleware

## JWT Refresh Route

## User Permissions

## Bitwise AND (&) and Powers of Two

## Permission Flag Implementation

## Requiring Permissions

## Manual Permissions Testing

## Automated Testing

## A Meta-test

## Streamlining Testing

## Our First Real REST API Automated Test

## A Chain of Tests

## Nesting, Skipping, Isolating, and Bailing on Tests

## Security (All Projects Should Wear a Helmet)

## Containing Our REST API Project With Docker

## Further REST API Skills to Explore