<?php
/*
LINE API を呼び出す API
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

class Server {
    private $db = NULL;

    function __construct() {
        require_once('./lib/config.php');
        require_once('./lib/misc.php');
        require_once('./lib/db.php');
        $this->db = new DB();
        $this->db->Connect(array(
            'DB_HOST' => DB_HOST,
            'DB_PORT' => DB_PORT,
            'DB_USER' => DB_USER,
            'DB_PASS' => DB_PASS,
            'DB_NAME' => DB_NAME
        ));
    }

    private function Generic($o) {
        return array();
    }

    public function Respond($p) {
        $o = Misc::array_to_object($p);
        if (!isset($o->command)) {
            throw new Exception("command missing");
        }
        switch ($o->command) {
        case 'generic':
            $response = $this->Generic($o);
            break;
        default:
            throw new Exception("unkonwn command {$o->command}");
        }
        return $response;
    }
}

try {
    $server = new Server();
    $response = $server->Respond($_POST);
    $response['status'] = 'success';
} catch (Exception $e) {
    //VarDump('$e', $e);
    VarDump('$e->getMessage()', $e->getMessage());
    $response = array(
        'status' => 'error',
        'message' => __FILE__ . ': ' . $e->getMessage(),
        'code' => $e->getCode()
    );
}

$json_response = json_encode($response);

//VarDump('$json_response', $json_response);

header('Cache-Control: max-age=0');
header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
header('Last-Modified: ' . gmdate('D, d M Y H:i:s') . ' GMT');
header('Cache-Control: no-cache');
header('Pragma: public');
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

echo $json_response;

exit(0);

?>
