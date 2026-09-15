<?php

/*
LINE API

POST と GET がある。

POST の場合、
Content-Type: application/json

どちらでも認証は、
Authorization: Bearer <チャンネル・アクセストークン>
*/

// 送信 API の URI。to: <LINE のユーザーID> を本体に入れる。
define('LINE_PUSH_API',                     'https://api.line.me/v2/bot/message/push');

// 返信 API の URI。replyTo: <LINE Webhook により通知される受信メッセージの ID>
define('LINE_REPLY_API',                    'https://api.line.me/v2/bot/message/reply');

// ユーザー・プロファイル取得 API の URI。{userId} を LINE のユーザー ID に置換する。
define('LINE_PROFILE_API',                  'https://api.line.me/v2/bot/profile/{userId}');

// トークルーム退出 API の URI。{groupId} を LINE のグループ ID に置換する。
define('LINE_EXIT_FROM_GROUP_API',          'https://api.line.me/v2/bot/group/{groupId}/leave');

// Starship BOT チャンネル用恒久アクセストークン
define('LINE_CHANNEL_TOKEN_STARSHIP_BOT',   'R5eiUJ9DJ+MYyAi2s4YO2rNFE2emrSyHnEZMHRmBusMf5tt04bnRGM0ZjAqJ/nPXqo7WoyJLX0E9zyDiGgeBioRFxcC73h011SbBxtkzow+jfy/iRij1NuLd9SSWULzCNWFpjAflr6Ty+N8/X26JuQdB04t89/1O/w1cDnyilFU=');

// TCPDetective チャンネル用恒久アクセストークン
define('LINE_CHANNEL_TOKEN_TCPDETECTIVE',   'xUpsE5vCr85YfnPzxAqUEHipMhYZQlueKN6UsPrXIsZqDGvxQEPmvqHFfz3/6RVnylFM1uHhNPAyBC4Qmou4EwbXwURt8PPmX8P8kMHaG6myaM1NrTKGklnGvsxDEsH2XeecKmAdGYhbtbYrpkX9TQdB04t89/1O/w1cDnyilFU=');

// 今の所 DB は使っていない
/*
define('DB_HOST',   '127.0.0.1');
define('DB_PORT',   '5433');
define('DB_USER',   'postgres');
define('DB_PASS',   'postgres');
*/
                                             
//define('LINE_USER_ID_KISABURO',             'U5f5021ac2e971ed697a20bf47da804c8'); こっちはガラケー？
// ワイ
define('LINE_USER_ID_KISABURO',             'U4166eba720885fb50827872441e9b9fb');
// ちゃんめー
define('LINE_USER_ID_CHAMME',               'U6a195394ff7f965fa5e5167fd24d7975');
// あやこちゃん
define('LINE_USER_ID_SUMIKA',               'U4fe740df36b9bf24da2bccc4e85b7f51');
// あさみちゃん
define('LINE_USER_ID_ASAMI',                'U89e1f56f6ae4f20d044bfa1d57e6439d');
// ワイ@ASUSとワイ@Xperiaとちゃんめーのトークルーム
define('LINE_ROOM_ID_ME_CHAMME',            'Rb87c15feeda10e42543614060f9a17d4');
// 山田喜三郎@Xperia
define('LINE_USER_ID_KISABURO_XPERIA',      'Ue728117c4b0a9fc0af03bf8772213d12');
?>
