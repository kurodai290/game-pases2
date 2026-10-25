# NEON SURVIVOR ONLINE

スマホ・PC対応のリアルタイムオンラインサバイバル。HTML/CSS/JavaScriptのフロントエンドとNode.js + Socket.IOサーバーで動きます。

## ファイル構成
- `index.html`, `style.css`, `client.js`：GitHub Pagesで公開する画面
- `server.js`：ルーム、プレイヤー、敵、攻撃、HP、勝敗を管理するサーバー
- `package.json`：サーバー依存関係
- `railway.json`：Railway向け設定

## 公開にはフロントとサーバーの両方が必要
GitHub PagesではNode.jsサーバーを動かせません。HTML側はGitHub Pages、`server.js`はRailway等のNode.jsホスティングに分けて公開します。

## 1. GitHubにアップロード
1. ZIPを展開します。
2. GitHubで新しいリポジトリ（例 `neon-survivor-online`）を作成します。
3. ZIPの中のファイルをすべてリポジトリ直下へアップロードします。`index.html`、`style.css`、`client.js`が直下にあることを確認します。

## 2. オンラインサーバーを公開（Railwayの例）
1. Railwayにログインして `New Project` → `Deploy from GitHub Repo` を選び、リポジトリを接続します。
2. `package.json`から自動デプロイされます。必要ならStart Commandは `npm start`。
3. サービス設定で公開ドメインを生成します。
4. `https://あなたのサーバーURL/health` を開き、`{"ok":true,...}`が出るか確認します。

## 3. フロントエンドをサーバーにつなぐ
`client.js`の先頭付近にある次の行を探します。

```js
let url=localStorage.getItem('neon-online-server')||location.origin;
```

次のように、Railwayの公開URLに置き換えます（URL末尾の `/` は付けません）。

```js
let url=localStorage.getItem('neon-online-server')||'https://YOUR-SERVICE.up.railway.app';
```

編集した`client.js`をGitHubに再アップロードします。

## 4. GitHub Pagesを有効化
1. リポジトリの `Settings` → `Pages` を開きます。
2. Sourceを `Deploy from a branch` に設定します。
3. Branchを `main`、フォルダーを `/(root)` にしてSaveします。
4. 表示されたPages URLをスマホやPCで開きます。

## 遊び方
- ルーム作成で6文字のコードを発行。友達はコードを入力して参加（最大6人）。
- ホストが「ゲーム開始」を押すと対戦開始。
- PC：WASDまたは矢印キー。スマホ：左下スティック。攻撃は自動。
- 敵を倒すと撃破数が増え、回復アイテムを拾うとHPが回復します。

## 注意点
- サーバーが停止・スリープ中だとオンライン対戦はできません。無料ホスティングには利用制限がある場合があります。
- ルームとスコアはサーバーのメモリ内だけに保持され、再起動すると消えます。
- これはプレイ可能な初期版です。アカウント、永続ランキング、不正対策、再接続復帰などは未実装です。
