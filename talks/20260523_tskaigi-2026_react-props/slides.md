---
theme: default
title: props は値の集合ではない — UI の状態を宣言する React コンポーネント設計
info: React コンポーネントの props 設計は、UI の状態や責務をどれだけ明確に表現できるかに大きく影響します。本スライドでは、data や loading、error といった値の組み合わせから始めて、props の型で UI の状態を宣言する考え方を紹介します。そのうえで、現実の UI 状態が複雑になったときに、すべてを props や union 型に詰め込むのではなく、コンポーネントの責務を分け、Suspense や ErrorBoundary のような React の境界に状態表現を委ねる設計について考えます。
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
- 少し思いを巡らせていただいて…、型や React に習熟している方はここからどんな話が展開されるかを想像してもらって…
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
- その型定義の props を使ったコンポーネントの使われ方を想像してみると、こんな感じになりそうです
- useUsers というまあ変な名前のカスタムフックですが、その中で useState や useEffect や fetch などで雑にデータフェッチをしたものを返して、それをそのまま UserList コンポーネントに渡すようなイメージです
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

```tsx {all|2|4|6-12}
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
-->

---

# 期待する状態のパターン

<div class="flex-1 flex items-center">
<div class="w-full">

```tsx
<UserList data={users} />   // データを取得できた
<UserList loading={true} /> // データを取得中
<UserList error={error} />  // データ取得に失敗した
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
- UserList コンポーネントが期待する props の受け取り方を考えてみると、単純に考えるなら、この3パターン以外はありえないので受け取りたくないはずですよね
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

# ありえない状態がなくなる

<div class="flex-1 flex items-center">
<div class="w-full">

```tsx {all|1|2|3|all}
<UserList status="loading" />
<UserList status="error" error={error} />
<UserList status="success" data={users} />
```

</div>
</div>

<style>
.slidev-layout {
  display: flex;
  flex-direction: column;
}
:deep(.slidev-code) {
  --slidev-code-font-size: 2rem;
}
</style>

<!--
- discriminated union を使った型の props を持つ UserList の呼ばれ方を見てみます
- [click:1] status に loading を渡すとそれ以外の props を渡せなくなり
- [click:1] status に error を渡すと error props が必須になり data props は渡せなくなります
- [click:1] status に success を渡すと data props が必須になり error props は渡せなくなります
- [click:1] この3パターン以外、型チェックが通らなくなり、不正な状態を props の型レベルで防いでいます
-->

---

# コンポーネント実装を見てみる

<div class="flex-1 flex items-center">
<div class="w-full">

```tsx {all|3-7|9-16}
const UserList = (props: Props) => {
  switch (props.status) {
    case "loading":
      return <Spinner />

    case "error":
      return <ErrorMessage error={props.error} />

    case "success": {
      // オプショナルチェーンが不要になった
      return props.data.map((item) => (/* 省略 */))
    }
  }
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
- さらに、コンポーネントの中の実装がどう変わるかを見てみます
- if 文から switch 文に変えていますが、そこはあまり本質ではないので気にしないでいただいて
- [click:1] loading と error のときは特に変化はないのですが
- [click:1] success の場合、型レベルで data が存在することが保証されるので、オプショナルチェーンが不要になりました
- ということで、コンポーネントの中にも良い影響があることがわかります
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
- props で UI の状態を宣言することで、コンポーネント使用者には用途が明確になり、コンポーネント実装者は不要な防御的コードが減ります
- ということで、discriminated union は一つの例ですが、props とその型定義で、UI の状態を宣言できているかっていうのを意識すると、React コンポーネントのインターフェースはより良いものにできるんじゃないかと思います
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
  --slidev-code-font-size: 2.6rem;
  --slidev-code-line-height: 1.5;
}
</style>

<!--
- 最初に出した例に戻ってきまして、実際はもう少し複雑になることも多いです
- [click:1] 例えばこんな感じに、データの再取得というパターンが出てきます
- なぜ loading / error と refetching / refetchError を分けているかというと、初回と再取得では見せたい UI が違うからですね
- 初回はまだ表示できるデータがないので全体をローディングやエラーにしたいですが、再取得時はすでにあるデータを非表示にせずに再取得や「更新失敗」を見せたかったりします
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
  --slidev-code-font-size: 1.8rem;
}
</style>

<!--
- ということで、先程の学びを活かして、UI の状態を考えて props の意図を明確にしてみます
- [click:1] はい、これはなんかきつくなってきた気がしますね
- 型の工夫だけで解決できることままあるのですが、今回の場合はこれはこれで大変だなって気がします
- すべての状態を1つのコンポーネントで表現しようとすると、コンポーネントの責務が大きくなりすぎるかなと思います
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
- 今まで話してきたことは props で表現できる範囲の工夫の話であって、全ての状態を1つの props の型に詰め込むべき、ということをではないんですよね
- ということで、次に考えるのが、コンポーネントの責務の分離と、JSX の構造で UI の状態を表現する、ということです
-->

---
clickAnimation: up
---

# 責務の整理 (+ 再取得処理を追加)

<div class="grid grid-cols-2 gap-8 mt-6">
<div class="border rounded-xl p-5 text-xl leading-relaxed relative">

<div class="absolute top-3 right-3 text-sm border rounded px-2 py-0.5 opacity-70">Before</div>

**親**

- データフェッチして値を全て UserList に渡す

<div class="my-4 border-t opacity-40"></div>

**UserList**

- 渡された値を見て UI の出し分け

</div>

<div v-click class="border rounded-xl p-5 text-xl leading-relaxed border-blue-400 relative">

<div class="absolute top-3 right-3 text-sm border border-blue-400 rounded px-2 py-0.5 text-blue-500">After</div>

**親**

- データの有無で UI の出し分け
  - 無: ローディングやエラー画面
  - 有: UserList を描画

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
- [click:1] そして変更後ですが、UserList は自身でデータを取得し、データ取得後の UI の管理のみに責務を持つようにしてみます。そして UserList が手放した、データがまだないときの UI の管理を親に受け持ってもらうようにします
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
- [click:1] まず、詳しくは後で話しますが、useUsers の実装を変えていて、初回 loading / 初回 error はもうここで管理せず、data は常に存在する状態にしてます。そして再取得まわりの状態と関数を返すようになってます
- [click:1] ということで data は必ず存在するので、そのまま一覧を表示できます。再取得中や再取得エラーや再取得のトリガーの表現方法は色々あると思いますが、ここではとてもシンプルな表現にしています
- [click:1] 改めて全体を見ると、UserList は自身でデータを取得して、取得が成功した後の UI の状態を表現することに専念しています
-->

---
clickAnimation: up
---

# データがあることを前提とするカスタムフック

<div class="flex-1 flex items-center">
<div class="w-full text-3xl">

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
- ポイントは、useUsers の中でデータがない状態を throw で表現していることです
- これは例えば TanStack Query であれば useSuspenseQuery という hooks で実装されているパターンで、最近のデータフェッチライブラリではよく見られるものです
- 中身をもう少し詳しく話すと、初期データがない状態では、取得中は Promise を throw し、失敗時は Error を throw します。一方で、一度データが取れたあとは、そのデータを保持したまま、再取得中や再取得失敗の状態を別の値として返してくれる、という挙動になっています
- [click:1] つまり、UserList の JSX を返す時点では、throw を通り抜けたあとの世界にいるので、データは必ず存在する、という前提が成立します。これは型レベルでも同じで、data は optional ではなくなります
-->

---

# 親側で throw を受け止める

<div class="flex-1 flex items-center">
<div class="w-full">

```tsx
const Page = () => (
  <ErrorBoundary fallback={<ErrorMessage />}>
    <Suspense fallback={<Spinner />}>
      <UserList />
    </Suspense>
  </ErrorBoundary>
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
- では、親側はどう書くのかを見ていきます。UserList を直接囲むだけのシンプルな構造です
- ここで登場するのが Suspense と ErrorBoundary という 2 つの仕組みです
- どちらも子要素の状況に応じて fallback を表示するためのもので、Suspense は子の Promise を待っている間、ErrorBoundary は子で発生した Error をキャッチした時に、それぞれ fallback に切り替わります
- ちなみに ErrorBoundary は React の公式 API ではなくパターンとして存在するもので、react-error-boundary のようなライブラリで実装されます
- 今回の例だと、Suspense が初回 loading の Promise を、ErrorBoundary が初回 error をキャッチして、それぞれの fallback を表示します
- これだけで、初回 loading と初回 error は UserList の外で表現できます
-->

---

# JSX の構造で UI の状態を表現する

<div class="flex-1 flex items-center">
<div class="w-full">

```tsx
<ErrorBoundary fallback={<ErrorMessage />}>
  <Suspense fallback={<Spinner />}>
    <UserList />
  </Suspense>
</ErrorBoundary>
```

<div class="text-2xl mt-8" style="line-height: 1.8;">

- `ErrorBoundary` = データ取得失敗の状態
- `Suspense` = データ取得中の状態
- `UserList` = データ取得後の状態

</div>

<div class="text-3xl mt-8">

➡️ 状態の進行が JSX のネスト構造に現れる

</div>

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
- ここで、先ほど言及した「JSX の構造で UI の状態を表現する」という話なのですが、UI の各状態がそのまま JSX のネスト構造に対応していることがわかります。
- 一番外側の ErrorBoundary は「データ取得失敗の状態」、Suspense は「データ取得中の状態」、内側の UserList は「データ取得後の状態」という感じです。
- 条件分岐ではなく、JSX の構造そのものとして UI の状態が表現できているわけです。
- 最初に discriminated union で型を使って UI の状態を表現したのと同じように、ここでは React の構造で UI の状態を表現している、というのがポイントです
-->

---
clickAnimation: up
---

# props は値の集合ではない

<div class="text-xl opacity-70 -mt-2">
UI の状態を宣言する React コンポーネント設計
</div>

<div class="flex-1 flex items-center">
<div class="w-full">

<div class="text-4xl">
<v-clicks>

- UI として意味の違う状態を区別する
- コンポーネントが責任を持つ状態だけを props にする
- React の境界を使って UI 状態を構造として表現する

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
- ということで、まとめです。今回は、最初にお見せした data, loading, error のような、ただ値を並べただけの props から始まりました
- そこから、props の型で UI の状態を宣言する、という考え方を入れていって、最後はそれだけでは表現しきれない複雑な UI 状態を、コンポーネントの責務分離と JSX の構造で表現する、という話をしました
- ポイントを 3 つにまとめます
- [click:1] まず、UI として意味の違う状態を区別する。たとえば初回 loading と再取得中の loading は、UI 上は別の意味を持つので、区別して考える
- [click:1] 次に、コンポーネントが責任を持つ状態だけを props にする。すべてを1つの props 型に詰め込もうとせず、そのコンポーネントが担当すべき状態にだけ集中させる
- [click:1] そして、型だけで表現しきれない状態は、Suspense や ErrorBoundary のような React の境界を使って、JSX の構造そのものとして表現する
- props 設計を考えるときに、その props は単なる値の集合になっていないか、そのコンポーネントが責任を持つ UI 状態を表せているか、という観点で見直してみると、React コンポーネントのインターフェースをより良いものにできるんじゃないかなと思います
-->

---
layout: center
---

<div class="text-center">
<p class="text-5xl font-bold mt-4" style="line-height:1.5;">
  おわり<br />ありがとうございました！
</p>
</div>
