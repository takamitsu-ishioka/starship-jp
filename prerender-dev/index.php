<?php
/*
prerender 公開 API
*/

class Server {
    private $db = NULL;

    function __construct() {
        require_once('./lib/misc.php');
        require_once('./lib/db.php');
        $this->db = new DB();
        $this->db->Connect([
            'DB_HOST' => DB_HOST,
            'DB_PORT' => DB_PORT,
            'DB_NAME' => DB_NAME,
            'DB_USER' => DB_USER,
            'DB_PASS' => DB_PASS
        ]);
    }

    ////////////////////////////////////////////////////////////////////
    // API コマンドハンドラーから呼ばれる関数

    private static function SendHTTPErrorResponse($status_code, $status_message, $html_title, $html_body) {
        $now = gmdate('D, d M Y H:i:s') . ' GMT';
        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
<title>$html_title</title>
</head>
<body>
$html_body
</body>
</html>
HTML;
        $content_length = strlen($html);
        header("HTTP/1.1 $status_code $status_message");
        header("Date: $now");
        header("Content-Length: $content_length");
        header('Connection: close');
        header('Content-Type: text/html; charset=utf-8');
        echo $html;
        exit(0);
    }

    /*
    アカウントの文字列としての妥当性を検査する。
    $account    アカウント値文字列。
    $name       そのパラメータ名。例外メッセージに使う。
    エラーメッセージで情報出しまくりだが、common.js を解析すれば分かることなので隠してもしょうがない。
    デバッグしやすい方が良い。
    */
    private static function ValidateAccount($account, $name) {
        try {
            if (!isset($account)) {
                throw new Exception("$name missing", ERROR_PARAMETER_INVALID);
            }
            if (MAX_ACCOUNT_LENGTH < strlen($account)) {
                throw new Exception("$name $account too long", ERROR_PARAMETER_INVALID);
            }
            if (strlen($account) < MIN_ACCOUNT_LENGTH) {
                throw new Exception("$name $account too short", ERROR_PARAMETER_INVALID);
            }
            if (!preg_match('/[0-9]/', $account)) {
            }
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    /*
    パスワードの文字列としての妥当性を検査する。
    $account    アカウント値文字列。
    $name       そのパラメータ名。例外メッセージに使う。
    エラーメッセージで情報出しまくりだが、common.js を解析すれば分かることなので隠してもしょうがない。
    デバッグしやすい方が良い。
    */
    private static function ValidatePassword($password, $name) {
        try {
            if (!isset($password)) {
                throw new Exception("$name missing", ERROR_PARAMETER_INVALID);
            }
            if (MAX_ACCOUNT_LENGTH < strlen($password)) {
                throw new Exception("$name $password too long", ERROR_PARAMETER_INVALID);
            }
            if (strlen($password) < MIN_ACCOUNT_LENGTH) {
                throw new Exception("$name $password too short", ERROR_PARAMETER_INVALID);
            }
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private static function ValidateInteger($integer, $name) {
        try {
            if (!isset($integer)) {
                throw new Exception("$name missing");
            }
            if ($integer == '') {
                throw new Exception("$name empty");
            }
            if (!preg_match('/^-?[\d]+$/', $integer)) {
                throw new Exception("$name not integer");
            }
            return intval($integer, 10);
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private static function ValidateIntegerEx($o, $name) {
        try {
            if (!isset($o->$name)) {
                throw new Exception("$name missing");
            }
            if ($o->$name == '') {
                throw new Exception("$name empty");
            }
            if (!preg_match('/^-?[\d]+$/', $o->$name)) {
                throw new Exception("$name not integer");
            }
            return intval($o->$name, 10);
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    // 認証
    private function Authenticate($o, $funcname) {
        try {
            $this->db->StartTransaction();
            self::ValidateAccount($o->_account, '_account');
            self::ValidatePassword($o->_password, '_password');
            $_account_ = DB::Quote($o->_account);
            $_password_ = DB::Quote($o->_password);
            $result = $this->db->Query("SELECT * FROM users WHERE account = $_account_ AND password = $_password_");
            $user = pg_fetch_object($result);
            if (!$user) {
                throw new Exception('account or password wrong', ERROR_ACCOUNT_OR_PASSWORD_WRONG);
            }
            $funcname_ = DB::Quote($funcname);
            $this->db->Query("INSERT INTO command_logs (user_id, command) VALUES ({$user->id}, $funcname_)");
            $this->db->Commit();
            return $user;
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    ////////////////////////////////////////////////////////////////////
    // API コマンドハンドラー

    // DB への書き込みを行わない場合は、DB::StartTransaction(), DB::Commit(), DB::Rollback() を呼ぶ必要は無いが、呼んでも害はほとんど無い。
    private function Generic($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);  // これが一番先
            $this->db->StartTransaction();
            /*
            ここでいろいろやる。
            */
            $this->db->Commit();
            return [];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    // HTTP 通信エラーへのクライアント側の例外処理のテストに使う
    private function GenerateHTTPError($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $status_code = DB::ValidateNaturalNumber($o, 'status_code', FALSE/*default value*/);
            $status_message_ = DB::ValidateString($o, 'status_message', FALSE/*default value*/, 32/*max length*/);
            $html_title_ = DB::ValidateString($o, 'html_title', FALSE/*default value*/, 64/*max length*/);
            $html_body_ = DB::ValidateLines($o, 'html_body', FALSE/*default value*/);
            self::SendHTTPErrorResponse($status_code, $status_message_, $html_title_, $html_body_);
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function LogConsoleAccessWrite($o) {
        try {
            $this->db->StartTransaction();
            // $remote_addr_ = DB::Quote($_SERVER['REMOTE_ADDR']);  これは常にローカルホストのパブリックIPアドレスなので無意味
            if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
                $http_x_forwarded_for_array = preg_split('/, */', $_SERVER['HTTP_X_FORWARDED_FOR']);
                if (!is_array($http_x_forwarded_for_array) && empty($http_x_forwarded_for_array)) {
                    VarDump('HTTP_X_FORWARDED_FOR malformed: $http_x_forwarded_for_array', $http_x_forwarded_for_array);
                    throw new Exception('HTTP_X_FORWARDED_FOR malformed');
                }
                $remote_addr_ = DB::Quote($http_x_forwarded_for_array[0]);  // remote_addr は $_SERVER['REMOTE_ADDR'] ではなく X-FORWARDED-FOR の先頭。
                $http_x_forwarded_for_ = DB::Quote($_SERVER['HTTP_X_FORWARDED_FOR']);
            } else {
                VarDump('HTTP_X_FORWARDED_FOR missing: $_SERVER["REMOTE_ADDR"]', $_SERVER['REMOTE_ADDR']);
                throw new Exception('HTTP_X_FORWARDED_FOR missing');
            }
            $_server_digest = [
                'SCRIPT_FILENAME' => $_SERVER['SCRIPT_FILENAME'],
                'REQUEST_SCHEME' => $_SERVER['REQUEST_SCHEME'],
                'SERVER_ADDR' => $_SERVER['SERVER_ADDR'],
                'SERVER_NAME' => $_SERVER['SERVER_NAME'],
                'HTTP_X_FORWARDED_HOST' => $_SERVER['HTTP_X_FORWARDED_HOST']
            ];
            $_server_json_ = DB::Quote(json_encode($_server_digest, JSON_UNESCAPED_UNICODE));
            $user_json_ = DB::Quote(json_encode($o->user, JSON_UNESCAPED_UNICODE));
            $sql = <<<SQL
INSERT INTO console_access_logs (
remote_addr,
http_x_forwarded_for,
_server_json,
user_json
) VALUES (
$remote_addr_,
$http_x_forwarded_for_,
$_server_json_,
$user_json_
) RETURNING *
SQL;
            $result = $this->db->Query($sql);
            $console_access_log = pg_fetch_object($result);
            $this->db->Commit();
            return $console_access_log;
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function LogConsoleAccess($o) {
        try {
            ////////////////////////////////////////////////////////////
            // ログを DB に書き込む

            if (isset($o->user) && $o->user->type != USER_TYPE_ADMIN && isset($o->log) && $o->log) {
                $console_access_log = $this->LogConsoleAccessWrite($o);
                // LINE でサポートチームに通知する。
                $console_access_log->_server_json = json_decode($console_access_log->_server_json);
                $console_access_log->user_json = json_decode($console_access_log->user_json);
                $console_access_log->user_json->password = '********';
                $message = "You have a visitor\n";
                $message .= str_replace('"', '', json_encode($console_access_log, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
                require_once('./lib/line.php');
                $line = new LINE();
                $line->SendToSupportTeam($message);
            }

            ////////////////////////////////////////////////////////////
            // あちこちの Dashboard に表示されているユーザー数、サブスクリプション数、訪問者数を返す。

            // ユーザー数
            $result = $this->db->Query('SELECT COUNT(*) FROM users WHERE type IN(1, 2)');
            $row_ = pg_fetch_row($result);
            if (!is_array($row_)) {
                throw new Exception('can\'t count users');
            }
            $user_count = $row_[0];

            // サブスクリプション数
            $result = $this->db->Query('SELECT COUNT(*) FROM subscriptions');
            $row_ = pg_fetch_row($result);
            if (!is_array($row_)) {
                throw new Exception('can\'t count subscriptions');
            }
            $subscription_count = $row_[0];

            // ページビュー総数。「総数」と「延べ数」は異なる概念のはずだが、Google はどちらも "total number" と訳す。
            $result = $this->db->Query('SELECT COUNT(*) FROM console_access_logs');
            $row_ = pg_fetch_row($result);
            if (!is_array($row_)) {
                throw new Exception('can\'t count total views');
            }
            $total_view_count = $row_[0];

            // 異なり訪問者数。
            $result = $this->db->Query('SELECT COUNT(*) FROM (SELECT COUNT(*) FROM console_access_logs GROUP BY http_x_forwarded_for) AS subq');
            $row_ = pg_fetch_row($result);
            if (!is_array($row_)) {
                throw new Exception('can\'t count different visitors');
            }
            $total_visitor_count = $row_[0];

            // 異なりリピーター数。
            $result = $this->db->Query('SELECT COUNT(*) FROM (SELECT COUNT(*) AS view_count FROM console_access_logs GROUP BY http_x_forwarded_for) AS subq WHERE 1 < subq.view_count');
            $row_ = pg_fetch_row($result);
            if (!is_array($row_)) {
                throw new Exception('can\'t count different repeating visitors');
            }
            $returned_visitor_count = $row_[0];

            return [
                'user_count' => $user_count,
                'subscription_count' => $subscription_count,
                'total_view_count' => $total_view_count,
                'total_visitor_count' => $total_visitor_count,
                'returned_visitor_count' => $returned_visitor_count
            ];

        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    /*
    ログインする。
    $o->_account    現在のアカウント
    $o->_password   そのパスワード
    $o->account     ログインしたいアカウント
    $o->password    そのパスワード
    */
    private function Login($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            self::ValidateAccount($o->account, 'account');
            self::ValidatePassword($o->password, 'password');
            $account_ = DB::Quote($o->account);
            $result = $this->db->Query("SELECT * FROM users WHERE account = $account_");
            $user = pg_fetch_object($result);
            if (!$user) {
                /*
                このエラーはユーザーには見せない。
                クライアントは、このエラーを受け取ると create_account コマンドを呼ぶ。
                つまり、その場合、login コマンドはアカウントが未登録であることを確認するために使われる。
                */
                throw new Exception("account {$o->account} unknown", ERROR_USER_UNKNOWN);
            }
            if ($user->password != $o->password) {
                throw new Exception('account or password wrong', ERROR_ACCOUNT_OR_PASSWORD_WRONG);
            }
            return ['user' => $user];
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function CreateAccount($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            self::ValidateInteger($o->type, 'type');
            self::ValidateAccount($o->account, 'account');
            self::ValidatePassword($o->password, 'password');
            $type = intval($o->type, 10);
            $account_ = DB::Quote($o->account);
            $password_ = DB::Quote($o->password);
            $result = $this->db->Query("INSERT INTO users (type, account, password) VALUES ($type, $account_, $password_) RETURNING *");
            $user = pg_fetch_object($result);
            $this->db->Commit();
            return ['user' => $user];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function LoadPayPalPlanTemplates($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            $result = $this->db->Query('SELECT * FROM paypal_plan_templates');
            $paypal_plan_templates = [];
            for (; $paypal_plan_template = pg_fetch_object($result); ) {
                $paypal_plan_templates[] = $paypal_plan_template;
            }
            return ['paypal_plan_templates' => $paypal_plan_templates];
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function SavePayPalPlanTemplate($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            $id_ = DB::ValidateNaturalNumber($o, 'id', NULL/*default value*/);
            $name_ = DB::ValidateString($o, 'name', FALSE/*default value*/, 127/*max length*/);
            $description_ = DB::ValidateLines($o, 'description', FALSE/*default value*/, 127/*max length*/);
            $js_code_ = DB::ValidateLines($o, 'js_code', FALSE/*default value*/);
            $memo_ = DB::ValidateLines($o, 'memo', NULL/*default value*/);
            if (isset($id_)) {
                $this->db->Query("UPDATE paypal_plan_templates SET name = $name_, description = $description_, js_code = $js_code_, memo = $memo_, updated_at = NOW() WHERE id = $id_");
            } else {
                $this->db->Query("INSERT INTO paypal_plan_templates (name, description, js_code, memo) VALUES ($name_, $description_, $js_code_, $memo_)");
            }
            $this->db->Commit();
            $result = $this->db->Query('SELECT * FROM paypal_plan_templates');
            $paypal_plan_templates = [];
            for (; $paypal_plan_template = pg_fetch_object($result); ) {
                $paypal_plan_templates[] = $paypal_plan_template;
            }
            return ['paypal_plan_templates' => $paypal_plan_templates];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function LoadSubscriptions($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            if ($current_user->type == USER_TYPE_ADMIN) {
                $result = $this->db->Query("SELECT * FROM subscriptions");
            } else if ($current_user->type == USER_TYPE_PARENT) {
                $result = $this->db->Query("SELECT * FROM subscriptions WHERE user_id = {$current_user->id}");
            } else {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            $subscriptions = [];
            for (; $subscription = pg_fetch_object($result); ) {
                $subscriptions[] = $subscription;
            }
            return ['subscriptions' => $subscriptions];
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function AddSubscription($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
/*
                paypal_plan_id: PayPal.getCurrent().plan_id,
                paypal_subscription_id: data.subscriptionID,
                host_name: host_name,
                paypal_subscription: <object>
*/
            $paypal_plan_id_ = DB::ValidateString($o, 'paypal_plan_id', FALSE/*default value*/, 50/*max length*/);
            $paypal_subscription_id_ = DB::ValidateString($o, 'paypal_subscription_id', FALSE/*default value*/, 50/*max length*/);
            $host_name_ = DB::ValidateString($o, 'host_name', FALSE/*default value*/, 128/*max length*/);
            if (!isset($o->paypal_subscription)) {
                throw new Exception('paypal_subscription missing');
            }
            if (!is_object($o->paypal_subscription)) {
                throw new Exception('paypal_subscription not an object');
            }
            $status_ = DB::ValidateString($o->paypal_subscription, 'status', FALSE/*default value*/, 24/*max length*/);
            $starting_at_ = DB::ValidateString($o->paypal_subscription, 'start_time', FALSE/*default value*/, 20/*max length*/);
            $paypal_subscription_ = DB::Quote(json_encode($o->paypal_subscription));
            $sql = <<<SQL
INSERT INTO subscriptions (
user_id,
paypal_plan_id,
paypal_subscription_id,
host_name,
status,
starting_at,
paypal_subscription
) VALUES (
{$current_user->id},
$paypal_plan_id_,
$paypal_subscription_id_,
$host_name_,
$status_,
$starting_at_,
$paypal_subscription_
) RETURNING *
SQL;
            $result = $this->db->Query($sql);
            $subscription = pg_fetch_object($result);
            $created_at_ = DB::Quote($subscription->created_at);
            $sql2 = <<<SQL2
INSERT INTO subscription_logs (
subscription_id,
status,
status_changed_at
) VALUES (
{$subscription->id},
$status_,
$created_at_
)
SQL2;
            $this->db->Query($sql2);
            $this->db->Commit();
            $result = $this->db->Query("SELECT * FROM subscriptions WHERE user_id = {$current_user->id}");
            $subscriptions = [];
            for (; $subscription = pg_fetch_object($result); ) {
                $subscriptions[] = $subscription;
            }
            return ['subscriptions' => $subscriptions];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    /*
    $o: {
        subscription_id: <integer>
        paypal_subscription: <object>
    }
    */
    private function UpdateSubscription($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            $id_ = DB::ValidateNaturalNumber($o, 'subscription_id', FALSE/*Default value. Unlike NULL, FALSE means "Throw an Exception if the variable (in this case 'id') is not set".*/);
            if (!isset($o->paypal_subscription)) {
                throw new Exception('paypal_subscription missing');
            }
            if (!is_object($o->paypal_subscription)) {
                throw new Exception('paypal_subscription not an object');
            }
            $status_ = DB::ValidateString($o->paypal_subscription, 'status', FALSE/*default value*/, 24/*max length*/);
            $starting_at_ = DB::ValidateString($o->paypal_subscription, 'start_time', FALSE/*default value*/, 20/*max length*/);
            $paypal_subscription_ = DB::Quote(json_encode($o->paypal_subscription));
            $sql = <<<SQL
UPDATE subscriptions SET
status = $status_,
starting_at = $starting_at_,
paypal_subscription = $paypal_subscription_,
updated_at = NOW()
WHERE id = $id_
AND
(
    --// status も start_time も同じならば更新しない
    status != $status_
    OR starting_at != $starting_at_
)
RETURNING *
SQL;
            $result = $this->db->Query($sql);
            $subscription = pg_fetch_object($result);
            if (!$subscription) {   // 更新されなかった場合は FALSE が返されるので、!isset($subscription) ではなく !$subscription とする。
                throw new Exception('no need to update', ERROR_NOP);
            }
            $updated_at_ = DB::Quote($subscription->updated_at);
            $sql2 = <<<SQL2
INSERT INTO subscription_logs (
subscription_id,
status,
status_changed_at
) VALUES (
{$subscription->id},
$status_,
$updated_at_
)
SQL2;
            $this->db->Query($sql2);
            $this->db->Commit();
            return ['subscription' => $subscription];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function LoadSupportCaseMessages($support_case) {
        try {
            $support_case->support_case_messages = [];
            $result2 = $this->db->Query("SELECT * FROM support_case_messages WHERE support_case_id = {$support_case->id} ORDER BY id ASC");
            for (; $support_case_message = pg_fetch_object($result2); ) {
                $support_case_message->support_case_attachments = [];
                // 毎度 file_content を取得するのは通信と時間の無駄遣いなので、file_content だけは別の API コマンドで取得する。
                $result3 = $this->db->Query("SELECT id, support_case_message_id, file_name, file_size FROM support_case_attachments WHERE support_case_message_id = {$support_case_message->id} ORDER BY id ASC");
                for (; $support_case_attachment = pg_fetch_object($result3); ) {
                    $support_case_message->support_case_attachments[] = $support_case_attachment;
                }
                $support_case->support_case_messages[] = $support_case_message;
            }
            return $support_case;
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function LoadSupportCasesByUserId($user_id) {
        try {
            $result = $this->db->Query("SELECT * FROM support_cases WHERE user_id = $user_id ORDER BY id ASC");
            $support_cases = [];
            for (; $support_case = pg_fetch_object($result); ) {
                $support_cases[] = $this->LoadSupportCaseMessages($support_case);
            }
            return $support_cases;
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function LoadSupportCases($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $result = $this->db->Query("SELECT * FROM support_cases WHERE user_id = {$current_user->id} ORDER BY id ASC");
            $support_cases = [];
            for (; $support_case = pg_fetch_object($result); ) {
                $support_cases[] = $this->LoadSupportCaseMessages($support_case);
            }
            return ['support_cases' => $support_cases];
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    // サポートケースのメッセージを作成する。最初のメッセージならサポートケースも作成する。
    private function SaveSupportCase($o, $files, $current_user) {
        try {
            $direction_ = self::ValidateInteger($o->direction, 'direction');
            $in_response_to_ = self::ValidateInteger($o->in_response_to, 'in_response_to');

            // 最初の登録（既存のケースに関する応答ではなく、新しいケースを作ろうとしている）
            if ($in_response_to_ == 0) {
                // ケースを登録
                $subject_ = DB::ValidateString($o, 'subject', FALSE/*default value*/, 128/*max length*/);
                $sql1 = <<<SQL1
INSERT INTO support_cases (
user_id,
status,
subject
) VALUES (
{$current_user->id},
'Opened',
$subject_
) RETURNING *
SQL1;
                $result = $this->db->Query($sql1);
                $support_case = pg_fetch_object($result);   // これが FALSE になるような事態が発生すれば例外が飛ぶので、返却値をチェックする必要は無い（はず）。
            // 既存のケースに対する応答を作ろうとしている
            } else {
                $sql11 = <<<SQL11
SELECT c.*
FROM support_cases AS c, support_case_messages AS i
WHERE c.id = i.support_case_id
AND i.id = $in_response_to_
SQL11;
                $result = $this->db->Query($sql11);
                $support_case = pg_fetch_object($result);
                if (!$support_case) {
                    throw new Exception(sprintf("DB::Query() returned FALSE for query:\n%s\n", $sql11));
                }
                if ($direction_ == 0) {
                    $status_ = DB::Quote('Waiting for Support Team\'s Response');
                } else {
                    $status_ = DB::Quote('Waiting for User\'s Response');
                }
                $result = $this->db->Query("UPDATE support_cases SET status = $status_, updated_at = NOW() WHERE id = {$support_case->id} RETURNING *");
                $support_case = pg_fetch_object($result);
            }

            // ケースのインタラクションを登録
            $message_ = DB::ValidateLines($o, 'message', FALSE/*default value*/, 1024 * 128/*max length*/);
            $sql2 = <<<SQL2
INSERT INTO support_case_messages (
support_case_id,
direction,
in_response_to,
message
) VALUES (
{$support_case->id},
$direction_,
$in_response_to_,
$message_
) RETURNING *
SQL2;
            $result = $this->db->Query($sql2);
            $support_case_message = pg_fetch_object($result);   // これが FALSE になるような事態が発生すれば例外が飛ぶので、返却値をチェックする必要は無い（はず）。

            // 添付ファイルを登録（データの大きさはクライアント側でチェック済み。とりあえず合計最大 1 MB。
            $support_case_attachments = [];
            foreach ($files as $name => $file) {
                //VarDump('$file', $file);
                $file_name_ = DB::Quote($file['name']);
                $file_size = $file['size'];
                $file_content = file_get_contents($file['tmp_name']);
                $file_content_base64 = base64_encode($file_content);
                $file_content_base64_ = DB::Quote($file_content_base64);
                $sql3 = <<<SQL3
INSERT INTO support_case_attachments (
support_case_message_id,
file_name,
file_size,
file_content
) VALUES (
{$support_case_message->id},
$file_name_,
$file_size,
$file_content_base64_
)
SQL3;
                $this->db->Query($sql3);
                $support_case_attachments[] = [
                    'file_name' => $file['name'],
                    'file_size' => $file['size']
                ];
            }

            // 既存のケースへの応答である場合、support_cases.updated_at を更新
            if ($in_response_to_ != 0) {
                $this->db->Query("UPDATE support_cases SET updated_at = NOW() WHERE id = {$support_case->id}");
            }

            return [
                'support_case' => $support_case,
                'support_case_message' => $support_case_message,
                'support_case_attachments' => $support_case_attachments
            ];
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    // ユーザーがサポートケースのメッセージを作成する。最初のメッセージならサポートケースも作成する。
    private function CreateSupportCaseMessage($o, $files) {
        $committed = FALSE;
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            $support_case_info = $this->SaveSupportCase($o, $files, $current_user);
            // カレントユーザーのサポートケースを全て取得
            $support_cases = $this->LoadSupportCasesByUserId($current_user->id);
            // TODO: ここから。↑こういうふうに全てのケースをロードするのをやめる。
            // コミット
            $this->db->Commit();
            $committed = TRUE;
            // LINE で管理者に通知
            $what = $o->in_response_to == 0 ? 'ケース' : 'ケースメッセージ';
            $console_support_page_uri = GetConsoleSupportPageURI();
            $support_case_info_pretty_text = Misc::object_to_pretty_text($support_case_info);
            $message = <<<MESSAGE
サポート{$what}が作成されました。
管理画面：$console_support_page_uri
ユーザー名：{$current_user->account}
ユーザーID：{$current_user->id}
サポートケース情報：$support_case_info_pretty_text
MESSAGE;
            require_once('./lib/line.php');
            $line = new LINE();
            //$line->SendTo($message, LINE_USER_ID_KISABURO);
            $line->SendToSupportTeam($message);
            return ['support_cases' => $support_cases];
        } catch (Exception $e) {
            if (!$committed) {
                $this->db->Rollback();
            }
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function DownloadSupportCaseAttachment($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $support_case_attachment_id = DB::ValidateNaturalNumber($o, 'support_case_attachment_id', FALSE/*Default value. Unlike NULL, FALSE means "Throw an Exception if the variable (in this case 'subscription_id') is not set".*/);
            $sql = <<<SQL
SELECT a.*
FROM
support_case_attachments AS a,
support_case_messages AS i,
support_cases AS s
WHERE a.id = $support_case_attachment_id
AND a.support_case_message_id = i.id
AND i.support_case_id = s.id
AND s.user_id = {$current_user->id}
SQL;
            $result = $this->db->Query($sql);
            $support_case_attachment = pg_fetch_object($result);
            if (!$support_case_attachment) {
                throw new Exception('support case attachment not found');
            }
            $file_content = base64_decode($support_case_attachment->file_content);
            header('Content-Type: application/octet-stream');
            header('X-Content-Type-Options: nosniff');
            header('Content-Length: ' . strlen($file_content));
            header('Content-Disposition: attachment; filename="' . $support_case_attachment->file_name . '"');
            header('Connection: close');
            if (ob_get_level()) {
                ob_end_clean();
            }
            echo $file_content;
            exit(0);
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    // ユーザーがサポートケースを閉じる
    private function CloseSupportCase($o) {
        $committed = FALSE;
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            $support_case_id_ = self::ValidateIntegerEx($o, 'support_case_id');
            $result = $this->db->Query("SELECT * FROM support_cases WHERE id = $support_case_id_ AND user_id = {$current_user->id}");
            $support_case = pg_fetch_object($result);
            if (!$support_case) {
                throw new Exception("support_cases record with id $support_case_id_ not found or not yours");
            }
            $status_ = DB::Quote('Closed');
            $result = $this->db->Query("UPDATE support_cases SET status = $status_, updated_at = NOW() WHERE id = {$support_case->id} RETURNING *");
            $support_case = pg_fetch_object($result);
            $support_case = $this->LoadSupportCaseMessages($support_case);
            // コミット
            $this->db->Commit();
            $committed = TRUE;
            // LINE で管理者に通知
            $console_support_page_uri = GetConsoleSupportPageURI();
            $support_case_pretty_text = Misc::object_to_pretty_text($support_case);
            $message = <<<MESSAGE
サポートケースがクローズされました。
管理画面：$console_support_page_uri
ユーザー名：{$current_user->account}
ユーザーID：{$current_user->id}
サポートケース：$support_case_pretty_text
MESSAGE;
            require_once('./lib/line.php');
            $line = new LINE();
            //$line->SendTo($message, LINE_USER_ID_KISABURO);
            $line->SendToSupportTeam($message);
            return ['support_case' => $support_case];
        } catch (Exception $e) {
            if (!$committed) {
                $this->db->Rollback();
            }
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    // ユーザーがサポートケースを再開する。
    private function ReopenSupportCase($o) {
        $committed = FALSE;
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            $support_case_id_ = self::ValidateIntegerEx($o, 'support_case_id');
            $result = $this->db->Query("SELECT * FROM support_cases WHERE id = $support_case_id_ AND user_id = {$current_user->id}");
            $support_case = pg_fetch_object($result);
            if (!$support_case) {
                throw new Exception("support_cases record with id $support_case_id_ not found or not yours");
            }
            $status_ = DB::Quote('Opened');
            $result = $this->db->Query("UPDATE support_cases SET status = $status_, updated_at = NOW() WHERE id = {$support_case->id} RETURNING *");
            $support_case = pg_fetch_object($result);
            $support_case = $this->LoadSupportCaseMessages($support_case);
            // コミット
            $this->db->Commit();
            $committed = TRUE;
            // LINE で管理者に通知
            $console_support_page_uri = GetConsoleSupportPageURI();
            $support_case_pretty_text = Misc::object_to_pretty_text($support_case);
            $message = <<<MESSAGE
サポートケースがリオープンされました。
管理画面：$console_support_page_uri
ユーザー名：{$current_user->account}
ユーザーID：{$current_user->id}
サポートケース：$support_case_pretty_text
MESSAGE;
            require_once('./lib/line.php');
            $line = new LINE();
            //$line->SendTo($message, LINE_USER_ID_KISABURO);
            $line->SendToSupportTeam($message);
            return ['support_case' => $support_case];
        } catch (Exception $e) {
            if (!$committed) {
                $this->db->Rollback();
            }
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function DeleteSupportCase($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            $support_case_id = DB::ValidateNaturalNumber($o, 'support_case_id', FALSE/*Default value. Unlike NULL, FALSE means "Throw an Exception if the variable (in this case 'subscription_id') is not set".*/);
            $result = $this->db->Query("DELETE FROM support_cases WHERE id = $support_case_id RETURNING *");
            $support_case = pg_fetch_object($result);
            if (!$support_case) {
                throw new Exception("support_cases record with id $support_case_id not found");
            }
            $result = $this->db->Query("DELETE FROM support_case_messages WHERE support_case_id = {$support_case->id} RETURNING id");
            $support_case_message_ids = pg_fetch_all_columns($result, 0);
            $support_case_message_id_csv = implode(',', $support_case_message_ids);
            $this->db->Query("DELETE FROM support_case_attachments WHERE support_case_message_id IN($support_case_message_id_csv)");
            $this->db->Commit();
            return ['support_case' => $support_case];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function AdminLoadUserInfo($user) {
        try {
            $user->subscriptions = [];
            $result2 = $this->db->Query("SELECT * FROM subscriptions WHERE user_id = {$user->id}");
            for (; $subscription = pg_fetch_object($result2); ) {
                $user->subscriptions[] = $subscription;
            }
            $user->support_cases = [];
            $result3 = $this->db->Query("SELECT * FROM support_cases WHERE user_id = {$user->id}");
            for (; $support_case = pg_fetch_object($result3); ) {
                $support_case->support_case_messages = [];
                $result4 = $this->db->Query("SELECT * FROM support_case_messages WHERE support_case_id = {$support_case->id}");
                for (; $support_case_message = pg_fetch_object($result4); ) {
                    $support_case->support_case_messages[] = $support_case_message;
                }
                $user->support_cases[] = $support_case;
            }
            return $user;
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function AdminLoadUsers($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            $users = [];
            $result1 = $this->db->Query('SELECT * FROM users');
            for (; $user = pg_fetch_object($result1); ) {
                $user = $this->AdminLoadUserInfo($user);
                $users[] = $user;
            }
            return ['users' => $users];
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function AdminLoadSupportCases($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            $user_id_ = DB::ValidateNaturalNumber($o, 'user_id', FALSE/*Default value. Unlike NULL, FALSE means "Throw an Exception if the variable (in this case 'subscription_id') is not set".*/);
/*
            $result = $this->db->Query("SELECT * FROM support_cases WHERE user_id = $user_id_ ORDER BY id ASC");
            $support_cases = [];
            for (; $support_case = pg_fetch_object($result); ) {
                $support_case->support_case_messages = [];
                $result2 = $this->db->Query("SELECT * FROM support_case_messages WHERE support_case_id = {$support_case->id} ORDER BY id ASC");
                for (; $support_case_message = pg_fetch_object($result2); ) {
                    $support_case_message->support_case_attachments = [];
                    // 毎度 file_content を取得するのは通信と時間の無駄遣いなので、file_content だけは別の API コマンドで取得する。
                    $result3 = $this->db->Query("SELECT id, support_case_message_id, file_name, file_size FROM support_case_attachments WHERE support_case_message_id = {$support_case_message->id} ORDER BY id ASC");
                    for (; $support_case_attachment = pg_fetch_object($result3); ) {
                        $support_case_message->support_case_attachments[] = $support_case_attachment;
                    }
                    $support_case->support_case_messages[] = $support_case_message;
                }
                $support_cases[] = $support_case;
            }
*/
            $support_cases = $this->LoadSupportCasesByUserId($user_id_);
            return ['support_cases' => $support_cases];
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    // システム管理者がサポートケースのメッセージを作成する。最初のメッセージならサポートケースも作成する。
    private function AdminCreateSupportCaseMessage($o, $files) {
        try {
            //VarDump('$o', $o);
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            $support_case_info = $this->SaveSupportCase($o, $files, $current_user);
            $support_case = $support_case_info['support_case'];
            $support_cases = $this->LoadSupportCasesByUserId($support_case->user_id);

            // コミット
            $this->db->Commit();

            return ['support_cases' => $support_cases];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function AdminDownloadSupportCaseAttachment($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            $support_case_attachment_id = DB::ValidateNaturalNumber($o, 'support_case_attachment_id', FALSE/*Default value. Unlike NULL, FALSE means "Throw an Exception if the variable (in this case 'subscription_id') is not set".*/);
            $sql = <<<SQL
SELECT a.*
FROM
support_case_attachments AS a,
support_case_messages AS i,
support_cases AS s
WHERE a.id = $support_case_attachment_id
AND a.support_case_message_id = i.id
AND i.support_case_id = s.id
SQL;
            $result = $this->db->Query($sql);
            $support_case_attachment = pg_fetch_object($result);
            if (!$support_case_attachment) {
                throw new Exception('support case attachment not found');
            }
            $file_content = base64_decode($support_case_attachment->file_content);
            header('Content-Type: application/octet-stream');
            header('X-Content-Type-Options: nosniff');
            header('Content-Length: ' . strlen($file_content));
            header('Content-Disposition: attachment; filename="' . $support_case_attachment->file_name . '"');
            header('Connection: close');
            if (ob_get_level()) {
                ob_end_clean();
            }
            echo $file_content;
            exit(0);
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function AdminCloseSupportCase($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            $support_case_id = DB::ValidateNaturalNumber($o, 'support_case_id', FALSE/*Default value. Unlike NULL, FALSE means "Throw an Exception if the variable (in this case 'subscription_id') is not set".*/);
            $result = $this->db->Query("UPDATE support_cases SET status = 'Closed', updated_at = NOW() WHERE id = $support_case_id RETURNING *");
            $support_case = pg_fetch_object($result);
            if (!$support_case) {
                throw new Exception("support_cases record with id $support_case_id not found");
            }
            $result = $this->db->Query("SELECT * FROM users WHERE id = {$support_case->user_id}");
            $user = pg_fetch_object($result);
            if (!$user) {
                throw new Exception("users record with id {$support_case->user_id} not found");
            }
            $user = $this->AdminLoadUserInfo($user);
            $this->db->Commit();
            return ['user' => $user];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function AdminReopenSupportCase($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            $support_case_id = DB::ValidateNaturalNumber($o, 'support_case_id', FALSE/*Default value. Unlike NULL, FALSE means "Throw an Exception if the variable (in this case 'subscription_id') is not set".*/);
            $result = $this->db->Query("UPDATE support_cases SET status = 'Opened', updated_at = NOW() WHERE id = $support_case_id RETURNING *");
            $support_case = pg_fetch_object($result);
            if (!$support_case) {
                throw new Exception("support_cases record with id $support_case_id not found");
            }
            $result = $this->db->Query("SELECT * FROM users WHERE id = {$support_case->user_id}");
            $user = pg_fetch_object($result);
            if (!$user) {
                throw new Exception("users record with id {$support_case->user_id} not found");
            }
            $user = $this->AdminLoadUserInfo($user);
            $this->db->Commit();
            return ['user' => $user];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function AdminDeleteSupportCase($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            $support_case_id = DB::ValidateNaturalNumber($o, 'support_case_id', FALSE/*Default value. Unlike NULL, FALSE means "Throw an Exception if the variable (in this case 'subscription_id') is not set".*/);
            $result = $this->db->Query("DELETE FROM support_cases WHERE id = $support_case_id RETURNING *");
            $support_case = pg_fetch_object($result);
            if (!$support_case) {
                throw new Exception("support_cases record with id $support_case_id not found");
            }
            $result = $this->db->Query("DELETE FROM support_case_messages WHERE support_case_id = {$support_case->id} RETURNING id");
            $support_case_message_ids = pg_fetch_all_columns($result, 0);
            $support_case_message_id_csv = implode(',', $support_case_message_ids);
            $this->db->Query("DELETE FROM support_case_attachments WHERE support_case_message_id IN($support_case_message_id_csv)");
            $result = $this->db->Query("SELECT * FROM users WHERE id = {$support_case->user_id}");
            $user = pg_fetch_object($result);
            if (!$user) {
                throw new Exception("users record with id {$support_case->user_id} not found");
            }
            $user = $this->AdminLoadUserInfo($user);
            $this->db->Commit();
            return ['user' => $user];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function UploadPage($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            /*
            $uri = parse_url($o->uri);
            if (!$uri) {
                throw new Exception('invaid uri');
            }
            Array
            (
                [scheme] => http
                [host] => hostname
                [port] => 8080
                [user] => username
                [pass] => password
                [path] => /path
                [query] => arg=value
                [fragment] => anchor
            )
            */
            $uri_ = DB::ValidateString($o, 'uri', FALSE/*default value*/, 2048/*max length*/);
            $html_ = DB::ValidateLines($o, 'html', FALSE/*default value*/, 1048 * 1048/*max length*/);
            //VarDump('$o->html', $o->html);
            $result = $this->db->Query("SELECT * FROM web_pages WHERE user_id = {$current_user->id} AND uri = $uri_");
            $web_page = pg_fetch_object($result);
            if ($web_page) {
                $result = $this->db->Query("UPDATE web_pages SET html = $html_, updated_at = NOW() WHERE id = {$web_page->id} RETURNING *");
            } else {
                $result = $this->db->Query("INSERT INTO web_pages (user_id, uri, html) VALUES ({$current_user->id}, $uri_, $html_) RETURNING *");
            }
            $web_page = pg_fetch_object($result);
            $this->db->Commit();
            return [];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function ListPages($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $result = $this->db->Query("SELECT * FROM web_pages WHERE user_id = {$current_user->id} ORDER BY uri ASC");
            $web_pages = [];
            for (; $web_page = pg_fetch_object($result); ) {
                $web_page->html = intval(strlen($web_page->html) / 1024, 10) . 'KB';
                $web_pages[] = $web_page;
            }
            return ['web_pages' => $web_pages];
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function DownloadPage($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            //$uri_ = DB::ValidateString($o, 'uri', FALSE/*default value*/, 2048/*max length*/);
            $web_page_id = DB::ValidateNaturalNumber($o, 'web_page_id', FALSE/*Default value. Unlike NULL, FALSE means "Throw an Exception if the variable (in this case 'subscription_id') is not set".*/);
            $result = $this->db->Query("SELECT * FROM web_pages WHERE id = $web_page_id AND user_id = {$current_user->id}");
            $web_page = pg_fetch_object($result);
            if (!$web_page) {
                throw new Exception('web page not found');
            }
            return ['web_page' => $web_page];
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    public function Respond($p) {
        $o = Misc::array_to_object($p);
        if (!isset($o->_command)) {
            throw new Exception('command missing');
        }
        if (64 < strlen($o->_command)) {
            throw new Exception('command too long');
        }
        if (!preg_match('/^[a-z_]+$/', $o->_command)) {
            throw new Exception('command invalid');
        }
        switch ($o->_command) {
        case 'generic':
            $response = $this->Generic($o);
            break;
        case 'generate_http_error':
            $this->GenerateHTTPError($o);
            break;
        case 'log_console_access':
            $response = $this->LogConsoleAccess($o);
            break;
        case 'login':
            $response = $this->Login($o);
            break;
        case 'create_account':
            $response = $this->CreateAccount($o);
            break;
        case 'load_paypal_plan_templates':
            $response = $this->LoadPayPalPlanTemplates($o);
            break;
        case 'save_paypal_plan_templates':
            $response = $this->SavePayPalPlanTemplate($o);
            break;
        case 'load_subscriptions':
            $response = $this->LoadSubscriptions($o);
            break;
        case 'add_subscription':
            $response = $this->AddSubscription($o);
            break;
        case 'update_subscription':
            $response = $this->UpdateSubscription($o);
            break;
        case 'load_support_cases':
            $response = $this->LoadSupportCases($o);
            break;
        case 'create_support_case_message':
            $response = $this->CreateSupportCaseMessage($o, $_FILES);
            break;
        case 'download_support_case_attachment':
            $response = $this->DownloadSupportCaseAttachment($o);
            break;
        case 'close_support_case':
            $response = $this->CloseSupportCase($o);
            break;
        case 'reopen_support_case':
            $response = $this->ReopenSupportCase($o);
            break;
        case 'delete_support_case':
            $response = $this->DeleteSupportCase($o);
            break;
        case 'admin_load_users':
            $response = $this->AdminLoadUsers($o);
            break;
        case 'admin_load_support_cases':
            $response = $this->AdminLoadSupportCases($o);
            break;
        case 'admin_create_support_case_message':
            $response = $this->AdminCreateSupportCaseMessage($o, $_FILES);
            break;
        case 'admin_download_support_case_attachment':
            $response = $this->AdminDownloadSupportCaseAttachment($o);
            break;
        case 'admin_close_support_case':
            $response = $this->AdminCloseSupportCase($o);
            break;
        case 'admin_reopen_support_case':
            $response = $this->AdminReopenSupportCase($o);
            break;
        case 'admin_delete_support_case':
            $response = $this->AdminDeleteSupportCase($o);
            break;
        case 'upload_page':
            $response = $this->UploadPage($o);
            break;
        case 'list_pages':
            $response = $this->ListPages($o);
            break;
        case 'download_page':
            $response = $this->DownloadPage($o);
            break;
        default:
            throw new Exception("unknown command {$o->_command}");
        }
        return $response;
    }
}

try {
    $server = new Server();
    $response = $server->Respond($_REQUEST);
    $response['status'] = 'success';
} catch (Exception $e) {
    //VarDump('$e', $e);
    VarDump('$e->getMessage()', $e->getMessage());
    $response = array(
        'status' => 'error',
        'message' => $e->getMessage(),
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
echo "\n";

exit(0);

?>
