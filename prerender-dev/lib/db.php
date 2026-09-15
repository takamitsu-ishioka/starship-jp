<?php

require_once(dirname(__FILE__) . "/config.php");

class DB {
    private $conn = NULL;

    public function Connect($specs) {
        $db_host = $specs['DB_HOST'];
        $db_port = $specs['DB_PORT'];
        $db_name = $specs['DB_NAME'];
        $db_user = $specs['DB_USER'];
        $db_pass = $specs['DB_PASS'];
        if (preg_match('/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/', $db_host)) {
            $this->conn = pg_connect("hostaddr={$db_host} port={$db_port} dbname={$db_name} user={$db_user} password={$db_pass}");
        } else {
            $this->conn = pg_connect("host={$db_host} port={$db_port} dbname={$db_name} user={$db_user} password={$db_pass}");
        }
        if (!$this->conn) {
            //throw new Exception("DB::Connect(): can't connect: " . json_encode($specs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            throw new Exception("DB::Connect(): can't connect: ");
        }
    }

    public function Query($sql) {
        $result = pg_query($this->conn, $sql);
        if (!$result) {
            throw new Exception('DB::Query(): ' . pg_last_error($this->conn));
        }
        return $result;
    }

    public static function Quote($string) {
        return "E'" . str_replace("\\", "\\\\", str_replace("'", "''", $string)) . "'";
    }

    /*
    オブジェクトのプロパティの自然数としての妥当性を検証する。
    $o          プロパティを持っているオブジェクト
    $varname    プロパティの名前
    $defval     プロパティがセットされていない場合に返すべき値。
                $defval === FALSE の場合、例外を飛ばす。
    $maxval     プロパティの値の最大値。
    返却値は DB::Quote() しない。
    */
    public static function ValidateNaturalNumber($o, $varname, $defval, $maxval = NULL) {
        if (!isset($o)) {
            throw new Exception('DB::ValidateNaturalNumber(): $o not set');
        }
        if (!is_object($o)) {
            throw new Exception('DB::ValidateNaturalNumber(): $o not an object');
        }
        if (!isset($o->$varname)) {
            if ($defval === FALSE) {
                throw new Exception("DB::ValidateNaturalNumber(): \$o->$varname not set");
            }
            return $defval;
        }
        if (strspn($o->$varname, '0123456789') != strlen($o->$varname)) {
            throw new Exception("DB::ValidateNaturalNumber(): \$o->$varname value invalid");
        }
        $val = intval($o->$varname, 10);
        if (isset($maxval)) {
            if ($maxval < $val) {
                throw new Exception("DB::ValidateNaturalNumber(): \$o->$varname value too large");
            }
        }
        return $val;
    }

    /*
    オブジェクトのプロパティの文字列としての妥当性を検証する（改行を含んではならない場合）。
    $o          プロパティを持っているオブジェクト
    $varname    プロパティの名前
    $defval     プロパティがセットされていない場合に返すべき値。
                $defval === FALSE の場合、例外を飛ばす。
    $maxlen     値の最大長（文字数。バイト数ではない）。
    返却値は DB::Quote() する。
    */
    public static function ValidateString($o, $varname, $defval, $maxlen = NULL) {
        if (!isset($o)) {
            throw new Exception('DB::ValidateString(): $o not set');
        }
        if (!is_object($o)) {
            throw new Exception('DB::ValidateString(): $o not an object');
        }
        if (!isset($o->$varname)) {
            if ($defval === FALSE) {
                throw new Exception("DB::ValidateString(): \$o->$varname not set");
            }
            return DB::Quote($defval);
        }
        if (strcspn($o->$varname, "\r\n") != strlen($o->$varname)) {
            throw new Exception("DB::ValidateString(): CR and/or LF codes found in \$o->$varname value");
        }
        if (isset($maxlen)) {
            if ($maxlen < mb_strlen($o->$varname)) {
                throw new Exception("DB::ValidateString(): \$o->$varname value too long");
            }
        }
        return DB::Quote($o->$varname);
    }

    /*
    オブジェクトのプロパティの文字列としての妥当性を検証する（改行を含んでも良い場合）。
    $o          プロパティを持っているオブジェクト
    $varname    プロパティの名前
    $defval     プロパティがセットされていない場合に返すべき値。
                $defval === FALSE の場合、例外を飛ばす。
    $maxlen     値の最大長（文字数。バイト数ではない）。
    返却値は DB::Quote() する。
    */
    public static function ValidateLines($o, $varname, $defval, $maxlen = NULL) {
        if (!isset($o)) {
            throw new Exception('DB::ValidateLines(): $o not set');
        }
        if (!is_object($o)) {
            throw new Exception('DB::ValidateLines(): $o not an object');
        }
        if (!isset($o->$varname)) {
            if ($defval === FALSE) {
                throw new Exception("DB::ValidateLines(): \$o->$varname not set");
            }
            return DB::Quote($defval);
        }
        if (isset($maxlen)) {
            if ($maxlen < mb_strlen($o->$varname)) {
                throw new Exception("DB::ValidateLines(): \$o->$varname value too long");
            }
        }
        return DB::Quote($o->$varname);
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
