<?php

require_once('./lib/db.php');

class FOOBAR {

    function __construct() {
    }

    public function Foobar() {
    /*
        $db = new DB();
        $db->Connect([
            'DB_HOST' => DB_HOST,
            'DB_PORT' => DB_PORT,
            'DB_NAME' => DB_NAME,
            'DB_USER' => DB_USER,
            'DB_PASS' => DB_PASS
        ]);

        $result = $db->Query("SELECT * FROM support_cases WHERE user_id = 3 ORDER BY id ASC");
        $support_cases = [];
        for (; $support_case = pg_fetch_object($result); ) {
            $support_case->support_case_attachments = [];
            $result2 = $db->Query("SELECT * FROM support_case_attachments WHERE support_case_id = 1 ORDER BY id ASC");
            for (; $support_case_attachment = pg_fetch_object($result2); ) {
                $support_case->support_case_attachments[] = $support_case_attachment;
            }
        }
    */
        var_dump($_SERVER);
    }
}

echo '<pre style="font-size: 1.5rem;">'."\n";

try {
    $server = new FOOBAR();
    $server->Foobar();
} catch (Exception $e) {
    var_dump($e);
}

echo '</pre>'."\n";

?>
