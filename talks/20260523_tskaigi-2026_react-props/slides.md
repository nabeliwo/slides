---
theme: default
title: props は値の集合ではない — UI の状態を宣言する React コンポーネント設計
info: React コンポーネントの props 設計は、UI の状態や責務をどれだけ明確に表現できるかに大きく影響します。しかし実務では、data や isLoading、error といった複数の値の組み合わせによって状態を表現することが多く、コンポーネントが取りうる状態や振る舞いが props から直感的に読み取れないケースも少なくありません。本セッションでは、props 設計を見直すことでコンポーネントの分かりやすさを高めていくための考え方を紹介します。その一例として、discriminated union を用いて props を「値の集合」ではなく「状態そのもの」として表現する設計を取り上げ、条件分岐を減らし、不正な状態を型レベルで防ぐアプローチを解説します。さらに、コンポーネント分割との関係にも触れながら、props 設計によって UI の構造や責務をどのように表現すると良いのか、その判断軸を整理します。本セッションを通して、参加者が自分のコンポーネントの props 設計を振り返り、「その設計が UI の状態や責務を適切に表現できているか」を判断できるようになることを目指します。
colorSchema: light
drawings:
  persist: false
transition: slide-left
comark: true
duration: 10min
timer: countdown
---

# props は値の集合ではない<br /><span class="text-4xl">— UI の状態を宣言する React コンポーネント設計 —</span>

2026/05/23 @TSKaigi 2026

---

# 自己紹介

<div class="flex items-center gap-12">
<div class="flex-1 text-2xl">

- Hiroki Watanabe / @nabeliwo
- 株式会社 SmartHR のプロダクトエンジニア
- 普段は TypeScript, Next.js を書いている

</div>
<img src="./icon.png" class="w-80 rounded-full" />
</div>

<!--
- nabeliwo といいます
- 株式会社 SmartHR というところで、TypeScript や Next.js を使ってアプリケーションを作っています
- ということで本日は型の話を起点にして、React コンポーネントのインターフェースや設計をより良いものにするための考え方、みたいな話をしたいと思います
-->

---

# お題：この props を見て思うこと

<div class="flex-1 flex items-center">
<div class="w-full">

```ts
type Props = {
  data?: User[]
  loading?: boolean
  error?: Error
}
```

</div>
</div>

<style>
.slidev-layout {
  display: flex;
  flex-direction: column;
}
:deep(.slidev-code) {
  --slidev-code-font-size: 2.8rem;
}
</style>

<!--
- 突然ですが、これは React コンポーネントの props の型定義なんですが、これどう思いますか？
- 少し思いを巡らせていただいて…
- はい、まあデータフェッチを親コンポーネントでしていて、そのデータを渡してるんだろうなって感じがします
- 全部 optional になっているのが気になりますが、データフェッチの状態管理であればわからなくはないというか、見たことはあるって気がします
-->

---

# こんな感じで使われそう

<div class="flex-1 flex items-center">
<div class="w-full">

```tsx
const { data, loading, error } = useUsers()

return (
  <UserList
    data={data}
    loading={loading}
    error={error}
  />
)
```

</div>
</div>

<style>
.slidev-layout {
  display: flex;
  flex-direction: column;
}
:deep(.slidev-code) {
  --slidev-code-font-size: 1.8rem;
}
</style>

<!--
- そんな型のコンポーネントの使われ方を想像してみると、こんな感じになりそうです
- カスタムフックの中でデータフェッチをしたものを返して、それをそのまま UserList コンポーネントに渡すようなイメージです
-->

---
clickAnimation: up
---

# 実際はありえないデータを渡してみる

```tsx
<UserList
  data={users}
  loading={true}
  error={error}
/>
```

<div class="text-2xl">
<v-clicks>

- 💥 ありえない状態とは
  - データを取得できた & データを取得中 & データ取得でエラーが発生した
- 😈 おかしな話だが、型チェックは通ってしまう
- 💭 結局これは何が表示されるのかわからない

</v-clicks>
</div>

<style>
:deep(.slidev-code) {
  --slidev-code-font-size: 1.8rem;
}
</style>

<!--
- じゃあここで、その UserList コンポーネントに、そんな状態ないだろっていうデータをあえて渡してみます
- [click:1] ありえない状態というのは、データを取得できた かつ データを取得中 かつ データ取得でエラーが発生した、と仮定します
- [click:1] おかしな話ですが、型チェックは通りますね。型定義に違反していないので
- [click:1] で、さらにこのデータを渡した場合、UserList は何を返すんだろうっていうのを考えてみると、まったく見えてこないなと、思うわけです
-->

---

# コンポーネント実装を見てみる

<div class="flex-1 flex items-center">
<div class="w-full">

```tsx {all|2|4|6-12|all}
const UserList = (props: Props) => {
  if (props.loading) return <Spinner />

  if (props.error) return <ErrorMessage error={props.error} />

  // loading でも error でもなければ data の値を描画
  // ここまできたら data は存在してそうだがオプショナルチェーンをせざるを得ない
  return props.data?.map((item) => (
    <div key={item.id}>
      {/* 省略 */}
    </div>
  ))
}
```

</div>
</div>

<style>
.slidev-layout {
  display: flex;
  flex-direction: column;
}
:deep(.slidev-code) {
  --slidev-code-font-size: 1.3rem;
}
</style>

<!--
- ということで、コンポーネントの中身を見てみますと
- [click:1] まず loading の制御があって
- [click:1] 次に error の判定があって
- [click:1] 最後に data を表示する、という感じになっていました
- data は optional なので、他の props の状態とは関係がなく常に存在チェックが必要になっちゃってるっていう微妙なところもあります
- [click:1] そして見てわかる通り、UserList の UI の表示パターンはこの3パターンを期待しているんですよね
-->

---
clickAnimation: up
---

# ここまでで見えてきた課題

<div class="text-3xl">
<v-clicks>

- 💔 props がコンポーネントの期待する値の組み合わせを表現できていない
- 😈 ありえない状態が型チェックを通ってしまう
- 🛡️ コンポーネント側も本来不要な防御的なコードが増えている

</v-clicks>
</div>

<div class="text-4xl mt-10">
<div v-click>

➡️ UI の状態を宣言できていない

</div>
</div>

<!--
- ここまでの話で見えてきた課題をまとめると
- [click:1] まず、props がコンポーネントの期待する値の組み合わせを表現できていないです
- [click:1] そして、ありえない状態を渡しても型チェックを通ってしまいます
- [click:1] そして、コンポーネント側も本来不要な防御的なコードが増えています
- [click:1] これをまとめると、props が UI の状態を宣言できていない、と言えるかなと思います
-->

---
layout: center
---

<div class="text-center">
<p class="text-5xl font-bold mt-4" style="line-height:1.5;">
  props で UI の状態を宣言しよう
</p>
</div>

<!--
- ということで、今日一つ言いたいことは、props で UI の状態を宣言しましょう、ということです
- ここから改善フェーズに入っていきます
-->

---

# [discriminated union](https://typescriptbook.jp/reference/values-types-variables/discriminated-union) で意図を明確にする

<div class="flex-1 flex items-center">
<div class="w-full">

```tsx
type Props =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "success"; data: User[] }
```

</div>
</div>

<style>
.slidev-layout {
  display: flex;
  flex-direction: column;
}
:deep(.slidev-code) {
  --slidev-code-font-size: 2.2rem;
}
</style>

<!--
- まずこういう場合は、discriminated union を使うことで意図を明確にできます
- 判別可能なユニオン型と呼ばれますが、型を判別するためのプロパティを持ったユニオン型のことで、この例だと status がそれに当たります
- status の値を判定することで、型の絞り込みができるようになるわけです
-->

---
clickAnimation: up
---

# ありえない状態がなくなる

<div class="flex-1 flex items-center">
<div class="w-full">

```tsx
<UserList status="loading" />
<UserList status="error" error={error} />
<UserList status="success" data={users} />
```

<div v-click class="mt-8">

```tsx
if (props.status === "success") {
  // オプショナルチェーンが消えた！
  return props.data.map((item) => (/* 省略 */))
}
```

</div>

</div>
</div>

<style>
.slidev-layout {
  display: flex;
  flex-direction: column;
}
:deep(.slidev-code) {
  --slidev-code-font-size: 1.9rem;
}
</style>

<!--
- この型を使った UserList の呼ばれ方を見てみると、この3パターンの値の渡し方以外は型チェックが通らなくなり、不正な状態を props の型レベルで防いでいます
- [click:1] さらに UserList の中の実装も、success の場合は型レベルで data が存在することが保証されるので、オプショナルチェーンが不要になるっていう良い影響があります
-->

---
layout: center
---

<div class="text-center">
<p class="text-3xl opacity-70">props で UI の状態を宣言することで</p>
<p class="text-4xl font-bold mt-4" style="line-height:1.5;">
  コンポーネント使用者には用途が明確になり<br />コンポーネント実装者は不要なコードが減る
</p>
</div>

<!--
- コンポーネント使用者には用途が明確になり、コンポーネント実装者は不要な防御的コードが減ります
- ということで、props とその型定義で、UI の状態を宣言できているかっていうのを意識すると、React コンポーネントのインターフェースはより良いものにできるんじゃないかと思います
- と、これで終わりかと思いきや、もう少し現実世界に沿った話をしようかなと思います
-->

---

# 現実

````md magic-move
```ts
type Props = {
  data?: User[]
  loading?: boolean
  error?: Error
}
```

```ts
type Props = {
  data?: User[]
  loading?: boolean
  error?: Error
  refetching?: boolean
  refetchError?: Error
}
```
````

<style>

:deep(.slidev-code) {
  --slidev-code-font-size: 2.4rem;
  --slidev-code-line-height: 1.5;
}
</style>

<!--
- 最初に出した例に戻ってきまして、実際はもう少し複雑になることも多いです
- [click:1] 例えばこんな感じに、データの再取得というパターンが出てきます
- 初回取得と再取得では見せたい UI が基本的に違うので、フラグも分けがちです
-->

---

# discriminated union で頑張る？？

<div class="flex-1 flex items-center">
<div class="w-full relative">

```ts
type Props =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "success"; data: User[] }
  | { status: "refetching"; data: User[] }
  | {
      status: "refetchError";
      data: User[];
      error: Error
    }
```

<div
  v-click.fade-in.scale
  class="absolute right-10 bottom-10 text-9xl font-bold"
>
  🤔
</div>

</div>
</div>

<style>
.slidev-layout {
  display: flex;
  flex-direction: column;
}
:deep(.slidev-code) {
  --slidev-code-font-size: 1.7rem;
}
</style>

<!--
- ということで、先程の学びを活かして、UI の状態を考えて props の意図を明確にしてみます
- [click:1] はい、これはなんかきつくなってきた気がしますね
- まあ無理ではないと思いますが、すべての状態を1つのコンポーネントで表現しようとすると、コンポーネントの責務が大きくなりすぎるかなと思います
-->

---
layout: center
---

<div class="text-center">
<p class="text-4xl font-bold mt-4" style="line-height:1.5;">
  コンポーネントの責務を分離して<br />JSX の構造で UI の状態を表現する
</p>
</div>

<!--
- ということで、次に考えるのが、コンポーネントの責務の分離と、JSX の構造で UI の状態を表現する、ということです
-->

---
clickAnimation: up
---

# 責務の整理 (+ 再取得処理を追加)

<div class="grid grid-cols-2 gap-8 mt-5">
<div class="border rounded-xl px-5 py-4 text-xl leading-relaxed relative">

<div class="absolute top-3 right-3 text-xl font-bold border rounded px-3 py-1 opacity-70">Before</div>

**親**

- データフェッチして値を全て UserList に渡す

<div class="my-4 border-t opacity-40"></div>

**UserList**

- 渡された値を見て UI の出し分け

</div>

<div v-click class="border rounded-xl px-5 py-4 text-xl leading-relaxed border-blue-400 relative">

<div class="absolute top-3 right-3 text-xl font-bold border border-blue-400 rounded px-3 py-1 text-blue-500">After</div>

**親**

- 初期表示の管理

<div class="my-4 border-t opacity-40"></div>

**UserList**

- データフェッチ
- データ取得後の世界
  - 一覧の表示
  - 再取得中・再取得エラーの表示

</div>
</div>

<style>
.slidev-layout {
  display: flex;
  flex-direction: column;
}
</style>

<!--
- それを実現するために、責務をどう分離するかを整理します
- 元々は親はデータフェッチして取得した値全部を UserList に渡して、UserList はデータフェッチ以外のすべての役割を受け持っていました。さらに再取得の出し分けも受け持つようになるとなかなか大変です
- [click:1] そして変更後ですが、UserList は自身でデータを取得し、データ取得後の UI の管理のみに責務を持つように、してみようかなと思います。そして UserList が手放した、データがまだないときの UI の管理を親に受け持ってもらうようにします
-->

---

# UserList コンポーネントの実装

<div class="flex-1 flex items-center">
<div class="w-full">

```tsx {all|1-2|5-11|all}
// 初回 loading / error は親に委ねる前提のカスタムフック
const { data, refetching, refetchError, refetch } = useUsers()

return (
  <>
    <div className={refetching ? 'opacity-50' : ''}>
      {data.map((user) => (/* 省略 */))}
    </div>
    {refetchError && <ErrorMessage />}
    <button onClick={refetch}>再取得</button>
  </>
)
```

</div>
</div>

<style>
.slidev-layout {
  display: flex;
  flex-direction: column;
}
:deep(.slidev-code) {
  --slidev-code-font-size: 1.4rem;
}
</style>

<!--
- UserList コンポーネントの実装を見ていきます
- [click:1] まず、詳しくは後で話しますが、useUsers の実装を変えていて、初回 loading / 初回 error はもうここで管理せず、data は常に存在する状態にしてます。そして再取得まわりの状態と refetch 関数を返すようになってます
- [click:1] ということで data は必ず存在するので、そのまま一覧を表示できます。再取得中や再取得エラーや再取得のトリガーの表現方法は色々あると思いますが、ここではとてもシンプルな表現にしています
- [click:1] 改めて全体を見ると、UserList は自身でデータを取得して、取得が成功した後の UI の状態を表現することに専念しています
-->

---
clickAnimation: up
---

# useUsers の内部実装の変更

<div class="flex-1 flex items-center">
<div class="w-full text-3xl">

- データがあることを前提とするカスタムフック
  - ex. TanStack Query の useSuspenseQuery など
- データがない状態では
  - フェッチ中は **Promise を throw**
  - 失敗時は **Error を throw**

<v-click>

<div class="text-3xl mt-10" style="line-height: 1.5;">
➡️ UserList の中身に到達した時点でデータは必ず存在する
</div>

</v-click>

</div>
</div>

<style>
.slidev-layout {
  display: flex;
  flex-direction: column;
}
</style>

<!--
- ここで、なぜ UserList の中ではデータが必ず存在する前提にできるのかを補足します
- これは例えば TanStack Query であれば useSuspenseQuery という hooks で実装されているパターンで、最近のデータフェッチライブラリではよく見られるものです
- データがないときは Promise や Error を throw するので
- [click:1] UserList の JSX を返す時点では、throw を通り抜けたあとの世界にいるので、データは必ず存在する、という前提が成立します
-->

---
clickAnimation: up
---

# JSX の構造で UI の状態を表現する

```tsx {all|1,5|2,4|3|all}
<ErrorBoundary fallback={<ErrorMessage />}>
  <Suspense fallback={<Spinner />}>
    <UserList />
  </Suspense>
</ErrorBoundary>
```

<div class="grid grid-cols-3 gap-6 text-center mt-6">
<div v-click="1" class="border rounded-xl px-4 py-4">
<div class="font-mono text-2xl text-blue-600">ErrorBoundary</div>
<div class="text-lg mt-2 opacity-80">データ取得失敗</div>
</div>
<div v-click="2" class="border rounded-xl px-4 py-4">
<div class="font-mono text-2xl text-blue-600">Suspense</div>
<div class="text-lg mt-2 opacity-80">データ取得中</div>
</div>
<div v-click="3" class="border rounded-xl px-4 py-4">
<div class="font-mono text-2xl text-blue-600">UserList</div>
<div class="text-lg mt-2 opacity-80">データ取得後</div>
</div>
</div>

<style>
:deep(.slidev-code) {
  --slidev-code-font-size: 1.75rem;
  --slidev-code-line-height: 1.4;
}
</style>

<!--
- では親側はどうなるのかというと、UserList を React の Suspense と ErrorBoundary で囲むだけのシンプルな構造です
- Suspense は内側の Promise を待っている間、ErrorBoundary は内側で発生した Error をキャッチしたときに、それぞれ fallback に切り替える、という機能を持ちます。その結果として、
- [click:1] ErrorBoundary が「データ取得失敗の状態」を表現して、
- [click:1] Suspense が「データ取得中の状態」を表現して、
- [click:1] UserList が「データ取得後の状態」を表現します。UI の各状態がそのまま JSX のネスト構造に対応していることがわかります
- [click:1] 条件分岐ではなく、構造そのものとして UI の状態を表現できていると言えます。そして、初回 loading と初回 error の UI は UserList の外で表現できていて、UserList の中は取得後の世界だけに専念できています
-->

---
clickAnimation: up
---

# まとめ

<div class="flex-1 flex items-center">
<div class="w-full">

<div class="text-4xl">
<v-clicks>

- props の型で UI の状態を宣言する
- コンポーネントの境界を作って UI の状態を JSX の構造として表現する

</v-clicks>
</div>

</div>
</div>

<style>
.slidev-layout {
  display: flex;
  flex-direction: column;
}
</style>

<!--
- ということで、最後まとめです
- [click:1] props の型で UI の状態を宣言する
- [click:1] コンポーネントの境界を作って UI の状態を JSX の構造として表現する
- という2つの観点について話しました。その props は単なる値の集合になっていないか、UI の状態を表せているか、という観点を持つと、React コンポーネントのインターフェースをより良いものにできるんじゃないかなと思います
-->

---
layout: center
---

# 💡 TSKaigi 2026事後勉強会やります！

<img src="./jigo.png" />

<div class="text-2xl">

- 2026/06/25(木) 19:00 〜 21:30
- @株式会社 SmartHR 六本木オフィス
- 登壇者も参加者も募集中です！
- 詳しくは connpass で SmartHR を検索してね！

</div>

<!--
- (いけたら) そして最後に宣伝です。SmartHR、TSKaigi 2026 事後勉強会をやります！
- 以上で発表を終わります。ありがとうございました
-->
