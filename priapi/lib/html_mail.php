<?php

class HTMLMail {
    public static function Send($to_name, $to_address, $from_name, $from_address, $subject, $html) {
        // Message-Id
        $message_id = date('YmdHis') . '.' . sprintf("%010d", mt_rand(0, 0x7fffffff)) . '@' . gethostname();

        // To
        if (empty($to_name)) {
            $to = $to_address;
        } else {
            $to = '=?iso-2022-jp?B?' . base64_encode(mb_convert_encoding($to_name, 'ISO-2022-JP', 'UTF-8')) . '?= <' . $to_address . '>';
        }

        // From
        if (empty($from_name)) {
            $from = $from_address;
        } else {
            $from = '=?iso-2022-jp?B?' . base64_encode(mb_convert_encoding($from_name, 'ISO-2022-JP', 'UTF-8')) . '?= <' . $from_address . '>';
        }

        // Subject
        $subject = mb_convert_encoding($subject, 'ISO-2022-JP', 'UTF-8');
        $subject = base64_encode($subject);
        $subject = '=?iso-2022-jp?B?' . $subject . '?=';
        
        // Body
        $html = str_replace("\r\n", "\r", $html);
        $html = str_replace("\r", "\n", $html); 

        // ヘッダー
        $headers = <<< HEADER
Message-Id: $message_id
From: $from
MIME-Version: 1.0
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: 8bit
HEADER;
        
        /*
        Additional Parameters
        これをやらないと MAIL FROM で渡すアドレスが [ユーザー名@ホスト名.ドメイン名] になってしまう。
        そのホスト名が DNS で引けないと受信を拒否する MTA が多い。
        php.ini で設定すると、設定が必要なことを忘れてしまいそうだ。
        ホスト名、ドメイン名を変更すると、設定が必要なことを忘れてしまいそうだ。
        */
        $params = '-f' . $from_address; 

        // メール送信実行
        if (!mail($to, $subject, $html, $headers, $params)) {
            return FALSE;
        }

        return $message_id;
    }
}

?>
