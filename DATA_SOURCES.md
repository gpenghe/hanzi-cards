# Character collections

## Basic 500

`src/data/basic500.ts` contains 500 hand-curated, unique simplified Chinese
characters, loosely grouped from basic concepts to everyday vocabulary. It is
an independent starter collection, not an official frequency ranking, HSK
syllabus, or a claim about what a child has learned. No third-party dataset was
copied to create it.

## 暨南《中文》

The family confirmed that 三年级 means **第三册**, not 第五、六册.

- **Up to 二年级**: the union of 第一册 and 第二册 — **275 characters**.
- **Up to 三年级**: the union of 第一册, 第二册, and 第三册 — **429 characters**.

Source checked on 2026-10-24:
[Jinan University Press, 《中文》配套生字库](https://www.jnupress.com/Coo/Chineseword).
Its public book selector reads `/Coo/BindKeywordList` with `Page`, `Size`, and
`bookCount`. Each volume returned one complete page using `Page=1&Size=500`.

| Book | Source rows | Distinct characters |
| --- | ---: | ---: |
| 第一册 | 133 | 133 |
| 第二册 | 146 | 143 |
| 第三册 | 159 | 158 |

Lesson cross-check: the same publisher lookup with `bookCount=3` and
`bookLesson=3` returns `医院病针烧感冒护士带量温药就`. The requested
characters 医、院、感、冒、带、病、护、士 are all in that lesson and in
第三册, and none occur in either 第一册 or 第二册. A regression test
checks their membership in both cumulative sets.

A character can occur more than once (for example, 种 and 长 in 第二册).
The game deduplicates within each volume and again across cumulative sets;
repeated vocabulary does not make a character appear more often. Sequential
play follows first appearance in the publisher's list.

`src/data/jinan.ts` records only the factual character membership of each
volume. It does not contain textbook passages, illustrations, translations,
pronunciation recordings, teaching notes, or the publisher's site code.
The publisher does not state an open-data license on this resource; no license
or permission to redistribute the textbooks or their media is claimed here.
Textbook and publisher names identify compatibility, not endorsement.

The publisher's database does not label an edition. These sets match that
published database, which may differ from a revised printing or a school's
lesson selection. Check the learner's book's 生字表 if its edition differs; update the
volume index and counts together. Do not substitute generic grade-level lists
and label them as textbook-exact.

## Adding a set

1. Put its characters in a new file under `src/data/`.
2. Register a unique, stable ID, name, description, and character array in
   `src/data/sets.ts`. The settings selector is generated from this registry.
3. Use individual characters, not words. Cumulative sets should use a Set to
   remove duplicates. Keep textbook volume boundaries in separate lists.
4. Record the source, edition, and any applicable licensing/attribution here.
5. Run `npm test` and `npm run build`. The generic tests validate every set.

All collections are bundled in JavaScript and precached; the running app
never requests a dictionary or textbook API.
