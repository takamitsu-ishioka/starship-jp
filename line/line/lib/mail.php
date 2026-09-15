<?php
namespace LINE;

class Mail {
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

    public static function Send($to_name, $to_address, $from_name, $from_address, $subject, $body) {
        // Message-Id
        $message_id = date('YmdHis') . '.' . sprintf("%010d", mt_rand(0, 0x7fffffff)) . '@' . gethostname();

        // To
        $to = '=?iso-2022-jp?B?' . base64_encode(mb_convert_encoding($to_name, 'ISO-2022-JP', 'UTF-8')) . '?= <' . $to_address . '>';

        // From
        $from = '=?iso-2022-jp?B?' . base64_encode(mb_convert_encoding($from_name, 'ISO-2022-JP', 'UTF-8')) . '?= <' . $from_address . '>';

        // Subject
        $subject = mb_convert_encoding($subject, 'ISO-2022-JP', 'UTF-8');
        $subject = base64_encode($subject);
        $subject = '=?iso-2022-jp?B?' . $subject . '?=';
        //$subject = '=?utf-8?B?' . $subject . '?=';
        
        // Body
        $body = str_replace("\r\n", "\r", $body);
        $body = str_replace("\r", "\n", $body); 
        //$body = str_replace("\n", "<br/>\n", $body); 
        $body = "<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"ISO-2022-JP\"/>\n</head>\n<body>\n<pre>\n" . $body . "</pre>\n</body>\n</html>\n";
        $body = mb_convert_encoding($body, 'ISO-2022-JP', 'UTF-8');

        // Header
        $headers = "Message-Id: $message_id\n";
        $headers .= "From: $from\n";
        $headers .= "MIME-Version: 1.0\n";
        //$headers .= 'X-Mailer: PHP/' . phpversion() . "\n";
        //$headers .= "Content-Type: text/plain; charset=ISO-2022-JP\n";
        //$headers .= "Content-Type: text/plain; charset=utf-8\n";
        $headers .= "Content-Type: text/html; charset=ISO-2022-JP\n";
        $headers .= 'Content-Transfer-Encoding: 7bit';
        //$headers .= 'Content-Transfer-Encoding: 8bit';
        
        /*
        Additional Parameters
        これをやらないと MAIL FROM で渡すアドレスが [ユーザー名@ホスト名.ドメイン名] になってしまう。
        そのホスト名が DNS で引けないと受信を拒否する MTA が多い。
        php.ini で設定すると、設定が必要なことを忘れてしまいそうだ。
        ホスト名、ドメイン名を変更すると、設定が必要なことを忘れてしまいそうだ。
        */
        // $params = '-f' . $from_address; 

        // メール送信実行
        if (!mail($to, $subject, $body, $headers/*, $params*/)) {
            return FALSE;
        }

        return $message_id;
    }
}

?>
