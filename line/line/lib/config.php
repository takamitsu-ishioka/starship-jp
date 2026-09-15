<?php

namespace LINE;

require_once(dirname(__FILE__) . '/env.php');
\LoadEnv(dirname(__FILE__) . '/../../.env');

define('KISABURO_LINE_USER_ID',             \Env('KISABURO_LINE_USER_ID'));
define('CHAMME_LINE_USER_ID',               \Env('CHAMME_LINE_USER_ID'));
define('SUMIKA_LINE_USER_ID',               \Env('SUMIKA_LINE_USER_ID'));
define('ASAMI_LINE_USER_ID',                \Env('ASAMI_LINE_USER_ID'));   // あさみちゃん
define('TSUDOI_MAMA_LINE_USER_ID',          \Env('TSUDOI_MAMA_LINE_USER_ID'));   // 集いママ
define('YOU_LINE_USER_ID',                  \Env('YOU_LINE_USER_ID'));   // ゆうちゃん
define('XPERIA_LINE_USER_ID',               \Env('XPERIA_LINE_USER_ID'));   // 山田喜三郎@Xperia
define('STARSHIP_LINE_USER_ID',             \Env('STARSHIP_LINE_USER_ID'));   // 山田喜三郎@starship
define('KANA_LINE_USER_ID',                 \Env('KANA_LINE_USER_ID'));   // かなちゃん？（未確認）

// グループ・ルーム
define('ME_CHAMME_LINE_ROOM_ID',            \Env('ME_CHAMME_LINE_ROOM_ID'));
define('EXLINK_LINE_GROUP_ID',              \Env('EXLINK_LINE_GROUP_ID'));
define('MEDIA_AND_EXLINK_LINE_GROUP_ID',    \Env('MEDIA_AND_EXLINK_LINE_GROUP_ID'));

?>
