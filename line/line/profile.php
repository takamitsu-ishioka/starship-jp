<?php
/*
Starship BOT から LINE ユーザーのプロファイルを取得
*/
namespace LINE;

require_once('./lib/config.php');
require_once('./lib/line.php');

class LINEClient {
    private $line = NULL;

    function __construct() {
        $this->line = new LINE();
    }

    public function Profile() {
        //$response = $this->line->Profile('U89e1f56f6ae4f20d044bfa1d57e6439d');
        $response = $this->line->Profile('Uf77436f9b4afc0dbfd4d71109909957e');
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
