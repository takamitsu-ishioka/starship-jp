<?php
/*
Starship BOT から LINE グループ・ルーム・ユーザーへメッセージを送信
*/
namespace LINE;

function VarDump($name, $var) {
    ob_start();
    var_dump($var);
    $buffer = ob_get_contents();
    ob_end_clean();
    $fp = fopen('var_dump.txt', 'a');
    fprintf($fp, "%s >>>>>>> %s\n", date('Y-m-d H:i:s'), $name);
    fprintf($fp, "%s\n", $buffer);
    fclose($fp);
}

require_once('./lib/config.php');
require_once('./lib/line.php');

class LINEClient {
    private $line = NULL;

    function __construct() {
        $this->line = new LINE();
    }

    public function Send() {
$message = <<< MESSAGE
あんけらそ
そんけらあ
MESSAGE;
        //$this->line->SendTo($message, ME_CHAMME_LINE_ROOM_ID);
        $this->line->SendTo($message, KISABURO_LINE_USER_ID);
        //$this->line->SendTo($message, TSUDOI_MAMA_LINE_USER_ID);
        //$this->line->SendTo($message, SUMIKA_LINE_USER_ID);
        //$this->line->SendTo($message, XPERIA_LINE_USER_ID);
        $this->line->SendTo($message, KANA_LINE_USER_ID);
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
