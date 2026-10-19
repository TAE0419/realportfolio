# 포트폴리오 챗봇 설정

OpenAI API 키 하나만 등록하면 됩니다. Redis, Upstash, 별도의 챗봇 서비스는 필요하지 않습니다.
네비게이션 스파클을 클릭하면 챗봇이 열리고, 기존 HOME 링크와 호버 메뉴는 그대로 동작합니다.

## 배포 사이트에서 사용하기

1. [OpenAI Platform](https://platform.openai.com/)에서 API 결제 설정을 확인하고 API 키를 발급합니다. ChatGPT 구독과 API 이용 요금은 별개입니다.
2. Vercel의 **realportfolio → Settings → Environment Variables**에서 이름을 `OPENAI_API_KEY`, 값을 발급받은 비밀 키로 등록합니다.
3. Production에 적용하고, 미리보기 배포에서도 사용하려면 Preview에도 적용합니다.
4. 이번 코드를 GitHub에 업로드한 뒤 Vercel에서 최신 코드로 재배포합니다. 환경 변수를 바꾼 경우에도 재배포가 필요합니다.
5. 스파클을 누르고 “프론트엔드 프로젝트를 소개해줘”라고 질문합니다. 실제 질문에는 API 이용 요금이 발생할 수 있습니다.

기존처럼 Vercel Root Directory는 저장소 최상위로 두고 Git LFS 설정은 유지합니다.
이전에 Upstash 환경 변수를 등록했다면 삭제해도 됩니다. 코드에서는 더 이상 사용하지 않습니다.

## 내 컴퓨터에서 사용하기

저장소 최상위의 `.env.local`에 다음 값을 설정하고 `npm run dev`를 실행합니다.

```dotenv
OPENAI_API_KEY=발급받은_비밀_키
```

`.env.local`은 Git에서 제외되어 있습니다. `.env.example`은 비밀 값이 없는 예시 파일로만 유지하세요.
API 키를 JSON, 프롬프트, 소스 코드, 채팅, GitHub에 넣지 마세요. 변수 이름 앞에 `VITE_`도 붙이지 마세요.
키가 공개되거나 업로드된 적이 있다면 OpenAI에서 폐기하고 새 키를 발급하세요.

## 챗봇이 알고 있는 정보 수정

### 기본 정보: `portfolio/src/data/chatbotProfile.json`

이름, 직무, 공개 이메일, 소개, 기술, 경험이 들어 있습니다.
현재 포트폴리오의 공개 정보를 넣어 두었습니다. 변경되거나 아직 확정되지 않은 내용은 이 파일에서 수정하세요.
새 필드를 추가하면 그 필드도 참고 정보에 포함됩니다. 비공개 개인정보는 넣지 마세요.

### 행동 지침 프롬프트: `server/prompts/chatbot.md`

챗봇의 역할, 말투, 답변 길이, 질문 범위, 모르는 정보의 처리, 개인정보 보호, 프로젝트 추천 방식과 출력 형식이 들어 있습니다.
한국어 문서이므로 일반 글처럼 편집하면 됩니다. 추가 FAQ는 파일 맨 아래의 “운영자가 추가할 안내”에 작성할 수 있습니다.
서버가 이 파일을 읽고, 실제 공개 정보와 프로젝트 목록을 뒤에 붙여 OpenAI 요청의 `instructions`로 전달합니다.
프롬프트가 비어 있거나 없으면 서버가 오류를 내므로 파일을 삭제하지 마세요.

### 프로젝트 정보: 기존 JSON 자동 연결

- `portfolio/src/data/frontend.json`
- `portfolio/src/data/industrialDesign.json`

각 프로젝트의 제목, 요약, 설명, category부터 category3까지, 팀 프로젝트 여부와 상세 페이지 링크가 자동으로 포함됩니다.
따로 프롬프트에 프로젝트를 복사할 필요는 없습니다. 이미지, PDF, 영상을 직접 분석하는 기능은 아닙니다.

정보나 프롬프트를 수정한 뒤 로컬에서는 개발 서버를 다시 시작하고, 배포에서는 업로드 후 재배포하세요.

## 선택 설정

다음 값들은 필수가 아닙니다. Vercel 환경 변수나 로컬 `.env.local`에 지정할 수 있습니다.

| 이름 | 기본값 | 역할 |
| --- | --- | --- |
| `OPENAI_MODEL` | `gpt-5.6-terra` | 사용할 모델. 계정에서 사용 가능하고 Responses API와 Structured Outputs를 지원해야 합니다. |
| `CHAT_DAILY_LIMIT` | `100` | 서버 인스턴스별 UTC 날짜 기준 하루 요청 수 |
| `CHATBOT_ENABLED` | `true` | `false`로 바꾸고 재배포하면 AI 호출 중단 |

## 비용과 제한의 주의점

- API 키는 서버에서만 사용하며 브라우저에 전달하지 않습니다. 입력 크기 검증, 시간 제한, 안전한 프로젝트 링크 검증도 유지됩니다.
- 기본 임시 제한은 IP 기준 분당 5회, 시간당 20회와 서버 인스턴스 기준 하루 100회입니다.
- **제한은 서버 메모리에서만 계산됩니다. Vercel이 서버를 새로 띄우거나 여러 개 실행하면 초기화되거나 각각 따로 계산됩니다. 사이트 전체의 엄격한 요청 한도나 비용 상한이 아닙니다.**
- 공개 챗봇의 비용은 키 소유자가 부담합니다. OpenAI 프로젝트의 사용량과 지출 관련 설정을 확인하고 운영 중에도 모니터링하세요.
- 긴급 중단이 필요하면 OpenAI에서 키를 폐기할 수 있습니다. 환경 변수 변경만으로 기존 배포가 즉시 바뀌는 것은 아닙니다.
- 최근 대화 최대 8개와 공개 참고 정보가 OpenAI로 전송됩니다. 앱 자체에는 대화 저장 DB가 없으며 `store: false`로 요청합니다. 이것이 OpenAI의 모든 보관 정책을 없애는 것은 아닙니다.

## 연결 오류 확인

- 연결 설정 오류: `OPENAI_API_KEY`가 해당 배포 환경에 등록되었는지, `CHATBOT_ENABLED`가 `false`인지 확인합니다.
- AI 응답 연결 오류: OpenAI 결제 설정, 키 권한, 모델 사용 권한을 확인합니다.
- 질문이 많다는 안내: 현재 서버의 요청 제한에 도달한 상태입니다.
- `/api/chat`이 404이거나 HTML을 반환함: 최신 배포 코드와 Vercel Root Directory를 확인합니다.

연결 파일은 `api/chat.mjs`, 서버 로직은 `server/chat.mjs`, 대화창은 `portfolio/src/components/Chatbot.jsx`와 `Chatbot.module.scss`입니다.

참고: [OpenAI Docs: 프롬프트와 instructions](https://developers.openai.com/api/docs/guides/prompt-engineering), [운영 보안](https://developers.openai.com/api/docs/guides/production-best-practices), [데이터 정책](https://developers.openai.com/api/docs/guides/your-data).
