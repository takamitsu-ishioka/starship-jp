<?php
/*
LINE グループからの退出
*/

class Sender {
    private $line = NULL;

    function __construct() {
        require_once(dirname(__FILE__) . '/../line.php');
        $this->line = new LINE();
    }

    public function ExitFromGroup() {
        $this->line->ExitFromGroup(LINE_GROUP_ID_EXLINK);   // この定数は定義されていない！
    }
}

chdir(dirname($argv[0]));

try {
    $sender = new Sender();
    $sender->ExitFromGroup();
} catch (Exception $e) {
    VarDump('$e', $e);
    exit(1);
}

exit(0);

?>
