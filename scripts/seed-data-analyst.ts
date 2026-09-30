/**
 * Seeds the Data Analyst track: modules 4-6 (beginner → advanced)
 * with lessons (worked examples included) and 9 challenges. Safe to re-run.
 * Run: npm run script -- scripts/seed-data-analyst.ts
 */
import { closeDb } from "../src/lib/db/client";
import { upsertChallenge } from "../src/lib/db/challenges";
import { upsertModule } from "../src/lib/db/modules";
import type { Challenge, ChallengePrivate, PublicTestCase } from "../src/lib/types";

async function main() {

  /* ------------------------------ modules ------------------------------ */

  const modules = [
    {
      id: "module-04",
      title: "Дата анализын үндэс",
      syllabus_ref: "DA1",
      order: 4,
      description: "Дата аналист гэж хэн бэ: дундаж, min/max, өгөгдлийг Python жагсаалтаар шинжлэх (анхан шат).",
      lesson_mdx: `# Дата анализын үндэс

**Дата аналист** гэдэг нь өгөгдлөөс утга учир олж, шийдвэр гаргалтад тусалдаг мэргэжилтэн. Энэ хөтөлбөрөөр та Python ашиглан өгөгдлийг цэвэрлэх, шинжлэх, таамаглал гаргах чадварыг анхан шатнаас ахисан түвшин хүртэл эзэмшинэ.

## Тоон өгөгдлийн үндсэн үзүүлэлтүүд

| Үзүүлэлт | Утга | Python |
| --- | --- | --- |
| **Дундаж (mean)** | Нийлбэрийг тоонд хуваасан | \`sum(data) / len(data)\` |
| **Хамгийн бага** | Min утга | \`min(data)\` |
| **Хамгийн их** | Max утга | \`max(data)\` |
| **Далайц (range)** | Max − Min | \`max(data) - min(data)\` |

## Гаргалгаатай жишээ 1: Ангийн дүнгийн дундаж

**Бодлого:** Сурагчдын дүн \`[85, 92, 78, 95]\` өгөгдөв. Дундажийг ол.

**Гаргалгаа — алхам алхмаар:**

1. Нийлбэрийг олно: 85 + 92 + 78 + 95 = **350**
2. Тоог нь тоолно: **4** сурагч
3. Хуваана: 350 ÷ 4 = **87.5**

\`\`\`python
scores = [85, 92, 78, 95]
mean = sum(scores) / len(scores)
print(mean)  # 87.5
\`\`\`

<Callout type="info">
Хуваалт (\`/\`) үргэлж бодит тоо (float) буцаана — 350/4 нь 87.5. Бүхэл хуваалт хэрэгтэй бол \`//\` ашиглана.
</Callout>

## Гаргалгаатай жишээ 2: Далайц олох

**Бодлого:** Долоо хоногийн температур \`[-5, 2, 8, -1, 4]\`. Хамгийн их хэлбэлзлийг ол.

**Гаргалгаа:**

1. Хамгийн их: \`max()\` → **8**
2. Хамгийн бага: \`min()\` → **−5**
3. Далайц: 8 − (−5) = **13** градус

\`\`\`python
temps = [-5, 2, 8, -1, 4]
print(max(temps) - min(temps))  # 13
\`\`\`

## Бодит тоог хэвлэх формат

Дата аналист үр дүнгээ ихэвчлэн **тодорхой оронгийн нарийвчлалтай** үзүүлдэг:

\`\`\`python
avg = 7 / 3
print(f"{avg:.2f}")  # 2.33  (таслалын дараах 2 орон)
\`\`\`

<Callout type="warning">
\`:.2f\` нь тоймлохдоо математикийн дүрмээр тоймлоно: 2.336 → 2.34, харин 2.333 → 2.33.
</Callout>

## Дүгнэлт

- Дундаж = нийлбэр ÷ тоо, Python-д \`sum()/len()\`
- \`min()\`, \`max()\` — хамгийн бага/их
- \`f"{x:.2f}"\` — 2 оронгийн нарийвчлалтай хэвлэх`,
    },
    {
      id: "module-05",
      title: "Өгөгдөл боловсруулах ба цэвэрлэх",
      syllabus_ref: "DA2",
      order: 5,
      description: "Шүүлт, давтамж тоолох, dictionary, өгөгдөл цэвэрлэх зарчмууд (дунд шат).",
      lesson_mdx: `# Өгөгдөл боловсруулах ба цэвэрлэх

Бодит өгөгдөл ихэвчлэн **эмх замбараагүй** байдаг: дутуу утга, давхардал, алдаатай бичилт. Дата аналистын ажлын 80% нь өгөгдлөө шинжилгээнд бэлтгэх явдал гэж хэлдэг.

## Шүүлт (filtering)

Нөхцөл хангасан утгуудыг ялгаж авах:

\`\`\`python
sales = [120, 45, 300, 80, 250]
big = [x for x in sales if x > 100]
print(big)       # [120, 300, 250]
print(len(big))  # 3
\`\`\`

## Гаргалгаатай жишээ 1: Босго давсан борлуулалт

**Бодлого:** \`[5, 12, 8, 20, 10]\` дотроос 10-аас **их** утга хэд байна вэ?

**Гаргалгаа:**

1. Утга бүрийг босготой харьцуулна: 5 (үгүй), 12 (тийм), 8 (үгүй), 20 (тийм), 10 (үгүй — "их" гэдэг нь 10-ыг оруулахгүй!)
2. Хариулт: **2**

<Callout type="warning">
"Их" (>) ба "их буюу тэнцүү" (>=) хоёрыг андуурах нь хамгийн түгээмэл алдаа. Бодлогын нөхцөлөө анхааралтай уншаарай.
</Callout>

## Давтамж тоолох — dictionary

Аль утга хэдэн удаа тохиолдож буйг тоолох нь анализын суурь үйлдэл:

\`\`\`python
words = "alma banana alma cherry alma".split()
counts = {}
for w in words:
    counts[w] = counts.get(w, 0) + 1
print(counts)  # {'alma': 3, 'banana': 1, 'cherry': 1}
\`\`\`

## Гаргалгаатай жишээ 2: Хамгийн олон давтагдсан үг

**Бодлого:** Дээрх \`counts\`-оос хамгийн олон давтагдсаныг ол. Хэрэв давтамж тэнцвэл **цагаан толгойн эхэнд** байгааг нь сонго.

**Гаргалгаа:**

1. Түлхүүрүүдийг эрэмбэлнэ: \`sorted(counts)\` → alma, banana, cherry
2. Давтамжаар нь max авна — тэнцсэн үед эрэмбэлсэн жагсаалтын **эхнийх** нь үлдэнэ:

\`\`\`python
best = max(sorted(counts), key=lambda w: counts[w])
print(best)  # alma
\`\`\`

## Өгөгдөл цэвэрлэх зарчмууд

| Асуудал | Шийдэл |
| --- | --- |
| Дутуу утга (missing) | Устгах, эсвэл дундажаар нөхөх |
| Давхардал (duplicates) | \`set()\` эсвэл шалгаж алгасах |
| Формат зөрөх ("10" vs 10) | Нэг төрөлд хөрвүүлэх \`int()\` |

## Дүгнэлт

- Шүүлт: \`[x for x in data if нөхцөл]\`
- Давтамж: \`counts.get(w, 0) + 1\`
- Тэнцсэн давтамжид \`max(sorted(...), key=...)\` нь цагаан толгойн эхнийхийг өгнө`,
    },
    {
      id: "module-06",
      title: "Ахисан дата анализ: бүлэглэлт ба таамаглал",
      syllabus_ref: "DA3",
      order: 6,
      description: "Категориор бүлэглэж нэгтгэх, чиг хандлага тооцох, outlier илрүүлэх (ахисан шат).",
      lesson_mdx: `# Ахисан дата анализ

Энэ модульд бодит аналитикийн хоёр гол үйлдлийг эзэмшинэ: **бүлэглэж нэгтгэх** (group by) болон **чиг хандлагаар таамаглах** (trend forecasting).

## Бүлэглэж нэгтгэх (group by)

Excel-ийн pivot table, SQL-ийн GROUP BY-тай ижил санаа — категори тус бүрийн нийлбэрийг олно:

\`\`\`python
rows = [("food", 10), ("tech", 5), ("food", 7)]
totals = {}
for cat, amount in rows:
    totals[cat] = totals.get(cat, 0) + amount
for cat in sorted(totals):
    print(f"{cat}: {totals[cat]}")
# food: 17
# tech: 5
\`\`\`

## Гаргалгаатай жишээ 1: Борлуулалтыг ангилалаар нэгтгэх

**Бодлого:** food 10, tech 5, food 7 гэсэн гүйлгээнүүдээс ангилал бүрийн нийт дүнг ол.

**Гаргалгаа:**

1. Хоосон dictionary үүсгэнэ: \`{}\`
2. food 10 → \`{food: 10}\`
3. tech 5 → \`{food: 10, tech: 5}\`
4. food 7 → food-ийн одоогийн 10 дээр нэмнэ → \`{food: 17, tech: 5}\`
5. Түлхүүрээр эрэмбэлж хэвлэнэ

## Чиг хандлага (trend) ба энгийн таамаглал

Өдөр бүрийн өөрчлөлтийн дундажаар маргаашийг таамаглаж болно:

\`\`\`python
data = [10, 20, 40]
diffs = [data[i+1] - data[i] for i in range(len(data)-1)]
avg_diff = sum(diffs) / len(diffs)      # (10+20)/2 = 15.0
prediction = data[-1] + avg_diff        # 40 + 15 = 55.0
print(f"{prediction:.1f}")              # 55.0
\`\`\`

## Гаргалгаатай жишээ 2: Дараагийн өдрийн таамаг

**Бодлого:** Хэрэглэгчийн тоо өдөр бүр \`[2, 4, 8, 10]\` байв. 5 дахь өдрийг таамагла.

**Гаргалгаа:**

1. Өөрчлөлтүүд: 4−2=2, 8−4=4, 10−8=2 → \`[2, 4, 2]\`
2. Дундаж өөрчлөлт: (2+4+2)/3 = 8/3 ≈ **2.667**
3. Таамаг: 10 + 2.667 = 12.667 → **12.7** (1 орны нарийвчлалтай)

<Callout type="info">
Энэ бол **шугаман экстраполяци** — хамгийн энгийн таамаглалын арга. Бодит аналитикт үүн дээр улирлын нөлөө, регресс зэрэг нэмэгддэг.
</Callout>

## Outlier (гажуудсан утга)

Бусдаасаа эрс ялгарах утгыг **outlier** гэнэ. Жишээ: цалингийн жагсаалт \`[2сая, 2.5сая, 3сая, 50сая]\` — 50сая нь outlier.

- Outlier **дундажийг** эрс гажуудуулна (дээрх жишээнд дундаж 14.4сая болно!)
- Харин **медиан** (эрэмбэлээд голын утга) outlier-т тэсвэртэй → 2.75сая
- Илрүүлэх энгийн арга: дундажаас хэт хол (жишээ нь 2-3 стандарт хазайлтаас илүү) утгуудыг шалгах

## Дүгнэлт

- Group by = dictionary дээр \`get(k, 0) + нэмэх\`, эрэмбэлж хэвлэх
- Таамаглал = сүүлийн утга + өөрчлөлтийн дундаж
- Outlier дундажийг гажуудуулдаг, медиан тэсвэртэй`,
    },
  ];

  for (const mod of modules) {
    await upsertModule(mod);
    console.log("module seeded:", mod.id);
  }

  /* ----------------------------- challenges ---------------------------- */

  interface SeedChallenge {
    id: string;
    public: Omit<Challenge, "id">;
    hidden?: PublicTestCase[];
    hint?: string;
    private?: ChallengePrivate;
  }

  const challenges: SeedChallenge[] = [
    // ---------- module-04 (анхан) ----------
    {
      id: "ch-da-04-mcq-mean",
      public: {
        module_id: "module-04",
        type: "mcq",
        title: "Дундаж утга",
        prompt: "`[2, 4, 6, 8]` өгөгдлийн **дундаж (mean)** нь хэд вэ?",
        xp_reward: 10,
        order: 1,
        options: ["4", "5", "6", "20"],
      },
      private: { correct_answer_index: 1 },
    },
    {
      id: "ch-da-04-avg",
      public: {
        module_id: "module-04",
        type: "coding",
        title: "Дундажийг тооцоолох",
        prompt:
          "Эхний мөрөнд тоонуудын **тоо N**, хоёр дахь мөрөнд **N бүхэл тоо** зайгаар тусгаарлагдан өгөгдөнө.\n\nДундажийг **таслалын дараах 2 орны** нарийвчлалтай хэвлэ.\n\n```text\nОролт:          Гаралт:\n4               25.00\n10 20 30 40\n```",
        xp_reward: 15,
        order: 2,
        language: "python",
        starter_code: "n = int(input())\nnums = list(map(int, input().split()))\n# дундажийг 2 орны нарийвчлалтай хэвлээрэй\n",
        public_test_cases: [
          { input: "4\n10 20 30 40", expected_output: "25.00" },
          { input: "3\n1 2 4", expected_output: "2.33" },
        ],
        has_hint: true,
      },
      hidden: [
        { input: "2\n5 6", expected_output: "5.50" },
        { input: "5\n3 3 3 3 3", expected_output: "3.00" },
      ],
      hint: 'Хичээлийн "Бодит тоог хэвлэх формат" хэсгийг хараарай: `print(f"{sum(nums)/n:.2f}")`',
    },
    {
      id: "ch-da-04-trace-range",
      public: {
        module_id: "module-04",
        type: "tracing",
        title: "Код мөшгих: далайц",
        prompt:
          "Доорх программ юу хэвлэхийг тооцоолж бичнэ үү:\n\n```python\ndata = [7, 2, 9, 4]\nlo = data[0]\nhi = data[0]\nfor x in data:\n    if x < lo:\n        lo = x\n    if x > hi:\n        hi = x\nprint(hi - lo)\n```",
        xp_reward: 10,
        order: 3,
      },
      private: { expected_answer: "7" },
    },

    // ---------- module-05 (дунд) ----------
    {
      id: "ch-da-05-filter",
      public: {
        module_id: "module-05",
        type: "coding",
        title: "Босго давсан утгууд",
        prompt:
          "Эхний мөрөнд **босго** тоо, хоёр дахь мөрөнд тоонууд зайгаар өгөгдөнө.\n\nБосгоос **их** (strictly greater) утга хэд байгааг хэвлэ.\n\n```text\nОролт:          Гаралт:\n10              2\n5 12 8 20 10\n```",
        xp_reward: 20,
        order: 1,
        language: "python",
        starter_code: "threshold = int(input())\nnums = list(map(int, input().split()))\n# босгоос их утгын тоог хэвлээрэй\n",
        public_test_cases: [
          { input: "10\n5 12 8 20 10", expected_output: "2" },
          { input: "0\n-1 0 1 2", expected_output: "2" },
        ],
        has_hint: true,
      },
      hidden: [
        { input: "100\n50 60", expected_output: "0" },
        { input: "5\n6 7 8", expected_output: "3" },
      ],
      hint: "`len([x for x in nums if x > threshold])` — «их» гэдэг нь босгыг өөрийг нь ОРУУЛАХГҮЙ гэдгийг анхаараарай.",
    },
    {
      id: "ch-da-05-freq",
      public: {
        module_id: "module-05",
        type: "coding",
        title: "Хамгийн олон давтагдсан үг",
        prompt:
          "Нэг мөрөнд үгс зайгаар өгөгдөнө. **Хамгийн олон давтагдсан** үгийг хэвлэ.\n\nХэрэв хэд хэдэн үг тэнцүү давтамжтай бол **цагаан толгойн эхэнд** байгааг нь хэвлэ.\n\n```text\nОролт:                Гаралт:\nalma banana alma      alma\n```",
        xp_reward: 25,
        order: 2,
        language: "python",
        starter_code: "words = input().split()\ncounts = {}\n# давтамжийг тоолоод хамгийн олныг хэвлээрэй\n",
        public_test_cases: [
          { input: "alma banana alma", expected_output: "alma" },
          { input: "a b b a c", expected_output: "a" },
        ],
        has_hint: true,
      },
      hidden: [
        { input: "x", expected_output: "x" },
        { input: "cat dog dog cat dog", expected_output: "dog" },
      ],
      hint: "Хичээлийн 2-р гаргалгаатай жишээг хараарай: `max(sorted(counts), key=lambda w: counts[w])` — эрэмбэлсний ачаар тэнцсэн үед эхнийх нь сонгогдоно.",
    },
    {
      id: "ch-da-05-theory-clean",
      public: {
        module_id: "module-05",
        type: "theory",
        title: "Өгөгдөл цэвэрлэх",
        prompt:
          "Бодит өгөгдөлд тохиолддог **гурван түгээмэл асуудлыг** нэрлэж, тус бүрийг хэрхэн шийдэхийг тайлбарлан бичнэ үү. Хариултаа илгээсний дараа үнэлгээний схемтэй тулгана.",
        xp_reward: 15,
        order: 3,
      },
      private: {
        mark_scheme:
          "Бүрэн хариулт 3 асуудал + шийдлийг агуулна:\n• Дутуу утга (missing values) — мөрийг устгах эсвэл дундаж/медианаар нөхөх\n• Давхардал (duplicates) — давхар бичилтийг илрүүлж устгах (жишээ нь set ашиглах)\n• Формат зөрүү (жишээ нь \"10\" гэсэн текст ба 10 гэсэн тоо) — нэг төрөлд хөрвүүлэх (int(), str.strip() г.м.)\nӨөр зөв асуудал (алдаатай бичилт, нэгжийн зөрүү г.м.) мөн тооцогдоно.",
      },
    },

    // ---------- module-06 (ахисан) ----------
    {
      id: "ch-da-06-groupby",
      public: {
        module_id: "module-06",
        type: "coding",
        title: "Ангилалаар нэгтгэх",
        prompt:
          "Эхний мөрөнд гүйлгээний тоо **N** өгөгдөнө. Дараагийн N мөр бүрт `ангилал дүн` хос өгөгдөнө.\n\nАнгилал бүрийн **нийт дүнг** `ангилал: нийлбэр` хэлбэрээр, ангилалыг **цагаан толгойн дарааллаар** хэвлэ.\n\n```text\nОролт:          Гаралт:\n3               food: 17\nfood 10         tech: 5\ntech 5\nfood 7\n```",
        xp_reward: 30,
        order: 1,
        language: "python",
        starter_code: "n = int(input())\ntotals = {}\nfor _ in range(n):\n    parts = input().split()\n    cat, amount = parts[0], int(parts[1])\n    # нэгтгээрэй\n# эрэмбэлж хэвлээрэй\n",
        public_test_cases: [
          { input: "3\nfood 10\ntech 5\nfood 7", expected_output: "food: 17\ntech: 5" },
          { input: "2\na 1\nb 2", expected_output: "a: 1\nb: 2" },
        ],
        has_hint: true,
      },
      hidden: [
        { input: "4\nz 1\nz 2\na 3\nm 1", expected_output: "a: 3\nm: 1\nz: 3" },
        { input: "1\nsolo 42", expected_output: "solo: 42" },
      ],
      hint: 'Хичээлийн group by хэсэг шууд туслана: `totals[cat] = totals.get(cat, 0) + amount`, дараа нь `for cat in sorted(totals): print(f"{cat}: {totals[cat]}")`',
    },
    {
      id: "ch-da-06-trend",
      public: {
        module_id: "module-06",
        type: "coding",
        title: "Дараагийн утгыг таамаглах",
        prompt:
          "Нэг мөрөнд өдөр бүрийн хэмжилтүүд (дор хаяж 2 бүхэл тоо) зайгаар өгөгдөнө.\n\n**Дараагийн өдрийн таамгийг** «сүүлийн утга + өөрчлөлтүүдийн дундаж» томьёогоор тооцоолж, **1 орны** нарийвчлалтай хэвлэ.\n\n```text\nОролт:       Гаралт:\n1 2 3 4      5.0\n```",
        xp_reward: 30,
        order: 2,
        language: "python",
        starter_code: "nums = list(map(int, input().split()))\n# өөрчлөлтүүдийн дундажийг олоод таамгаа хэвлээрэй\n",
        public_test_cases: [
          { input: "1 2 3 4", expected_output: "5.0" },
          { input: "10 20 40", expected_output: "55.0" },
        ],
        has_hint: true,
      },
      hidden: [
        { input: "5 5 5", expected_output: "5.0" },
        { input: "2 4 8 10", expected_output: "12.7" },
      ],
      hint: 'Хичээлийн "Чиг хандлага" хэсгийн кодыг хараарай: diffs жагсаалт → дундаж → `print(f"{nums[-1] + avg_diff:.1f}")`',
    },
    {
      id: "ch-da-06-theory-outlier",
      public: {
        module_id: "module-06",
        type: "theory",
        title: "Outlier ба түүний нөлөө",
        prompt:
          "**Outlier** гэж юу вэ? Дундаж болон медианд хэрхэн өөр нөлөөлдгийг жишээтэй тайлбарлаж, outlier илрүүлэх нэг арга дурдана уу.",
        xp_reward: 20,
        order: 3,
      },
      private: {
        mark_scheme:
          "Бүрэн хариулт:\n• Тодорхойлолт — бусад утгуудаас эрс ялгарах (хэт их/бага) утга\n• Дундажид хүчтэй нөлөөлж гажуудуулдаг, харин медиан тэсвэртэй (жишээ өгсөн байх: тухайлбал цалингийн жагсаалтад нэг маш өндөр цалин дундажийг огцом өсгөнө)\n• Илрүүлэх арга — дундажаас 2-3 стандарт хазайлтаас хол утгыг шалгах, эсвэл эрэмбэлж хамгийн зах руу нь харах, IQR арга г.м. аль нэг нь хангалттай",
      },
    },
  ];

  for (const ch of challenges) {
    await upsertChallenge(
      { ...ch.public, id: ch.id },
      {
        ...(ch.hidden ? { hidden_test_cases: ch.hidden } : {}),
        ...(ch.hint ? { hint: ch.hint } : {}),
        ...(ch.private ?? {}),
      }
    );
    console.log("challenge seeded:", ch.id);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
