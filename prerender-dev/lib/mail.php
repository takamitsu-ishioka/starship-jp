<?php

// やっと来た。utf-8 をそのまま送るメールクラス。

class Mail {
    public static function Send($to_name, $to_address, $from_name, $from_address, $subject, $body) {
        // To
        if (isset($to_name) && !empty($to_name)) {
            $to = '=?utf-8?b?' . base64_encode($to_name) . '?= <' . $to_address . '>';
        } else {
            $to = $to_address;
        }

        // From
        if (isset($from_name) && !empty($from_name)) {
            $from = '=?utf-8?b?' . base64_encode($from_name) . '?= <' . $from_address . '>';
        } else {
            $from = $from_address;
        }

        // Subject
        $subject = base64_encode($subject);
        $subject = '=?utf-8?b?' . $subject . '?=';
        
        // Body
        $body = str_replace("\r\n", "\r", $body);
        $body = str_replace("\r", "\n", $body); 

        // Header
        $headers = "From: $from\n";
        $headers .= "MIME-Version: 1.0\n";
        $headers .= "Content-Type: text/plain; charset=utf-8\n";
        $headers .= "Content-Transfer-Encoding: 8bit";
        
        /*
        Additional Parameters
        これをやらないと MAIL FROM で渡すアドレスが [ユーザー名@ホスト名.ドメイン名] になってしまう。
        そのホスト名が DNS で引けないと受信を拒否する MTA が多い。
        php.ini で設定すると、設定が必要なことを忘れてしまいそうだ。
        ホスト名、ドメイン名を変更すると、設定が必要なことを忘れてしまいそうだ。
        */
        //$params = NULL;
        $params = '-f' . $from_address;

        // メール送信実行
        if (!mail($to, $subject, $body, $headers, $params)) {
            return FALSE;
        }

        return TRUE;
    }
}

?>
