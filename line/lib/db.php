<?php

require_once(dirname(__FILE__) . "/config.php");

class DB {
    private $conn = NULL;

    public function Connect($argv) {
        $db_host = $argv['DB_HOST'];
        $db_port = $argv['DB_PORT'];
        $db_user = $argv['DB_USER'];
        $db_pass = $argv['DB_PASS'];
        $db_name = $argv['DB_NAME'];
        if (preg_match('/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/', $db_host)) {
            $this->conn = pg_connect("hostaddr={$db_host} port={$db_port} dbname={$db_name} user={$db_user} password={$db_pass}");
        } else {
            $this->conn = pg_connect("host={$db_host} port={$db_port} dbname={$db_name} user={$db_user} password={$db_pass}");
        }
        if (!$this->conn) {
            throw new Exception("can't connect");
        }
    }

    public function Query($sql) {
        $result = pg_query($this->conn, $sql);
        if (!$result) {
            throw new Exception("query returned error: " . pg_last_error($this->conn));
        }
        return $result;
    }

    public static function Quote($string) {
        return "E'" . str_replace("\\", "\\\\", str_replace("'", "''", $string)) . "'";
    }

    public function StartTransaction() {
        $this->Query("START TRANSACTION");
    }

    public function Commit() {
        $this->Query("COMMIT");
    }

    public function Rollback() {
        $this->Query("ROLLBACK");
    }
}

?>
