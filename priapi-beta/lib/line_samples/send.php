<?php
/*
LINE グループ／ルーム／ユーザーへメッセージを送信
*/
//require_once(dirname(__FILE__) . '/../line_config.php');  ../line.php から require_once() するので不要
require_once(dirname(__FILE__) . '/../line.php');
//define('LINE_ROOM_ID_ME_CHAMME',            'Rb87c15feeda10e42543614060f9a17d4');
//define('LINE_USER_ID_CHAMME',               'U6a195394ff7f965fa5e5167fd24d7975');

class LINEClient {
    private $line = NULL;

    function __construct() {
        $this->line = new LINE();
    }

    public function Send() {
        $message = <<< MESSAGE
ケースが作成されました。
ユーザー名：ishioka@starship.jp
ユーザーID：3
サポートケース情報：{
    "support_case": {
        "id": "2",
        "user_id": "3",
        "status": "Opened",
        "subject": "\u3042\u3093\u3051\u3089\u305d",
        "created_at": "2023-05-10 03:26:59.951721",
        "updated_at": "2023-05-10 03:26:59.951721"
    },
    "support_case_message": {
        "id": "2",
        "support_case_id": "2",
        "direction": "0",
        "in_response_to": "0",
        "message": "\u305d\u3093\u3051\u3089\u3042",
        "created_at": "2023-05-10 03:26:59.951721"
    },
    "support_case_attachments": [
        {
            "file_name": "systemtap_langref.pdf",
            "file_size": 278411
        }
    ]
}
MESSAGE;
/*
        $message = <<< MESSAGE2
あんけらそ
そんけらあ
MESSAGE2;
*/
        //$this->line->SendTo($message, LINE_ROOM_ID_ME_CHAMME);
        $this->line->SendTo($message, LINE_USER_ID_KISABURO);
        //$this->line->SendTo($message, LINE_USER_ID_CHAMME);
        //$this->line->SendTo($message, LINE_USER_ID_SUMIKA);
    }
}

chdir(dirname($argv[0]));

try {
    $client = new LINEClient();
    $client->Send();
} catch (Exception $e) {
    VarDump('$e', $e);
    exit(1);
}

exit(0);

?>
