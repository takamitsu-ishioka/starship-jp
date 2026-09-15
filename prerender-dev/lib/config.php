<?php

define('VAR_DUMP_TXT', 'var_dump.txt');

function VarDump($name, $value = NULL) {
    ob_start();
    var_dump($value);
    $buffer = ob_get_contents();
    ob_end_clean();
    $fp = fopen(VAR_DUMP_TXT, 'a');
    fprintf($fp, "%s >>>>>>> %s\n", date('Y-m-d H:i:s'), $name);
    fprintf($fp, "%s\n", $buffer);
    fclose($fp);
    chmod(VAR_DUMP_TXT, 0666);
}

////////////////////////////////////////////////////////////////////////
// 環境

$_fqdn = ParseHTTPHost();

if ($_fqdn === FALSE) {
    fprintf(STDERR, "Don't place %s here.\n", basename(__FILE__));
    exit(1);
} else {
    if ($_fqdn->env == 'dev') {
        define('ENV', 'DEV');
    } else if ($_fqdn->env == 'beta') {
        define('ENV', 'BETA');
    } else {
        define('ENV', 'REL');
    }
}

require_once(dirname(__FILE__) . '/env.php');
LoadEnv(dirname(__FILE__) . '/../.env');

////////////////////////////////////////////////////////////////////////
// 定数（追加・変更時にはクライアント側の common.js にも同様の修正を加えること）

// DBMS
define('DB_HOST',   Env('DB_HOST'));
define('DB_PORT',   '5432');
define('DB_USER',   Env('DB_USER'));
define('DB_PASS',   Env('DB_PASS'));
if (ENV == 'DEV') {
    define('DB_NAME',   Env('DB_NAME_DEV'));
} else {
    define('DB_NAME',   Env('DB_NAME_REL'));
}

// エラーコード
define('ERROR_NOP',                             -1);    // 「操作が行われなかった」ことを表す特殊なエラーコード
define('ERROR_PARAMETER_INVALID',               1);
define('ERROR_USER_UNKNOWN',                    2);
define('ERROR_PASSWORD_WRONG',                  3);
define('ERROR_ACCOUNT_OR_PASSWORD_WRONG',       4);
define('ERROR_OPERATION_NOT_ALLOWED',           5);
define('ERROR_OPERATION_NOT_NEEDED',            6);

// ユーザータイプ
define('USER_TYPE_ADMIN',                       0);
define('USER_TYPE_PARENT',                      1);
define('USER_TYPE_CHILD',                       2);
define('USER_TYPE_GUEST',                       3);

// 定義済みユーザー
define('ADMIN_ID',                              1);
define('ADMIN_ACCOUNT',                         'admin@prerender.starship.jp');
define('GUEST_ID',                              2);
define('GUEST_ACCOUNT',                         'guest@prerender.starship.jp');

// リクエスト（PreRender からの）
define('REQUEST_START',                         'start');   // 起動を許可せよ（購読が ACTIVE なら許可する）
define('REQUEST_RUN',                           'run');     // 稼働継続を許可せよ（購読が ACTIVE なら許可する）
define('REQUEST_STOP',                          'stop');    // 停止を許可せよ（常に許可する）

// レスポンス（PreRender への）
define('RESPONSE_ALLOW',                        'allow');   // 許可
define('RESPONSE_DENY',                         'deny');    // 拒否

// 最大値と最小値
define('MAX_ACCOUNT_LENGTH',                    64);
define('MIN_ACCOUNT_LENGTH',                    8);
define('MAX_PASSWORD_LENGTH',                   32);
define('MIN_PASSWORD_LENGTH',                    8);

// 開発者のアドレス
define('DEVELOPER_ADDRESS_CSV',                 Env('DEVELOPER_ADDRESS_CSV'));

////////////////////////////////////////////////////////////////////////
// 関数

/*
FQDN を解析して名前の部品を取り出す

【入力例】
prerender-dev1.starship.jp

【出力例】
stdClass Object
(
    [machine] => prerender
    [suffix] => -dev
    [env] => dev
    [number] => 1
    [domain] => starship
    [tld] => jp
)
*/
function ParseFQDN($fqdn) {
    $parts = [];
    if (!preg_match('/^([a-z][0-9a-z]+[a-z])(-(dev|beta))?([0-9]*)\.([a-z][0-9a-z]+[a-z]).([a-z]+)$/', $fqdn, $parts)) {
        return FALSE;
    }
    /*
    $parts == Array
    (
        [0] => prerender-dev1.starship.jp
        [1] => prerender
        [2] => -dev
        [3] => dev
        [4] => 1
        [5] => starship
        [6] => jp
    )
    */
    return json_decode(json_encode([
        'machine' => $parts[1],
        'suffix' => $parts[2],
        'env' => $parts[3],
        'number' => $parts[4],
        'domain' => $parts[5],
        'tld' => $parts[6]
    ]));
}

// Host ヘッダーの値 (FQDN) を解析して名前の部品を取り出す
function ParseHTTPHost() {
    if (isset($_SERVER) && isset($_SERVER['HTTP_HOST'])) {
        return ParseFQDN($_SERVER['HTTP_HOST']);
    } else {
        // CLI で起動されている場合は /var/www/<FQDN>/.../～.php から FQDN を取り出す
        $match = [];
        if (!preg_match('/^\/var\/www\/([^\/]+)\//', __FILE__, $match)) {
            return FALSE;
        }
        $fqdn = $match[1];
        return ParseFQDN($fqdn);
    }
}

// サーバー（自分）の URI を作成する
function GetServerURI() {
    if (!isset($_SERVER) || !isset($_SERVER['REQUEST_SCHEME']) || !isset($_SERVER['HTTP_HOST'])) {
        return FALSE;
    }
    return $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] . '/';
}

// 公開サーバーの URI を作成する
function GetPublicServerURI() {
    $fqdn = ParseHTTPHost();
    return sprintf('%s://pubapi%s%s.%s.%s/', $_SERVER['REQUEST_SCHEME'], $fqdn->suffix, $fqdn->number, $fqdn->domain, $fqdn->tld);
}

// クライアント（PreRender の管理画面）サイトの URI を作成する
function GetConsoleURI() {
    if (!isset($_SERVER) || !isset($_SERVER['REQUEST_SCHEME']) || !isset($_SERVER['HTTP_X_FORWARDED_SERVER'])) {
        return FALSE;
    }
    return $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_X_FORWARDED_SERVER'] . '/';
}

// クライアント（PreRender の管理画面）サイトのサポートページの URI を作成する
function GetConsoleSupportPageURI() {
    $console_uri = GetConsoleURI();
    if ($console_uri === FALSE) {
        return FALSE;
    }
    $console_support_page_uri = sprintf('%s?login=%s&page=admin_support', $console_uri, ADMIN_ACCOUNT);
    return $console_support_page_uri;
}

?>
