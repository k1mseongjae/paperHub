from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import arxiv # arxiv 라이브러리 import

app = FastAPI()

# CORS 설정 (프론트엔드와 통신을 위해)
origins = [
    "http://localhost:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello from PaperHub Backend!"}


# 검색 API 엔드포인트 수정
@app.get("/api/search")
def search_papers(query: str):
    print(f"'{query}'에 대한 실제 arXiv 검색 시작!")
    
    # arXiv에서 검색 실행 (최대 10개 결과)
    search = arxiv.Search(
        query=query,
        max_results=10,
        sort_by=arxiv.SortCriterion.Relevance
    )
    
    results = []
    for r in search.results():
        # 필요한 정보만 추출하여 리스트에 추가
        results.append({
            "entry_id": r.entry_id,
            "title": r.title,
            "summary": r.summary,
            "authors": [author.name for author in r.authors],
            "pdf_url": r.pdf_url,
            "published": r.published.isoformat()
        })
        
    return {"results": results}
