---
theme: default
title: なぜ俺の Array#includes は string を受け取れないのか
info: as const した配列に対する Array#includes に string を渡せない問題を入り口に、TypeScript の issue を掘って言語機能の意思決定について学んだ話。
colorSchema: light
drawings:
  persist: false
transition: slide-left
comark: true
duration: 5min
timer: countdown
---

# なぜ俺の `Array#includes` は<br />`string` を受け取れないのか

2026/06/25 @TSKaigi 2026 事後勉強会

---

# 自己紹介

<div class="flex items-center gap-14 mt-16">
<img src="./icon.png" class="profile-icon" />

<div class="flex-1">

<div class="text-5xl font-bold">Hiroki Watanabe</div>
<div class="text-xl opacity-60 mt-3">株式会社SmartHR / プロダクトエンジニア</div>

<div class="flex items-center mt-4 text-xl leading-none">
  <div class="flex items-center gap-2">
    <div class="i-carbon-logo-github text-2xl"></div>
    <div class="i-carbon-logo-x text-2xl"></div>
    <div class="i-carbon-logo-instagram text-2xl"></div>
  </div>
  <div class="ml-5 profile-handle">@nabeliwo</div>
</div>

<div class="profile-divider"></div>

<div class="profile-list text-xl">

- 普段は TypeScript, Next.js, React などを使っています
- 業務では給与計算周りのプロダクトを作っています
- TSKaigi 2026 では [React のコンポーネント設計とかの話](https://nabeliwo.github.io/slides/talks/20260523_tskaigi-2026_react-props/1)をしました

</div>

</div>
</div>

<style>
.profile-icon {
  width: 18rem;
  height: 18rem;
  border-radius: 9999px;
  border: 6px solid rgba(0, 0, 0, 0.08);
  object-fit: cover;
}
.profile-divider {
  margin: 1.25rem 0;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
.profile-handle {
  background-image: linear-gradient(transparent 60%, rgba(0, 0, 0, 0.12) 60%);
  background-repeat: no-repeat;
  background-size: 100% 100%;
  padding: 0 0.15em;
}
.profile-list ul {
  list-style: none;
  padding-left: 0;
}
.profile-list li {
  position: relative;
  padding-left: 1.25rem;
  margin: 0.5rem 0;
}
.profile-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.7em;
  width: 0.45rem;
  height: 0.45rem;
  background-color: currentColor;
  opacity: 0.7;
}
</style>

<!--
- はい、nabeliwo といいます
-->

---
class: code-center [--slidev-code-font-size:1.6rem]
---

# よくやるやつ

<div class="w-full relative code-swap">
<div v-click.hide="1" class="absolute inset-0 flex flex-col justify-center">

```ts
const validParams = ['hoge', 'fuga', 'piyo'] as const

const isValidParam = (param: string) => {
  return validParams.includes(param)
}
```

</div>
<div v-click="2" class="absolute inset-0 flex flex-col justify-center">

```ts
const validParams = ['hoge', 'fuga', 'piyo']

const isValidParam = (param: string) => {
  return validParams.includes(param) // OK
}
```

</div>
<div v-click="[1, 2]">

```ts twoslash
const validParams = ['hoge', 'fuga', 'piyo'] as const

const isValidParam = (param: string) => {
  return validParams.includes(param)
}
```

</div>
</div>

<!--
- 突然なんですけど、こんなコード、よく書きませんか、って話なんですけど
- 許容する値を as const した配列で固定しておいて、渡された string が含まれてるかを includes で確かめたい、みたいな
- [click:1] ただ実際これは、型チェックが通らなくて、string は 'hoge', 'fuga', 'piyo' のユニオン型に入れられないよと、言うことで
- [click:1] まあ as const を外すと validParams が string の配列になるので通るようにはなるんですけど、as const は後でユニオン型を取り出せて便利なので、できれば残したいです、と
-->

---
class: '[--slidev-code-font-size:2.4rem]'
---

# `Array#includes` の型定義を見てみる

```ts
interface ReadonlyArray<T> {
  includes(
    searchElement: T,
    fromIndex?: number
  ): boolean
}
```

<div class="text-2xl mt-2">

<span class="i-carbon-logo-github inline-block align-middle"></span> [TypeScript/src/lib/es2016.array.include.d.ts at main · microsoft/TypeScript](https://github.com/microsoft/TypeScript/blob/main/src/lib/es2016.array.include.d.ts#L10-L17)

</div>

<!--
- で、どうして as const があるとだめなのかを、Array#includes の型定義を見て、確認してみます。
- 第一引数の searchElement が T なので、as const すると 'hoge', 'fuga', 'piyo' 以外渡せなくなるっていうのがわかります
- まあそうでしょうね、という感じなんですけど、言うてやっぱり string を渡せるようにはしたいんですよね。どんな文字列が来るかわからないときとかがあるので
- ということで、解決策を考えてみると
-->

---
class: '[--slidev-code-font-size:1.5rem]'
---

# よく見る解決策

```ts
const arrayIncludes = <T extends U, U>(
  values: readonly T[],
  value: U,
): value is T => {
  // ここの value as T は extends で制限されているから大丈夫
  return values.includes(value as T)
}

const validParams = ['hoge', 'fuga', 'piyo'] as const

arrayIncludes(validParams, 'aaa') // 型チェックが通る
arrayIncludes(validParams, 123) // 型チェックが通らない
```

<!--
- こういう arrayIncludes みたいな関数を作ったりします
- ジェネリクスの extends の部分で、配列の要素型 T が value の型 U の下位型である、というのを表現してます
- "hoge", "fuga", "piyo" のユニオン型に対して、上位型の string は渡せるけど number は渡せない、みたいな感じです
- これで一旦やりたいこと自体はできるようになったんですけど
-->

---
class: code-center
---

# 理想は TypeScript 側で解決してほしい

<div class="text-2xl">

- 実はこの問題は何年も前から繰り返し話題に上がるトピック
  - <span class="i-carbon-logo-github inline-block align-middle"></span> [`Array.includes` type is too narrow · Issue #26255](https://github.com/microsoft/TypeScript/issues/26255)
- 現在の TypeScript で解決されていない理由として2つの言語機能の不足がある
  - <span class="i-carbon-logo-github inline-block align-middle"></span> [Enable type parameter lower-bound syntax · Issue #14520](https://github.com/microsoft/TypeScript/issues/14520)
  - <span class="i-carbon-logo-github inline-block align-middle"></span> [Suggestion: one-sided or fine-grained type guards · Issue #15048](https://github.com/microsoft/TypeScript/issues/15048)

</div>

<!--
- 理想は TypeScript 側で解決してほしいなと思っていて
- 実はこのトピックはもう何年も前から幾度となく話題にあがるテーマで、じゃあなんでずっと変わってないのか、というと
- まず前提となる2つの言語機能が不足している、というのがあります
- その2つを説明していきます
-->

---
class: '[--slidev-code-font-size:2rem]'
---

# 引数側の課題 — lower-bound syntax

```ts
// 提案構文: super で下限境界を表す
interface ReadonlyArray<T> {
  includes<U super T>(
    searchElement: U,
    fromIndex?: number
  ): searchElement is T
}
```

<div class="text-2xl mt-2">

<span class="i-carbon-logo-github inline-block align-middle"></span> [Enable type parameter lower-bound syntax · Issue #14520](https://github.com/microsoft/TypeScript/issues/14520)

</div>

<!--
- 1つ目は引数側の課題で lower-bound syntax というもので、extends の対称としての super みたいなのが TypeScript にあったらいいよね、という議論です
- super があれば、U が T の上位型なら受け取れますよ、という制限をかけられます
- さっき見せた現状の解決策の arrayIncludes 関数の T extends U と U っていうジェネリクスは、引数を2つ取ることでこの super を擬似的に表現してたんですけど、この構文があれば、Array の includes 自身の型定義としてそのまま書けるようになります
-->

---
class: '[--slidev-code-font-size:1.3rem]'
---

# 戻り値側の課題 — 片側型ガード

<div class="mt-10 mb-6">

## 型ガードが上手くいかないこともある

</div>

```ts
// 型としては 'piyo' を含むが、実体には 'piyo' が入ってない配列
const validParams: ('hoge' | 'fuga' | 'piyo')[] = ['hoge', 'fuga']
declare const param: 'hoge' | 'fuga' | 'piyo'

if (arrayIncludes(validParams, param)) {
  console.log(param) // param: "hoge" | "fuga" | "piyo"
} else {
  console.log(param) // param: never - 実際は 'piyo' の可能性もある
}
```

<!--
- もう1つの課題が片側型ガードというもので、
- このコードの例では、else 側の param の型が never になっちゃうんですけど、実際には 'piyo' という文字列が入る可能性が残っていて、
- つまり、false 側まで型を絞るのが正しくないケースもあるってことで
-->

---
class: code-center [--slidev-code-font-size:1.8rem]
---

# 戻り値側の課題 — 片側型ガード

<div class="mt-10 mb-6">

## 解決策

</div>

```ts
// 提案構文: as で true 側だけ絞る
function arrayIncludes<T extends U, U>(
  values: readonly T[],
  value: U,
): value as T
```

<div class="text-2xl mt-2">

<span class="i-carbon-logo-github inline-block align-middle"></span> [Suggestion: one-sided or fine-grained type guards · Issue #15048](https://github.com/microsoft/TypeScript/issues/15048)

</div>

<!--
- この issue の中で出てくる案の1つが、is ではなく as と書くと、true 側だけ絞って false 側は元の型のまま、ということができるっていう構文です。
- as const した固定の配列だけじゃなく、通常の可変な配列も扱う必要があると考えると、arrayIncludes が false を返しても「型が違う」とは言い切れないので、こういう片側の絞り込みがあると嬉しい、という話です。
-->

---
class: code-center [--slidev-code-font-size:2rem]
---

# 理想の `Array#includes` の型定義

```ts
interface ReadonlyArray<T> {
  includes<U super T>(
    searchElement: U,
    fromIndex?: number
  ): searchElement as T
}
```

<!--
- この2つの課題が解決された場合、理想の Array の includes の型はこんな感じにできるのかなと思います。
- super によって searchElement は配列の要素型の上位型なら受け取れて、戻り値は true 側だけ T に絞ると。
- こうなると、さっき実装を見せた arrayIncludes みたいなヘルパー関数が不要になってとても嬉しいなと思います。
-->

---
class: code-center
---

# おわりに

<div class="text-2xl">

- `Array#includes` の型定義がどうしてこうなってるんだという疑問から issue を漁ったら何年も続いている面白い議論がたくさんあった
- 静的型付け言語を TypeScript しか知らない自分には新しい発見が多かった
- 提案されている構文の実現はとても難しそうだけれど、ウォッチしていきたい

</div>

<!--
- はい、ということで、その構文が実現されるのかはわからないんですが、この LT のまとめです。
- 最初は組み込みの型が使いづらいなと思って調べたってだけなんですけど、issue を漁っているうちに面白い議論がたくさん見つかって、静的型付け言語を TS しか知らない自分には新しい発見が多かったですと。
- 個人的にあんまり TS の issue を追う習慣がなかったんですけど、そこには学びがたくさんあるということがわかったので、今後もやっていこうかなと思いました。以上です。
-->

---
layout: center
---

<div class="text-8xl">完</div>

<!--
ありがとうございました
-->