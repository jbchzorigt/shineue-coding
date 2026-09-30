/**
 * Seeds the challenges of modules 1-3. Run scripts/import-content.ts first —
 * challenges reference their module. Safe to re-run.
 * Run: npm run script -- scripts/seed-challenges.ts
 */
import { closeDb } from "../src/lib/db/client";
import { upsertChallenge } from "../src/lib/db/challenges";
import type { Challenge, ChallengePrivate, PublicTestCase } from "../src/lib/types";

async function main() {
  interface SeedChallenge {
    id: string;
    public: Omit<Challenge, "id">;
    hidden?: PublicTestCase[];
    hint?: string;
    private?: ChallengePrivate;
  }

  const challenges: SeedChallenge[] = [
    {
      id: "ch-01-sum",
      public: {
        module_id: "module-01",
        type: "coding",
        title: "Хоёр тоо нэмэх",
        prompt:
          "Стандарт оролтын **эхний мөрөнд** нэг бүхэл тоо, **хоёр дахь мөрөнд** бас нэг бүхэл тоо өгөгдөнө.\n\nХоёр тооны **нийлбэрийг** хэвлэ.\n\n```text\nОролт:      Гаралт:\n3           7\n4\n```",
        xp_reward: 10,
        order: 1,
        language: "python",
        starter_code: 'a = int(input())\nb = int(input())\n# нийлбэрийг хэвлээрэй\n',
        public_test_cases: [
          { input: "3\n4", expected_output: "7" },
          { input: "10\n-2", expected_output: "8" },
        ],
        has_hint: true,
      },
      hidden: [
        { input: "0\n0", expected_output: "0" },
        { input: "99999\n1", expected_output: "100000" },
      ],
      hint: "`print(a + b)` гэж бичихэд л хангалттай — `input()`-оос авсан утгууд аль хэдийн `int` болж хөрвөсөн байгаа.",
    },
    {
      id: "ch-01-binary",
      public: {
        module_id: "module-01",
        type: "coding",
        title: "Аравтаас хоёртод",
        prompt:
          "Стандарт оролтоос **нэг бүхэл тоо** (0 ≤ n ≤ 255) уншиж, түүний **хоёртын дүрсийг** хэвлэ.\n\n`0b` угтвар **байхгүй** байх ёстой.\n\n```text\nОролт:      Гаралт:\n13          1101\n```",
        xp_reward: 20,
        order: 2,
        language: "python",
        starter_code: 'n = int(input())\n# хоёртын дүрсийг хэвлээрэй (0b угтваргүй)\n',
        public_test_cases: [
          { input: "13", expected_output: "1101" },
          { input: "5", expected_output: "101" },
        ],
        has_hint: true,
      },
      hidden: [
        { input: "0", expected_output: "0" },
        { input: "255", expected_output: "11111111" },
      ],
      hint: "`bin(n)` нь `0b1101` гэх мэт мөр буцаана — `[2:]` slice ашиглаж эхний хоёр тэмдэгтийг хаяарай. Хичээлийн «Python-оор шалгах» хэсгийг дахин хараарай.",
    },
    {
      id: "ch-02-cycles",
      public: {
        module_id: "module-02",
        type: "coding",
        title: "CPU-ийн циклийн тоо",
        prompt:
          "CPU-ийн давтамж **гигагерцээр** (бүхэл тоо) өгөгдөнө. Өгөгдсөн **секундийн тоонд** нийт хэдэн цикл гүйцэтгэхийг хэвлэ.\n\nЭхний мөрөнд давтамж (GHz), хоёр дахь мөрөнд секунд өгөгдөнө. 1 GHz = 1 000 000 000 цикл/секунд.\n\n```text\nОролт:      Гаралт:\n3           6000000000\n2\n```",
        xp_reward: 20,
        order: 1,
        language: "python",
        starter_code: 'ghz = int(input())\nseconds = int(input())\n# нийт циклийг хэвлээрэй\n',
        public_test_cases: [
          { input: "3\n2", expected_output: "6000000000" },
          { input: "1\n1", expected_output: "1000000000" },
        ],
        has_hint: true,
      },
      hidden: [
        { input: "4\n10", expected_output: "40000000000" },
        { input: "0\n5", expected_output: "0" },
      ],
      hint: "Нийт цикл = ghz × 1000000000 × seconds. Python-д их тоо асуудалгүй — `print(ghz * 10**9 * seconds)`.",
    },
    {
      id: "ch-03-age",
      public: {
        module_id: "module-03",
        type: "coding",
        title: "Нас тооцоолох",
        prompt:
          "Эхний мөрөнд хэрэглэгчийн **нэр**, хоёр дахь мөрөнд **төрсөн он** өгөгдөнө.\n\n`{нэр}, та {нас} настай.` гэсэн хэлбэрээр хэвлэ. Насыг **2026 оноос** хасаж тооцно.\n\n```text\nОролт:      Гаралт:\nБат         Бат, та 17 настай.\n2009\n```",
        xp_reward: 20,
        order: 1,
        language: "python",
        starter_code: 'name = input()\nyear = int(input())\n# насыг тооцоод хэвлээрэй\n',
        public_test_cases: [
          { input: "Бат\n2009", expected_output: "Бат, та 17 настай." },
          { input: "Сараа\n2010", expected_output: "Сараа, та 16 настай." },
        ],
        has_hint: true,
      },
      hidden: [
        { input: "Тэмүүжин\n2008", expected_output: "Тэмүүжин, та 18 настай." },
      ],
      hint: 'f-string ашиглаарай: `print(f"{name}, та {2026 - year} настай.")` — хичээлийн «Оролт ба гаралт» хэсгийг хараарай.',
    },
    {
      id: "ch-02-mcq-alu",
      public: {
        module_id: "module-02",
        type: "mcq",
        title: "ALU-ийн үүрэг",
        prompt: "CPU доторх **ALU** (Arithmetic Logic Unit) ямар үүрэг гүйцэтгэдэг вэ?",
        xp_reward: 10,
        order: 2,
        options: [
          "Зааврыг тайлж бусад хэсгүүдийг удирдана",
          "Арифметик болон логик үйлдлүүдийг гүйцэтгэнэ",
          "Байнга хэрэглэгддэг өгөгдлийг түр хадгална",
          "Программуудыг удаан хугацаагаар хадгална",
        ],
      },
      private: { correct_answer_index: 1 },
    },
    {
      id: "ch-02-trace-loop",
      public: {
        module_id: "module-02",
        type: "tracing",
        title: "Код мөшгих: давталт",
        prompt:
          "Доорх программ **юу хэвлэхийг** тооцоолж, гаралтыг яг хэвлэгдэх хэлбэрээр нь бичнэ үү:\n\n```python\nx = 5\nfor i in range(3):\n    x = x + i\nprint(x)\n```",
        xp_reward: 15,
        order: 3,
      },
      private: { expected_answer: "8" },
    },
    {
      id: "ch-03-theory-types",
      public: {
        module_id: "module-03",
        type: "theory",
        title: "Өгөгдлийн төрлүүдийг тайлбарлах",
        prompt:
          "Python-ийн `int`, `float`, `str`, `bool` төрлүүдийг **тус бүр жишээтэй** тайлбарлаж бичнэ үү. Хариултаа илгээсний дараа үнэлгээний схемтэй тулгаж өөрийгөө үнэлнэ.",
        xp_reward: 15,
        order: 2,
      },
      private: {
        mark_scheme:
          "Бүрэн хариулт дараах 4 зүйлийг агуулна:\n• int — бүхэл тоо (жишээ: 42, -7)\n• float — бодит/аравтын бутархай тоо (жишээ: 3.14)\n• str — тэмдэгт мөр, хашилтад бичигдэнэ (жишээ: \"Сайн уу\")\n• bool — үнэн/худал хоёрын нэг утга (True эсвэл False)\nТөрөл бүрд зөв жишээ өгсөн байх ёстой.",
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
    console.log("seeded", ch.id);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
