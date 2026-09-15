# starship-jp

`www1.starship.jp`（AWS EC2, Amazon Linux 2）上で稼働している複数サイトのソースコードと、
それを支えるサーバー設定を、AMIから機械的に復元できない「ノウハウ」ごとgit管理下に置いたもの。

## 構成

実サーバー上の絶対パスをそのままディレクトリ構造に反映している。

```
www/              /var/www/www.starship.jp            個人ポートフォリオサイト(公開サイト本体)
www-dev/          /var/www/www-dev.starship.jp         同上、開発環境
www-beta/         /var/www/www-beta.starship.jp        同上、ベータ環境
line/             /var/www/line.starship.jp            LINE Botバックエンド
prerender-dev/    /var/www/prerender-dev.starship.jp    プリレンダリングサービス
priapi/           /var/www/priapi.starship.jp           API(会員管理・PayPal決済連携)
priapi-beta/      /var/www/priapi-beta.starship.jp      同上、ベータ環境
priapi-dev/       /var/www/priapi-dev.starship.jp       同上、開発環境

etc/httpd/        /etc/httpd                            Apache vhost・SSL・モジュール設定
var/spool/cron/root  /var/spool/cron/root                証明書自動更新のcrontab(root)
```

対象外（別クライアント案件、巨大な生データ、バックアップ日付サフィックス付きディレクトリ等）は含めていない。

## 機密情報

DB接続情報・PayPalクライアントID/シークレット・LINEユーザーID・AWS認証情報などは、
コードから環境変数(`.env`)へ分離してある。各サイトディレクトリの`.env.template`が
必要なキーの一覧。

```bash
cp priapi/.env.template priapi/.env   # 各サイトごとに
# .env を実際の値で埋める(このファイルはgitignore対象、絶対にコミットしない)
```

`.env`の読み込みは各サイトの`lib/env.php`の`LoadEnv()`が行う。コード側は
`Env('DB_HOST')`のように値を取得する（`lib/config.php`, `lib/paypal.php`等を参照）。

## デプロイ

このリポジトリは正としてローカルで編集し、`rsync`で本番(EC2)へ反映する運用。

```bash
rsync -av priapi/lib/config.php ec2-user@www1.starship.jp:/var/www/priapi.starship.jp/lib/
```

`.env`はデプロイ対象に含めない（本番サーバー上にのみ存在する）。新しい環境変数キーを
追加した場合は、先にサーバー側の`.env`にキーを追加してから、それを使うコードをデプロイする
（ダウンタイムを避けるため）。
