<?php
/*
Starship LINE Bot のコールバックを受け取る
*/

function VarDump($name, $var)
{
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
    private $line = NULL;

    ////////////////////////////////////////////////////////////////////
    // コンストラクター
    function __construct() {
        require_once('./lib/config.php');
        require_once('./lib/misc.php');
        require_once('./lib/db.php');
        $this->db = new DB();
        $this->db->Connect([
            'DB_HOST' => DB_HOST,
            'DB_PORT' => DB_PORT,
            'DB_USER' => DB_USER,
            'DB_PASS' => DB_PASS,
            'DB_NAME' => DB_NAME
        ]);
        require_once('./line/lib/config.php');
        require_once('./line/lib/line.php');
        $this->line = new LINE\LINE();
    }

    ////////////////////////////////////////////////////////////////////
    // フォロー
    private function Follow($event) {
        $this->db->StartTransaction();
        try {
            // フォローイベントを記録
            $user_id_ = DB::Quote($event->source->userId);
            $name = $this->GetDisplayName($event);
            $name_ = DB::Quote($name);
            $timestamp_ = DB::Quote(self::TimestampToString($event->timestamp));
            $result = $this->db->Query("INSERT INTO followers (user_id, name, followed_at) VALUES ($user_id_, $name_, $timestamp_) RETURNING *");
            $follower = pg_fetch_object($result);
            $reply_token_ = DB::Quote($event->replyToken);
            $type = LINE_EVENT_TYPE_FOLLOW;
            $sql = <<< SQL1
INSERT INTO events (
type,
reply_token,
follower_id,
event_at
) VALUES (
$type,
$reply_token_,
{$follower->id},
$timestamp_
) RETURNING *
SQL1;
            $result = $this->db->Query($sql);
            $db_follow_event = pg_fetch_object($result);

            // 自動応答
            $message = <<< MESSAGE
{$follower->name}ちゃん！
フォローありがとう！
MESSAGE;
            $this->line->SendTo($message, $event->source->userId);

            // 自動応答を記録
            $type = LINE_EVENT_TYPE_AUTO;
            $message_ = DB::Quote($message);
            $sql = <<< SQL2
INSERT INTO events (
type,
follower_id,
event_id,
event_at,
message
) VALUES (
$type,
{$follower->id},
{$db_follow_event->id},
NOW(),
$message_
) RETURNING *
SQL2;
            $result = $this->db->Query($sql);
            $db_auto_event = pg_fetch_object($result);

            // オペレーターに通知
            $message = <<< MESSAGE
follower_id: {$follower->id}
follower_name: {$follower->name}

フォローされました
MESSAGE;
            $this->line->SendTo($message, KISABURO_LINE_USER_ID);
            $this->db->Commit();
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__LINE__ . ': ' . $e->getMessage(), $e->getCode());
        }
    }

    ////////////////////////////////////////////////////////////////////
    // メッセージ
    private function Message($event) {
        $this->db->StartTransaction();
        try {
            // メッセージイベントを記録
            $type = LINE_EVENT_TYPE_MESSAGE;
            $reply_token_ = DB::Quote($event->replyToken);
            $user_id_ = DB::Quote($event->source->userId);
            $result = $this->db->Query("SELECT * FROM followers WHERE user_id = $user_id_");
            $follower = pg_fetch_object($result);
            $timestamp_ = DB::Quote(self::TimestampToString($event->timestamp));
            $from_operator = FALSE;
            // メッセージを解析
            if ($event->message->type == 'text') {
                if ($event->source->userId == KISABURO_LINE_USER_ID) {
                    $from_operator = TRUE;
                    $header = $this->ParseHeaders($event);
                }
                $event_message = $event->message->text;
            } else {
                $event_message = json_encode($event->message);
            }
            $message_ = DB::Quote($event_message);
            // DB に書き込む
            $sql = <<< SQL1
INSERT INTO events (
type,
reply_token,
follower_id,
event_at,
message
) VALUES (
$type,
$reply_token_,
{$follower->id},
$timestamp_,
$message_
) RETURNING *
SQL1;
            $result = $this->db->Query($sql);
            $db_message_event = pg_fetch_object($result);
            // name の更新
            $name = $this->GetDisplayName($event);
            if ($name != $follower->name) {
                $name_ = DB::Quote($name);
                $result = $this->db->Query("UPDATE followers SET name = {$name_} WHERE id = {$follower->id} RETURNING *");
                $follower = pg_fetch_object($result);
            }
            // オペレーターからのメッセージ（は返信対象メッセージの送信者または全員に転送する）
            if ($from_operator) {
                if ($header) {
                    // そのメッセージは特定のメッセージに対する返信である
                    if (isset($header->event_id)) {
                        $result = $this->db->Query("SELECT * FROM events WHERE id = {$header->event_id}");
                        $event_record = pg_fetch_object($result);
                        // 返信対象メッセージのレコードあり
                        if ($event_record) {
                            $result = $this->db->Query("SELECT * FROM followers WHERE id = {$event_record->follower_id}");
                            $receiver = pg_fetch_object($result);
                            // 返信対象メッセージを送信したフォロワーのレコードあり
                            if ($receiver) {
                                // そのフォロワーに転送
                                $this->line->SendTo($event->message->text, $receiver->user_id); // TODO: 転送するのは本文だけで良い
                            // 返信対象メッセージを送信したフォロワーのレコード無し
                            } else {
                                // オペレーターにエラーを通知
                                $this->line->SendTo('event_id は正しいが、そのメッセージを送信したフォロワーのレコードが無い', KISABURO_LINE_USER_ID);
                            }
                        // 返信対象メッセージのレコード無し
                        } else {
                            $this->line->SendTo('event_id が変', KISABURO_LINE_USER_ID);
                        }
                    // そのメッセージは特定のフォロワー対するメッセージである
                    } else if (isset($header->follower_id)) {
                        $result = $this->db->Query("SELECT * FROM followers WHERE id = {$header->follower_id}");
                        $receiver = pg_fetch_object($result);
                        // そのフォロワーのレコードあり
                        if ($receiver) {
                            // そのフォロワーに転送
                            $this->line->SendTo($event->message->text, $receiver->user_id);
                        // そのフォロワーのレコード無し
                        } else {
                            // オペレーターにエラーを通知
                            $this->line->SendTo('follower_id が変', KISABURO_LINE_USER_ID);
                        }
                    }
                // メッセージの宛先が指定されていない
                } else {
                    // すべてのフォロワーに転送
                    $result = $this->db->Query("SELECT * FROM followers");
                    for (; $follower = pg_fetch_object($result); ) {
                        try {
                            $this->line->SendTo($event->message->text, $follower->user_id);
                        } catch (Exception $e) {
                            VarDump('$e', $e);
                        }
                    }
                }
            // 自動応答
            } else {
                $message = <<< MESSAGE2
どもども、{$follower->name}ちゃん！
メッセージは山田喜三郎に転送しました。
山田から返事があると思います。
MESSAGE2;
                $this->line->SendTo($message, $event->source->userId);

                // 自動応答を記録
                $type = LINE_EVENT_TYPE_AUTO;
                $message_ = DB::Quote($message);
                $sql = <<< SQL2
INSERT INTO events (
type,
follower_id,
event_id,
event_at,
message
) VALUES (
$type,
{$follower->id},
{$db_message_event->id},
NOW(),
$message_
) RETURNING *
SQL2;
                $result = $this->db->Query($sql);
                $db_auto_event = pg_fetch_object($result);

                // オペレーターに通知
                $message = <<< MESSAGE3
event_id: {$db_message_event->id}
follower_id: {$follower->id}
follower_name: {$follower->name}

{$event_message}
MESSAGE3;
                $this->line->SendTo($message, KISABURO_LINE_USER_ID);
            }
            $this->db->Commit();
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__LINE__ . ': ' . $e->getMessage(), $e->getCode());
        }

    }

    ////////////////////////////////////////////////////////////////////
    // プロフィール
    private function GetDisplayName($event) {
        $response = $this->line->Profile($event->source->userId);
        if ($response->status != 200) {
            VarDump('bad response from line server', $response);
            throw new Exception('bad response from line server');
        }
        return $response->response->displayName;
    }

    ////////////////////////////////////////////////////////////////////
    // ミリ秒単位の UNIX タイムスタンプを標準的文字列形式に変換する
    static private function TimestampToString($timestamp) {
        $seconds = intval($timestamp / 1000, 10);
        $milliseconds = $timestamp % 1000;
        $tm = Misc::array_to_object(localtime($seconds, TRUE));
        return sprintf('%4d-%02d-%02d %02d:%02d:%02d.%d', 1900 + $tm->tm_year, 1 + $tm->tm_mon, $tm->tm_mday, $tm->tm_hour, $tm->tm_min, $tm->tm_sec, $milliseconds);
    }

    ////////////////////////////////////////////////////////////////////
    // テキストメッセージのヘッダー解析
    private function ParseHeaders($event) {
        $lines = explode("\n", $event->message->text);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line == '') {
                break;
            }
            $match = array();
            if (preg_match('/^event_id: *(\d+)$/', $line, $match)) {
                return Misc::array_to_object(array('event_id' => $match[1]));
            } else if (preg_match('/^follower_id: *(\d+)$/', $line, $match)) {
                return Misc::array_to_object(array('follower_id' => $match[1]));
            }
        }
        return FALSE;
    }

    public function Respond($p) {
        $o = Misc::array_to_object($p);
        $json_body = file_get_contents('php://input');
        $body = json_decode($json_body);
        if (empty($body) || empty($body->events)) {
            VarDump('illegal access headers', $_SERVER);
            VarDump('illegal access body', $json_body);
            return [];
        }
        foreach ($body->events as $event) {
            VarDump('$event', $event);
            switch ($event->type) {
            case 'follow':
                $this->Follow($event);
                break;
            case 'message':
                $this->Message($event);
                break;
            default:
            }
        }
        return [];
    }
}

try {
    $server = new Server();
    $response = $server->Respond($_POST);
    $response['status'] = 'success';
} catch (Exception $e) {
    VarDump('$e', $e);
    $response['status'] = 'error';
}

$json_response = json_encode($response);

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
