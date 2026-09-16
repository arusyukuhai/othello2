# Othello2

時間・世界線をまたいで石を挟むブラウザゲーム。CPU対戦／同じ端末での2人対戦に対応します。

HTML・CSS・JavaScriptだけで動作します。インストール、ビルド、APIキー、外部CDNは不要です。

## GitHub Pagesで公開する

1. ZIPを展開します。
2. GitHubでリポジトリを作成し、**Othello2フォルダの中身**をリポジトリのルートに配置します。ルート直下に `index.html` がある状態にしてください。`.nojekyll` も含めます。
3. ファイルを `main` ブランチへコミット・プッシュします。
4. リポジトリの **Settings → Pages** を開きます。
5. **Source: Deploy from a branch**、**Branch: main**、**Folder: /(root)** を選択し **Save**。
6. デプロイ完了後、Pages設定画面に表示されたURLを開きます。

公開先が `https://ユーザー名.github.io/リポジトリ名/` でも、読み込むファイルとCPUのWorkerは相対URLで解決されます。

[GitHub公式の公開元設定ガイド](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 手元で起動する

Python 3を利用できる環境で、このフォルダを開いて実行します。

```sh
python3 serve.py
```

ブラウザで `http://127.0.0.1:8000/` を開きます。終了はターミナルで Ctrl+C。

`index.html` のダブルクリック（file://）では、ブラウザの制限によりJavaScriptモジュールとWorkerが読み込めません。上記のHTTPサーバーを利用してください。

## その他の静的ホスティング

このフォルダ内の `index.html`、`style.css`、`favicon.svg`、4つの `.mjs` ファイルを同じ場所に配置します。ビルドコマンドは不要です。`.mjs` をJavaScriptのMIMEタイプ（`text/javascript` または `application/javascript`）で配信してください。

## 操作

- 点があるマスへ着手し、手番を確定します。
- 確定前の自分の仮置きだけを取り消せます。
- ドラッグで移動、ホイール／ピンチで拡大縮小。
- 「全体」で全世界線を表示。「現在」で現在線へ移動。
- 右側の局面一覧から盤面を選択。「選択盤面を拡大」で大きく表示。
- キーボード：盤面をフォーカスし、矢印キーでマス移動、Enterで着手、Ctrl/⌘+Enterで確定、`[` / `]` で盤面切り替え。
- 対局設定と詳しいルールは画面右上にあります。

## 今回の修正

- タイトルはOthello2。画面は以前の淡い背景・緑の盤面・紫の世界線のデザインに戻しています。
- 跳躍・パスで時計だけ進んだ盤面を、待機履歴として保持。後続の着手でも消えず、時間軸の穴と挟みの途切れを解消。
- 待機履歴は挟み・過去への着手に使えますが、得点へは加算しません。待機状態は時刻の横の「−」と局面欄に表示します。
- 確定済みの手番の取り消し禁止、跳躍時の手番消費、CPUの二重着手防止を維持。
- CPUはαβ枝刈りと同一局面の再利用を行う、制限時間付きの選択的探索です。

## ソース

| ファイル | 内容 |
|---|---|
| `index.html` | 画面とルール説明 |
| `style.css` | レイアウト・配色 |
| `app.mjs` | 描画、操作、CPU処理の管理 |
| `engine.mjs` | 合法手、反転、分岐、履歴、得点 |
| `search.mjs` | CPU探索、評価、枝刈り |
| `worker.mjs` | CPU探索用のWeb Worker |
| `favicon.svg` | アイコン |
| `serve.py` | ローカル確認用HTTPサーバー |
| `tests/engine.test.mjs` | ルールと探索の回帰テスト |

テストはNode.jsがある環境で実行できます。ゲームを遊ぶためにNode.jsは不要です。

```sh
node tests/engine.test.mjs
```

対局はページを閉じる／再読み込みすると終了します。オンライン対戦やサーバー保存は含みません。
