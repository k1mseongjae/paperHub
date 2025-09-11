# 📚 PaperHub - AI 기반 개인 맞춤형 논문 연구 통합 플랫폼

PaperHub는 연구자들이 arXiv 논문을 효율적으로 검색, 구독, 정리하고 자신만의 지식 네트워크를 시각적으로 탐색할 수 있도록 돕는 올인원 논문 연구 플랫폼입니다.

## 🚀 프로젝트 실행 방법 (Getting Started)

이 프로젝트를 로컬 환경에서 실행하기 위한 안내입니다.

### ✅ 사전 요구 사항 (Prerequisites)

* **Python** (3.9 이상)
* **Node.js** (18.x 이상) 및 **npm**
* **Docker** 및 **Docker Compose** (데이터베이스 실행용)

### 📂 폴더 구조

```
paperhub/
├── backend/      # FastAPI (Python)
├── frontend/     # React (TypeScript, Vite)
├── .gitignore
└── README.md
```

### ⚙️ 초기 설정 및 실행 순서

#### 1. 데이터베이스 실행 (PostgreSQL with Docker)

> **Note:** 이 단계는 '내 라이브러리에 저장' 기능 개발 시점부터 필요합니다. 현재는 건너뛰어도 좋습니다.

1.  프로젝트 최상위 폴더(paperhub)에 docker-compose.yml 파일을 생성하고 아래 내용을 붙여넣으세요.

```
version: '3.8'
services:
  db:
    image: postgres:15
    container_name: paperhub-db
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: paperhub_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

2.  최상위 폴더(paperhub)에서 아래 명령어로 Docker 컨테이너를 실행합니다.

```
docker-compose up -d
```

#### 2. 백엔드 서버 실행 (FastAPI)

1.  VSCode에서 새 터미널을 열고 backend 폴더로 이동합니다.

```
cd backend
```

2.  가상환경을 생성하고 활성화합니다.

```
# 가상환경 생성
python -m venv venv

# 가상환경 활성화 (Windows)
.\venv\Scripts\activate

# 가상환경 활성화 (macOS/Linux)
source venv/bin/activate
```

3.  requirements.txt에 명시된 라이브러리를 설치합니다.

```
pip install -r requirements.txt
```

4.  FastAPI 개발 서버를 실행합니다.

```
uvicorn app.main:app --reload --port 8000
```

서버는 `http://localhost:8000` 에서 실행됩니다.

#### 3. 프론트엔드 앱 실행 (React)

1.  VSCode에서 **또 다른 새 터미널**을 열고 frontend 폴더로 이동합니다.

```
cd frontend
```

2.  package.json에 명시된 라이브러리를 설치합니다.

```
npm install
```

3.  React 개발 서버를 실행합니다.
   
```
npm run dev 
```

앱은 터미널에 나오는 주소(예: `http://localhost:5173`) 에서 실행됩니다.

`250911ver`
