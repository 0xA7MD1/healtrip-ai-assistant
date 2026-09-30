# HealTrip+ AI Assistant — الحالة وتسليم الوكلاء

> أي وكيل يشتغل على هذا الـrepo يقرأ هذا الملف أول. آخر تحديث: 2026-09-30.
> تفاصيل الـarchitecture والقرارات والأمان في `README.md`، فلا تكرّرها هنا.

## قواعد العمل (من أحمد، وملزمة)

1. **الشغل على `dev` مباشرة.** ممنوع الـworktree، وممنوع أي branch جانبي.
2. **كل تعديل له commit** على `dev`، وآخر رسالة الـcommit فيها سطر `Co-Authored-By` حق جلستك.
3. **الـPR إلى `main`، والـpush، ما يصيرون إلا بأمر من أحمد.** وأحمد هو الي يدمج. PR #2 مفتوح من `dev`.
4. **الوكيل مساعد، مو صاحب قرار.** أي اختيار تعرضه على أحمد بالخيارات وترشيحك، وهو الي يقرر.
5. **استأذن قبل أي شي ياخذ توكنز كثير:** مهمة كاملة، أو برومبت طويل، أو بحث واسع.
6. **الواجهة من مكونات جاهزة بس**، من [ui.shadcn.com](https://ui.shadcn.com/) و[assistant-ui.com](https://www.assistant-ui.com/) و[shadcn.io/ai](https://www.shadcn.io/ai/). ما فيه sidebar ولا شعارات.
7. **الأسرار** ما تنطلب ولا تنكتب في أي ملف. المفاتيح موجودة في `.env.local`.
8. **النشر العام** (Vercel، وتحويل الـrepo لـpublic) يسويه أحمد بنفسه.
9. **ملفات مو حقتنا، لا تسوي لها commit:**
   - `src/app/test/page.tsx`: mockup التصميم، وفيه lint error
   - التعديل الغير محفوظ في `.gitignore`

## الحالة: المنتج كامل على `dev` (ما انرفع)

- **الـbackend:**
  - `POST /api/chat`: rate limit ← validation ← تنظيف الـhistory (النص بس) ← بوابة طوارئ قبل الـLLM ← agent (أقصاها 6 خطوات)
  - `src/server/agent/`: الموديلات (Gemini، ويتحوّل لـGroq تلقائياً)، والـprompt، والـtools الأربعة، والـguard، ورد الطوارئ الثابت
- **الواجهة:**
  - assistant-ui وshadcn، عربي/إنجليزي، والـRTL يتحفظ في cookie
  - الترحيب وفيه 4 كروت، وكروت الأطباء، وبانر الطوارئ، وخطوات التحليل، والتفكير، وfollow-up chips (بدون LLM)
  - رسائل الأخطاء مترجمة
- **الاختبارات:**
  - `pnpm test`: 55 unit test
  - `pnpm eval`: 11/11 end-to-end مع الموديل الحقيقي (يحتاج `pnpm dev` شغّال)
- **`README.md`:** فيه Mermaid للـarchitecture والـsequence والـERD، والأمان، والـevals، والقرارات، والربط مع HealTrip+
- **الـbuild وlint (على `src`) وtypecheck:** كلها نظيفة

## ينتظر أحمد (بالترتيب)

1. **`git push origin dev`** (بأمرك). بعده ينضاف كل شي لـPR #2، ويشتغل الـCI.
2. **Vercel:**
   - تربط الـrepo
   - تحط `GOOGLE_GENERATIVE_AI_API_KEY` و`GROQ_API_KEY` (و`LLM_PRIMARY_MODEL` و`LLM_FALLBACK_MODEL` لو تبي تغيّرها) في Environment Variables
   - أمر الـbuild الافتراضي (`pnpm build`) يسوي seed للـDB بنفسه
3. **رابط الديمو:** تحطه في `README.md` مكان «_added after deployment_».
4. **دمج PR #2** إلى `main` (بأمرك)، وتغيّر عنوانه لـ«Working product».
5. **تحويل الـrepo لـpublic:**
   ```bash
   gh repo edit 0xA7MD1/healtrip-ai-assistant --visibility public --accept-visibility-change-consequences
   ```
6. **الفيديو، والإرسال.**

## فخاخ لازم تعرفها

- **الـfree tier ضيّق:**
  - Gemini يرجّع 429 كثير، وGroq حدّه 8K توكن بالدقيقة
  - عشان كذا: مخرجات الـtools للموديل مختصرة (`toModelOutput`)، و`maxRetries: 2`، والـevals تنتظر 20 ثانية بين كل حالة (`EVAL_PAUSE_MS`)
  - لو صار عرض أمام مراجع، لا ترسل رسائل ورا بعض بسرعة
- **`pnpm build` على ويندوز والـdev شغّال:** الـseed يفشل بـ`EPERM`، لأن ملف الـDB مقفول. استخدم `npx next build`.
- **فيه `next dev` ثاني شغّال على port 3000** من نفس المجلد، ومو مني. port 3107 (`.claude/launch.json`) يتعارض معه.
- **ثوابت اللغة** اللي يحتاجها السيرفر مكانها `src/lib/locale-config.ts`. `locale.tsx` ملف `"use client"`، ولو السيرفر استورد منه دالة يطلع خطأ.
- **Next.js 16 يختلف:** اقرأ الـdoc المعني في `node_modules/next/dist/docs/` قبل ما تستخدم أي API. وdocs حق AI SDK v7 في `node_modules/ai/docs/`.
- **ويندوز:**
  - رسائل الـcommit عن طريق ملف و`git commit -F` من Bash
  - الـcurl بنص عربي لازم يكون `--data-binary @file`، مو argument
- **الـlint** فيه 5 warnings من كود assistant-ui (`<img>`/alt)، وهي مقبولة.
