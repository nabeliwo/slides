---
theme: default
title: props は値の集合ではない — UI の状態を宣言する React コンポーネント設計
info: React コンポーネントの props 設計は、UI の状態や責務をどれだけ明確に表現できるかに大きく影響します。しかし実務では、data や isLoading、error といった複数の値の組み合わせによって状態を表現することが多く、コンポーネントが取りうる状態や振る舞いが props から直感的に読み取れないケースも少なくありません。本スライドでは、props 設計を見直すことでコンポーネントの分かりやすさを高めていくための考え方を紹介します。その一例として、discriminated union を用いて props を「値の集合」ではなく「状態そのもの」として表現する設計を取り上げ、条件分岐を減らし、不正な状態を型レベルで防ぐアプローチを解説します。さらに、コンポーネント分割との関係にも触れながら、props 設計によって UI の構造や責務をどのように表現すると良いのか、その判断軸を整理します。本スライドを通して、参加者が自分のコンポーネントの props 設計を振り返り、「その設計が UI の状態や責務を適切に表現できているか」を判断できるようになることを目指します。
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
- ということで本日は型と React とコンポーネント設計について、話します
-->

---

# お題：この props を見て思うこと

<div class="flex-1 flex items-center">
<div class="w-full">

```ts
type Props = {
  data?: User[]
  isLoading?: boolean
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
- 少し思いを巡らせていただいて…、型や React に熟練している方はここからどんな話が展開されるかを想像してもらって…
- はい、まあデータフェッチを親コンポーネントでしていて、そのデータを渡してるんだろうなって感じがします
- 全部 optional になっているのが気になりますが、データフェッチの状態管理であればわからなくはないというか、見たことはあるって気がします
-->

---

# こんな感じで使われそう

<div class="flex-1 flex items-center">
<div class="w-full">

```tsx
const { users, isLoading, error } = useUsers()

return (
  <UserList
    data={users}
    isLoading={isLoading}
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
- その型定義の props を使ったコンポーネントの使われ方を想像してみると、こんな感じになりそう
- useUsers というまあ変な名前のカスタムフックですが、その中で useState や useEffect や fetch を使ってデータフェッチをしたものを返して、それをそのまま UserList コンポーネントに渡すようなイメージです
-->

---
clickAnimation: up
---

# 実際はありえないデータを渡してみる

```tsx
<UserList
  data={users}
  isLoading
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
- じゃあここで、その UserList コンポーネントにあえてそんな状態ないだろっていうデータを渡してみます
- [click:1] ありえない状態というのは、データを取得できた かつ データを取得中 かつ データ取得でエラーが発生した、と仮定します
- [click:1] おかしな話ですが、型チェックは通りますね、型定義に違反していないので
- [click:1] で、さらにこのデータを渡した場合、UserList は何を返すんだろうっていうのを考えてみると、まったく見えてこないなと、思うわけです
-->

---

# コンポーネント実装を見てみる

<div class="flex-1 flex items-center">
<div class="w-full">

```tsx {all|2|4|6-12}
const UserList = (props: Props) => {
  if (props.isLoading) return <Loader />

  if (props.error) return <ErrorMessage error={props.error} />

  // isLoading でも error でもなければ data の値を描画
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
  --slidev-code-font-size: 1.2rem;
}
</style>

<!--
- ということで、コンポーネントの中身を見てみますと
- [click:1] まず isLoading の制御があって
- [click:1] 次に error の判定があって
- [click:1] 最後に data を表示する、という感じになってました。data は optional なので、他の props の状態とは関係がなく常に存在チェックが必要になっちゃってるっていう微妙なところもありますね
-->

---

# 期待する状態のパターン

<div class="flex-1 flex items-center">
<div class="w-full">

```tsx
<UserList data={users} />   // データを取得できた
<UserList isLoading />      // データを取得中
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
- UserList コンポーネントが期待する props の受け取り方を考えてみると、実際は、この3パターン以外はありえないので受け取りたくないはずですよね
- ただ厳密には、コンポーネントがマウントされてからデータフェッチが始まるまでの idle 状態もあるが、それは今日は一旦省いて考える
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
- まずこういう場合は、discriminated union を使いましょう、という話です
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
      return <Loader />

    case "error":
      return <ErrorMessage error={props.error} />

    case "success": {
      // オプショナルチェーンが不要になった
      return props.data.map((item) => (
        <div key={item.id}>
          {/* 省略 */}
        </div>
      ))
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
  --slidev-code-font-size: 1.1rem;
}
</style>

<!--
- さらに、コンポーネントの中の実装がどう変わるかを見てみます
- if 文から switch 文に変えてますが、そこはあまり本質ではないので気にしないでいただいて
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
- ここからは、props とか型とかの話からちょっと離れまして、今まで話していた UserList コンポーネントをもっと良くできないかなっていうのを考えてみます
-->

---
layout: center
---

<div class="text-center">
<p class="text-4xl font-bold mt-4" style="line-height:1.5;">
  🤔💭<br />UserList の内部で Loader や ErrorMessage を<br />出し分けるのは UserList の責務なのか
</p>
</div>

<!--
- これまで、UserList の内部で Loader や ErrorMessage の出し分けをしていましたが、果たしてそれって UserList の責務なのかなと、思ったりもします
- ということでここからはコンポーネントの責務について考えていきます
-->

---

# コンポーネントを分割してみる

<div class="flex-1 flex items-center">
<div class="w-full">

```tsx
const UserList = ({ users }: Props) => users.map((user) => (
  <div key={user.id}>
    {/* 省略 */}
  </div>
))
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
- そこで、とりあえずまずは気になったままにコンポーネント分割をしてみます
- UserList は users props のみを受け取って表示するだけの責務にしてみました
- とてもシンプルなコンポーネントになりましたね
-->

---

# 親コンポーネントに責務を委譲する

<div class="flex-1 flex items-center">
<div class="w-full">

```tsx
const Page = () => {
  const users = useUsers()

  switch (users.status) {
    case "loading":
      return <Loader />

    case "error":
      return <ErrorMessage error={users.error} />

    case "success":
      return <UserList users={users.data} />
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
  --slidev-code-font-size: 1.2rem;
}
</style>

<!--
- UserList から分岐がなくなった分、それを親に持たせるわけですが、useUsers カスタムフックのインターフェースを少し変えて、このカスタムフックが返すデータフェッチの結果を、discriminated union な型になるようにしてます
- そして、Page コンポーネントが useUsers を呼び出して、そのレスポンスに応じてコンポーネントを出し分ける責務を持つようになりました
-->

---
clickAnimation: up
---

# 🤔💭 条件分岐が親に移動しただけ…？

<div class="text-3xl mt-30 pl-10">
<v-clicks>

# 責務の分離をしている

- Page はコンポーネントを出し分ける責務を持つ
- UserList は users を表示する責務を持つ

</v-clicks>
</div>

<style>
.slidev-layout {
  display: flex;
  flex-direction: column;
}
</style>

<!--
- これ条件分岐を親に移動しただけで何か変わりました？って思うかもしれないのですが
- [click:1] ここでやったことというのは責務の分離になります
- [click:1] Page はコンポーネントを出し分ける責務のみを持ち、UserList は users を表示する責務のみを持つようになりました
- それぞれのコンポーネントが単一の責務のみを持つことによるメリットは、コンポーネントの再利用やテストのしやすさ、あとは見通しとか、様々あります
- ということで、今挙げた例はとても簡単なことなんですけど、責務の分離という観点を持つことも、コンポーネント設計をより良いものにしてくれるかなと思います
- ここから最後にもう一つ、ちょっと発展して今どきの React でコンポーネント設計をする際の観点を考えてみます
-->

---

# さらに発展させてみる

<div class="flex-1 flex items-center">
<div class="w-full">

```tsx {all|1-3,6}
type Props = {
  usersPromise: Promise<User[]>
}

const UserList = ({ usersPromise }: Props) => {
  const users = use(usersPromise)

  return users.map((user) => (
    <div key={user.id}>
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
  --slidev-code-font-size: 1.2rem;
}
</style>

<!--
- 早速ですが、UserList コンポーネントのインターフェースを変更します
- この変更内容は、次のスライドに出てくる React の Suspense を前提とした書き方になります
- [click:1] users というリストを受け取るのではなく users の promise を受け取って、React の API である use に渡して promise から値を取り出しています
- use は promise や context から値を読み取ってくれるやつですね
-->

---

# ErrorBoundary と Suspense を使って境界を作る

<div class="flex-1 flex items-center">
<div class="w-full">

```tsx {all|2,7|5,9|6,8}
const Page = () => {
  const usersPromise = fetchUsers()

  return (
    <ErrorBoundary fallback={<ErrorMessage />}>
      <Suspense fallback={<Loader />}>
        <UserList usersPromise={usersPromise} />
      </Suspense>
    </ErrorBoundary>
  )
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
  --slidev-code-font-size: 1.2rem;
}
</style>

<!--
- そして、この UserList を呼ぶ Page コンポーネントが大きく変わっています
- [click:1] カスタムフックを呼ぶのではなく users をフェッチする関数を直接呼び出して、その promise を UserList に渡しています
- ローディング中の UI とエラーが出たときの UI が、条件分岐による表現ではなくなっています
- [click:1] error 状態は ErrorBoundary の fallback で表現されていて、エラーが影響する範囲を ErrorBoundary のサブツリーに閉じ込める、ということをやっています
- [click:1] 同じように loading 状態は Suspense の fallback で表現されていて、データ取得状態が影響する範囲を Suspense のサブツリーに閉じ込める、ということをやっています
-->

---
clickAnimation: up
---

# 🤔💭 条件分岐を隠しているだけ…？

<div class="flex-1 flex items-center">
<div class="w-full text-4xl">
<v-clicks>

UI の状態を JSX の構造として表現している

</v-clicks>
</div>
</div>

<style>
.slidev-layout {
  display: flex;
  flex-direction: column;
}
:deep(.slidev-code) {
  --slidev-code-font-size: 1.2rem;
}
</style>

<!--
- これって別のコンポーネントに条件分岐を隠しているだけなのではと思われるかもしれないのですが
- [click:1] ここでやっていることは、if や switch で状態を分岐する代わりに、UI の状態を JSX の構造として表現できるようにしているってことです
- あとは、状態遷移を React の仕組みに統合したことによって、非同期の状態の管理を JSX の構造に組み込めている、みたいな良さがあります。非同期処理の部分はどうしても命令的な処理を書かざるを得なかったのですが、そこも宣言的に書けるようになっています
-->

---
clickAnimation: up
---

# まとめ

<div class="flex-1 flex items-center">
<div class="w-full">

<v-clicks>
<div class="text-4xl">

- props の型で UI の状態を宣言する
- コンポーネントの分割で責務を分ける
- JSX の構造で UI の状態を表現する

</div>
</v-clicks>

</div>
</div>

<style>
.slidev-layout {
  display: flex;
  flex-direction: column;
}
</style>

<!--
- ということで、最後まとめです。今回は3つ
- [click:1] props の型で UI の状態を宣言する、コンポーネントの分割で責務を分ける、JSX の構造で UI の状態を表現する、という観点についてお話しました
- コンポーネント設計を考える際の観点として、頭の片隅に入れておいてもらえると、プロダクト開発の役に立つのではないかなと思います
-->
