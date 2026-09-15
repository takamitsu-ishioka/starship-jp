<?php

class Curl
{
    private $handle = NULL;
    private $status_code = 0;

    function __construct() {
    }

    function __destruct() {
    }

    static private function VarDump($name, $var) {
        ob_start();
        var_dump($var);
        $buffer = ob_get_contents();
        ob_end_clean();
        $fp = fopen('var_dump.txt', 'a');
        fprintf($fp, "%s >>>>>>> %s\n", date('Y-m-d H:i:s'), $name);
        fprintf($fp, "%s\n", $buffer);
        fclose($fp);
    }

    // $headers は連想配列ではなく文字列を要素とする配列
    public function Post($proxy, $proxy_port, $url, $auth, $body, $headers = array(), $post_flag = TRUE) {
        try {
            $this->status_code = 0;
            $this->handle = curl_init();
            if (!$this->handle) {
                $this->Error();
            }
            if (is_array($body)) {
                $fields = http_build_query($body);
            } else if (is_object($body)) {
                $fields = http_build_query(self::object_to_array($body));
            } else {
                $fields = $body;
            }
            $opt = array(
                CURLOPT_POST => $post_flag,
                CURLOPT_URL => $url,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_SSL_VERIFYPEER => FALSE,
                CURLOPT_SSL_VERIFYHOST => FALSE,
                CURLOPT_RETURNTRANSFER => TRUE,
                CURLOPT_FOLLOWLOCATION => TRUE,
                CURLOPT_MAXREDIRS => 8,
                CURLOPT_AUTOREFERER => TRUE,
                CURLOPT_POSTFIELDS => $fields
            );
            if (isset($proxy)) {
                $opt[CURLOPT_HTTPPROXYTUNNEL] = 1;
                $opt[CURLOPT_PROXY] = $proxy;
                $opt[CURLOPT_PROXYPORT] = $proxy_port;
            }
            if ($auth) {
                $opt[CURLOPT_USERPWD] = $auth['user'] . ':' . $auth['password'];
            }
            if (!curl_setopt_array($this->handle, $opt)) {
                $this->Error();
            }
            $response = curl_exec($this->handle);
            $this->status_code = curl_getinfo($this->handle, CURLINFO_HTTP_CODE);
            if (!$response) {
                $this->Error();
            }
            curl_close($this->handle);
            $this->handle = NULL;
            return $response;
        } catch (Exception $e) {
            if ($this->handle) {
                curl_close($this->handle);
                $this->handle = NULL;
            }
            throw $e;
        }
    }

    public function Get($proxy, $proxy_port, $url, $auth, $headers = array()) {
        return $this->Post($proxy, $proxy_port, $url, $auth, array(), $headers, FALSE);
    }

    protected function Error() {
        if ($this->handle) {
            throw new Exception('curl error: ' . curl_error($this->handle));
        } else {
            throw new Exception('curl error: cannot initialize curl');
        }
    }

    public function GetStatusCode() {
        return $this->status_code;
    }

    public static function array_to_object($a) {
        // 配列ではない
        if (!is_array($a)) {
            if (is_string($a)) {
                if ($a == 'true') {
                    return TRUE;
                } else if ($a == 'false') {
                    return FALSE;
                }
            }
            return $a;
        }
        // 空っぽの配列
        if (empty($a)) {
            return $a;
        }
        // 非連想配列
        if (isset($a[0])) {
            return array_map(function($element) {return Curl::array_to_object($element);}, $a);
        }
        // 連想配列
        $o = new stdClass();
        foreach ($a as $key => $value) {
            $o->$key = Curl::array_to_object($value);
        }
        return $o;
    }

    public static function object_to_array($o) {
        $a = array();
        $vars = get_object_vars($o);
        foreach ($vars as $key => $value) {
            if (is_object($value)) {
                $value = Curl::object_to_array($value);
            }
            $a[$key] = $value;
        }
        return $a;
    }
}

?>
