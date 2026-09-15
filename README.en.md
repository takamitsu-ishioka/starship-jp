# starship-jp

Source code for multiple sites running on `www1.starship.jp` (AWS EC2, Amazon Linux 2), placed under git management together with the "know-how" that supports them, which cannot be mechanically restored from an AMI.

## Structure

The absolute paths on the actual server are reflected directly in the directory structure.

```
www/              /var/www/www.starship.jp            Personal portfolio site (the main public site)
www-dev/          /var/www/www-dev.starship.jp         Same as above, development environment
www-beta/         /var/www/www-beta.starship.jp        Same as above, beta environment
line/             /var/www/line.starship.jp            LINE Bot backend
prerender-dev/    /var/www/prerender-dev.starship.jp    Prerendering service
priapi/           /var/www/priapi.starship.jp           API (member management, PayPal payment integration)
priapi-beta/      /var/www/priapi-beta.starship.jp      Same as above, beta environment
priapi-dev/       /var/www/priapi-dev.starship.jp       Same as above, development environment

etc/httpd/        /etc/httpd                            Apache vhost, SSL, and module configuration
var/spool/cron/root  /var/spool/cron/root                crontab for automatic certificate renewal (root)
```

Items out of scope (other client projects, large raw data, directories with backup date suffixes, etc.) are not included.

## Sensitive Information

DB connection info, PayPal client ID/secret, LINE user IDs, AWS credentials, etc. have been separated from the code into environment variables (`.env`). Each site directory's `.env.template` is
the list of required keys.

```bash
cp priapi/.env.template priapi/.env   # for each site
# Fill in .env with actual values (this file is gitignored; never commit it)
```

Loading of `.env` is done by `LoadEnv()` in each site's `lib/env.php`. On the code side, values are retrieved like
`Env('DB_HOST')` (see `lib/config.php`, `lib/paypal.php`, etc.).

## Deployment

This repository is treated as the source of truth, edited locally, and reflected to production (EC2) via `rsync`.

```bash
rsync -av priapi/lib/config.php ec2-user@www1.starship.jp:/var/www/priapi.starship.jp/lib/
```

`.env` is not included in deployment targets (it exists only on the production server). If you
add a new environment variable key, add the key to the `.env` on the server side first, then deploy
the code that uses it (to avoid downtime).
