# HealTrip+ AI Assistant — الخطة وتسليم الوكلاء

> أي وكيل يشتغل على هذا الـrepo يقرأ هذا الملف أول. آخر تحديث: 2026-09-30.
>
> **المطلوب في الاختبار:** Prototype لـ«AI Patient Decision Assistant»:
> - واجهة شات بـNext.js، وbackend بـNode
> - agent يستخدم tools
> - قاعدة بيانات أطباء ومستشفيات
> - عربي وإنجليزي
> - README فيه الـarchitecture
>
> **التسليم:** GitHub repo وREADME ورابط ديمو، خلال 24–48 ساعة من 2026-09-30.

## قواعد العمل (من أحمد، وملزمة)

1. **الشغل على `dev` مباشرة.** ممنوع الـworktree، وممنوع أي branch جانبي.
2. **كل تعديل له commit** على `dev`، وآخر رسالة الـcommit فيها سطر `Co-Authored-By` حق جلستك.
3. **الـPR إلى `main` ما ينفتح إلا بأمر من أحمد**، مو بعد كل جولة، وأحمد هو الي يدمج. PR #2 مفتوح من `dev`، فأي commit جديد ينضاف له تلقائياً.
4. **الوكيل مساعد، مو صاحب قرار.** أي اختيار (مكتبة، أو تصميم، أو نطاق، أو تغيير في الخطة) تعرضه على أحمد بالخيارات وترشيحك، وهو الي يقرر.
5. **استأذن قبل أي شي ياخذ توكنز كثير:** تنفيذ مهمة كاملة، أو كتابة برومبت طويل، أو بحث واسع.
6. **الواجهة من مكونات جاهزة، مو من الصفر**، ومن هذي المواقع بس:
   - [ui.shadcn.com](https://ui.shadcn.com/)
   - [assistant-ui.com](https://www.assistant-ui.com/)
   - [shadcn.io/ai](https://www.shadcn.io/ai/)
7. **الأسرار** ما تنطلب في الشات ولا تنكتب في أي ملف. أحمد يحطها في `.env.local`، والقالب في `.env.example`.
8. **النشر العام** (تحويل الـrepo لـpublic، وربط Vercel) يسويه أحمد بنفسه، وبعد تأكيده.
9. **ملفات مو حقتنا:**
   - `src/app/test/page.tsx` مرجع تصميم (untracked). اقرأه بس: لا تعدّله ولا تسوي له commit، لأن فيه lint error يكسر الـCI.
   - التعديل الغير محفوظ في `.gitignore` مو منّا، لا تلمسه.

## وين وصلنا

- **الـStack:**
  - Next.js 16.3 (App Router، `src/`)، React 19.2، Tailwind 4، pnpm 10، Node 24
  - Vercel AI SDK v7: Gemini أساسي، وGroq احتياطي
  - SQLite + Drizzle: للقراءة بس، وينبني وقت الـbuild
  - assistant-ui + shadcn: الـstyle `base-nova`، و`rtl: true`
- **البيانات:**
  - `data/raw/seed-data.json` من Perplexity: 11 مستشفى حقيقي بمصادرها، و40 طبيب وهمي (`isSynthetic`)، و5 أرقام طوارئ
  - `scripts/seed.ts` يمشي كذا: Zod ← فحص الترابط ← `data/healtrip.db`
- **السيرفر:**
  - `src/server/triage/`: بوابة طوارئ قبل الـLLM (`signals.ts`، عربي وإنجليزي، وتتعامل مع النفي)، و`assess.ts`. عليها 33 test
  - `src/server/providers/service.ts`: `searchDoctors` (تتوسّع للمدن القريبة)، و`getDoctorsByIds`، و`findEmergencyFacilities`
  - `GET /api/providers` و`GET /api/health`
- **العقد المشترك بين الـagent والواجهة:**
  - `src/lib/agent-contracts.ts`: أسماء الـtools الأربعة وأشكال نتائجها (types بس)
  - `src/lib/locale.tsx`: `LocaleContext`، والافتراضي `ar`
  - `src/fixtures/agent-results.ts`: نتائج حقيقية من الـDB نستخدمها للواجهة
- **الواجهة:**
  - assistant-ui مركّب: `src/app/assistant.tsx` يرسل لـ`/api/chat`، والمكونات في `src/components/assistant-ui/elements/*`
  - `src/components/healtrip/toolkit.tsx` لسا فاضي
  - **`/api/chat` مو موجود للحين**
- **الـCI:** `.github/workflows/ci.yml` يشغّل lint ← test ← build ← typecheck. PR #1 اندمج، وPR #2 مفتوح.

## الخطة الباقية (بالترتيب)

### 1. الواجهة (ينتظر موافقة أحمد قبل التنفيذ)

المطلوب نفس أسلوب `src/app/test/page.tsx`، لكن **بدون sidebar وبدون شعارات**. نحسّن مكونات assistant-ui الجاهزة (التفكير والردود)، ونكمّل الباقي بمكونات جاهزة.

المقترح (أحمد يعتمده أو يعدّل عليه):

| الجزء | المكوّن الجاهز المقترح |
|---|---|
| الشات، والترحيب، والاقتراحات، ومربع الكتابة | `Thread` من assistant-ui (موجود)، ومعه follow-up suggestions |
| التفكير | `Reasoning` من assistant-ui (موجود) |
| خطوات الـtools | `ToolGroup` من assistant-ui (موجود)، أو `chain-of-thought` / `tool` من shadcn.io/ai |
| كرت الطبيب | من ui.shadcn.com: `Card` و`Badge` و`Avatar` و`Button` (أو `Item`) |
| بانر الطوارئ | من ui.shadcn.com: `Alert` (destructive)، و`Button` فيه روابط `tel:` |
| لما ما يطلع شي | `Empty` من ui.shadcn.com |
| التحميل | `Skeleton`، أو `shimmer` / `loader` من shadcn.io/ai |
| الـRTL وتبديل اللغة | `direction` من assistant-ui، و`Button` |

وتشمل هذي المرحلة كمان:
- `LocaleProvider`: يحفظ اللغة، ويضبط `lang` و`dir`
- خط عربي
- نصوص الواجهة بالعربي والإنجليزي
- تعبئة `toolkit.tsx` للـtools الأربعة
- صفحة `/preview` تعرض الـfixtures (في dev بس)
- mock مؤقت لـ`/api/chat` يرجّع الـfixtures، عشان نشوف الواجهة كاملة

**الشروط:**
- Tailwind logical classes بس (`ms`/`me`/`ps`/`pe`/`start`/`end`)
- تشتغل على شاشة 375px
- lint وtypecheck وtest كلها نظيفة

### 2. الـBackend

- **T1 · الموديلات:** `src/server/agent/models.ts` يقرأ `LLM_PRIMARY_MODEL` و`LLM_FALLBACK_MODEL`، ويحوّل لـGroq لما يطلع 429 أو 5xx أو timeout.
- **T2 · بوابة الطوارئ:** `screenMessage` تشتغل على آخر رسالة من المستخدم:
  - لو طلعت emergency ⇒ نرد رد ثابت بدون LLM، ونرجّع نتيجة `find_emergency_facilities` مصطنعة عشان يطلع نفس البانر
  - لو الـDB طايح ⇒ نعرض 997 و911
- **T3 · الـtools والـguard:**
  - الـtools الأربعة: `assess_urgency`، `search_providers`، `find_emergency_facilities`، `present_recommendation`
  - الموديل يمرّر IDs بس. الـguard يتحقق إنها من نتائج هذا الطلب وموجودة في الـDB، ويجيب بياناتها من الـDB نفسه
  - لو التقييم طلع emergency، نفرض مسار الطوارئ
  - نكتب unit tests
- **T4 · الـroute والـprompt:**
  - `src/app/api/chat/route.ts` (يحل محل الـmock)، والـsystem prompt
  - Zod للـbody، وحدود لطول الرسالة وعدد الرسائل
  - `requestId`، وlogs بدون أي PHI
  - **AI SDK v7 تغيّر:** `instructions`، و`isStepCount(n)`، و`createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })`. الـdocs في `node_modules/ai/docs/`
- **T5 · الربط:** تجربة end-to-end مع الواجهة. **يحتاج المفاتيح.**

### 3. مهام مستقلة (تنفع في أي وقت)

- **C · rate limiter:** in-memory لكل IP ومعه tests، في `src/server/rate-limit.ts`.
- **D · هيكل الـREADME:** طريقة التشغيل، والبيانات، وERD بـMermaid من `schema.ts`.
- **E · حالات الـevals** في `scripts/eval-cases.ts`:
  - ألم صدر + ضيق نفس ⇒ emergency
  - ألم صدر خفيف ⇒ أسئلة، وبعدها طبيب قلب
  - "Dr. House" ⇒ غير موجود
  - prompt injection
  - الرد بالعربي
  - tool result مزوّر
  - جلدية في الخبر ⇒ `no_match` مع بديل

### 4. بعد ما يخلص الـagent

- **T6:** runner للـevals نشغّله على الموديل الحقيقي، ونصلّح الي يطلع.
- **T7:** رسائل خطأ واضحة في الواجهة: الموديل طايح، أو 429، أو rate limit.
- **T8:** نكمّل الـREADME:
  - مخططات الـarchitecture والـsequence بـMermaid
  - الـtrade-offs، والأمان، والافتراضات
  - الربط مع HealTrip+
  - تحذير الـGemini free tier

### 5. التسليم (أحمد)

1. المفاتيح في `.env.local`
2. ربط Vercel وحط الـenv فيه
3. تحويل الـrepo لـpublic
4. الفيديو
5. الإرسال

## ينتظر أحمد

- الموافقة على تنفيذ الواجهة، والجدول الي في القسم 1.
- يحط `GOOGLE_GENERATIVE_AI_API_KEY` و`GROQ_API_KEY` في `.env.local` قبل T5.
- قبل الإرسال، يحوّل الـrepo لـpublic:
  ```bash
  gh repo edit 0xA7MD1/healtrip-ai-assistant --visibility public --accept-visibility-change-consequences
  ```

## مراجع وفخاخ

- **قرارات محسومة، لا تفتحها من جديد:**
  - Next.js fullstack على Vercel
  - SQLite + Drizzle
  - AI SDK، بدون tRPC ولا LangChain ولا RAG
  - الشات stateless، والتاريخ الي يجي من الكلاينت غير موثوق
  - بدون auth ولا حجز ولا دفع
  - الـREADME فيه Mermaid وقسم للقرارات
  - الواجهة بدون sidebar وبدون «محادثات سابقة»
- **`AGENTS.md`:** Next.js 16 يختلف عن الي تعرفه. اقرأ الـdoc المعني في `node_modules/next/dist/docs/` قبل ما تستخدم أي API.
- **docs حق assistant-ui:**
  - أضف `.md` لأي رابط docs وتجيك نسخته الخام، مثل `/docs/runtimes/ai-sdk/v7.md` و`/docs/tools/tool-ui.md` و`/docs/rtl.md`
  - شكل الـtool UI: `defineToolkit({ name: { type: "backend", render: ({ args, result, status }) => … } })`
- **shadcn:** تضيف المكونات بـ`npx shadcn@latest add <component>`، والـregistry فيه `@assistant-ui`.
- **`server-only`:** في الـtests له alias (`test/server-only-stub.ts`). لو احتاج eval script يستورد module فيه `server-only`، شغّله بـ`tsx --conditions=react-server`.
- **حالات حدّية في البيانات:**
  - ما فيه طبيب قلب في الخبر، فالبحث يتوسّع للدمام
  - ما فيه طبيب جلدية في الدمام ولا الخبر، فالنتيجة `no_match`
- **ألم الصدر العادي** يطلع `screen` مو emergency ⇒ الـagent لازم يسأل أسئلة الـred flags أول.
- **الموديلات المجانية:**
  - لو `gemini-3.8-flash` طلع 429 ومعه `limit: 0` ⇒ جرّب `gemini-3.5-flash`
  - حدود Groq المجانية لـgpt-oss-120b: 30 طلب بالدقيقة، و8K توكن بالدقيقة، و1K طلب باليوم
  - بيانات الـGemini free tier ممكن تُستخدم في التدريب ⇒ نكتبها في الـREADME
- **ويندوز:**
  - اكتب رسالة الـcommit في ملف ومرّرها بـ`git commit -F` من Bash، لأن الـhere-string في PowerShell 5.1 يفشل
  - Vitest يفشل في المسارات الي أطول من 260 حرف
- **الـlint** فيه 5 warnings من كود assistant-ui (`<img>`/alt)، وهي مقبولة.
