<?php

class Misc {

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
            return array_map(function($element) {return Misc::array_to_object($element);}, $a);
        }
        // 連想配列
        $o = new stdClass();
        foreach ($a as $key => $value) {
            $o->$key = Misc::array_to_object($value);
        }
        return $o;
    }

    public static function object_to_array($o) {
        $a = array();
        $vars = get_object_vars($o);
        foreach ($vars as $key => $value) {
            if (is_object($value)) {
                $value = Misc::object_to_array($value);
            }
            $a[$key] = $value;
        }
        return $a;
    }
}
?>
