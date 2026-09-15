<?php
/*
LINE グループからの脱退
*/

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

class Sender {
    private $line = NULL;

    function __construct() {
        require_once('./lib/config.php');
        require_once('./lib/line.php');
        $this->line = new LINE();
    }

    public function ExitFromGroup() {
        $this->line->ExitFromGroup(EXLINK_LINE_GROUP_ID);
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
