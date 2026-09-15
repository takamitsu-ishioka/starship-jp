<?php

require_once(dirname(__FILE__) . '/env.php');
LoadEnv(dirname(__FILE__) . '/../.env');

define('DB_HOST',   Env('DB_HOST'));
define('DB_PORT',   '5432');
define('DB_USER',   Env('DB_USER'));
define('DB_PASS',   Env('DB_PASS'));
define('DB_NAME',   Env('DB_NAME'));

define('LINE_EVENT_TYPE_FOLLOW',    1);     // ボットを友達に追加
define('LINE_EVENT_TYPE_MESSAGE',   2);     // 友だちからボットへのメッセージ
define('LINE_EVENT_TYPE_AUTO',      3);     // ボットから友だちへの応答
define('LINE_EVENT_TYPE_REPLY',     4);     // ボットオペレーター（ワイ）から友だちへの返信
define('LINE_EVENT_TYPE_PUSH',      5);     // ボットオペレーター（ワイ）から友だちへのメッセージ
