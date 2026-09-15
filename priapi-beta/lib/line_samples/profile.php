<?php
/*
Starship BOT から LINE ユーザーのプロファイルを取得
*/
require_once(dirname(__FILE__) . '/../line.php');

class LINEClient {
    private $line = NULL;

    function __construct() {
        $this->line = new LINE();
    }

    public function Profile() {
        $response = $this->line->Profile(LINE_USER_ID_KISABURO);
        var_dump($response);
    }
}

chdir(dirname($argv[0]));

try {
    $client = new LINEClient();
    $client->Profile();
} catch (Exception $e) {
    var_dump($e);
    exit(1);
}

exit(0);

?>
