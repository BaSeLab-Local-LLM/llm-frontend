# baselabllm.vercel.app 배포 구조

## 어떻게 배포되어 있나

- **Vercel**에 GitHub 저장소 **BaSeLab-Local-LLM/llm-frontend**가 연결되어 있음.
- Vercel 프로젝트 설정:
  - **Root Directory**: `submodules/frontend` 없음 → 이 리포는 **프론트 전용**이므로 루트가 곧 프론트엔드.
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
- `vercel.json`의 **rewrites**로 `/api/*` 요청을 백엔드(ngrok 등)로 프록시함.

즉, **llm-frontend** 저장소에 push하면 Vercel이 자동으로 빌드 후 baselabllm.vercel.app에 배포함.

## 수정사항(파비콘, 제목) 반영하는 방법

프론트엔드는 **서브모듈**(`submodules/frontend` = llm-frontend)이므로, **반드시 frontend 저장소에서 커밋 후 push**해야 Vercel에 반영됩니다.

### 1) frontend 서브모듈에서 커밋 & push

```bash
cd /home/miruware/llm-root/submodules/frontend

git status
git add index.html public/favicon.svg
git commit -m "favicon: Sparkles 아이콘, 제목 BaSE Lab LLM으로 변경"
git push origin main
```

- 기본 브랜치가 `main`이 아니면 해당 브랜치로 push (Vercel이 그 브랜치를 배포하도록 설정되어 있어야 함).

### 2) (선택) 상위 llm-root에서 서브모듈 커밋만 반영

frontend만 배포하면 되므로 필수는 아님. 상위 리포에서 “지금 frontend 버전”을 기록해 두려면:

```bash
cd /home/miruware/llm-root
git add submodules/frontend
git commit -m "chore: frontend 서브모듈 파비콘/제목 반영"
git push origin main-backup
```

---

push 후 1–2분 내에 Vercel이 새 배포를 하고, baselabllm.vercel.app에 파비콘·제목이 반영됩니다.  
캐시 때문에 안 보이면 시크릿 창으로 열거나 강력 새로고침(Ctrl+Shift+R) 해보면 됩니다.
