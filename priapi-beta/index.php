<?php
/*
TCPDetective 内部 API
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

    // 任意のオブジェクトを javascript の定数の形式に変換する。
    // この関数は結局使っていない。
    private static function ObjectToJSCode($o) {
        try {
            $pretty_json = json_encode($o, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            if ($pretty_json === FALSE) {
                throw new Exception('json_encode returned FALSE');
            }
            $jscode = preg_replace('/"([A-Za-z_][0-9A-Za-z_]+)":/', '$1:', $pretty_json);
            if ($jscode === NULL || $jscode === FALSE) {
                throw new Exception('preg_replace returned FALSE or NULL (0)');
            }
            $jscode = preg_replace('/"/', '\'', $jscode);
            if ($jscode === NULL || $jscode === FALSE) {
                throw new Exception('preg_replace returned FALSE or NULL (1)');
            }
            return $jscode;
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

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
            $this->db->StartTransaction();                          // これをやるなら必ず Authenticate() の直後でなければならない。さもないと Rollback() でエラーが発生する。
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
                'HTTP_X_FORWARDED_HOST' => $_SERVER['HTTP_X_FORWARDED_HOST'],
                'HTTP_USER_AGENT' => $_SERVER['HTTP_USER_AGENT']
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
                $message = "You have a visitor.\n";
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
    $o->_account    現在のアカウント（たいてい GUEST_ACCOUNT）
    $o->_password   そのパスワード（たいてい GUEST_PASSWORD）
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
                throw new Exception('password wrong', ERROR_PASSWORD_WRONG);
            }
            return ['user' => $user];
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function PayPalLoadConfig($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            if ($current_user->type == USER_TYPE_GUEST) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            require_once('./lib/paypal.php');
            $paypal = new PayPal($this->db);
            return $paypal->LoadConfig($o);
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function PayPalGetAccessToken($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            require_once('./lib/paypal.php');
            $paypal = new PayPal($this->db);
            $paypal_access_token = $paypal->GetAccessToken($o);
            $this->db->Commit();
            return [
                //'access_token' => $paypal_access_token->access_token,
                'access_token' => '****************',
                'expires_in' => $paypal_access_token->expires_in,
                'updated_at' => $paypal_access_token->updated_at
            ];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function InsertPayPalProduct(
        $product_current,   // 直前にPayPalから取得した製品データ
        $status             // その製品のステータス
    )
    {
        try {
            if (isset($status)) {
                $status_ = DB::Quote($status);
            } else {
                $status_ = DB::Quote('ACTIVE');
            }
            $app_id = PAYPAL_APP_ID;        // tcpdetective.com は、複数の PayPal アプリを扱えない。PayPal アプリは "Starship" と決め打ち。
            $product_id_ = DB::Quote($product_current->id);
            $product_json_ = DB::Quote(json_encode($product_current));
            $result = $this->db->Query("INSERT INTO paypal_products (status, app_id, product_id, product_json) VALUES ($status_, $app_id, $product_id_, $product_json_) RETURNING *");
            $paypal_product = pg_fetch_object($result);
            return $paypal_product;
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function UpdatePayPalProduct(
        $product_current,   // 直前にPayPalから取得した製品データ
        $status,            // その製品の新しいステータス
        $paypal_product     // その製品に対応する paypal_products のレコード
    )
    {
        try {
            // status 値の指定がある。
            if (isset($status)) {
                $status_ = DB::Quote($status);
            // status 値の指定が無い。
            } else {
                $product_saved = json_decode($paypal_product->product_json);
                // 直前に取得した製品のデータと DB に保存してあった製品のデータの更新日時が同じ
                if ($product_current->update_time == $product_saved->update_time) {
                    // DB のデータを更新しない。
                    return $paypal_product;
                }
                $status_ = 'status';    // つまり、status は今のまま。
            }
            $product_json_ = DB::Quote(json_encode($product_current));
            $result = $this->db->Query("UPDATE paypal_products SET status = $status_, product_json = $product_json_, updated_at = NOW() WHERE id = {$paypal_product->id} RETURNING *");
            $paypal_product = pg_fetch_object($result);
            return $paypal_product;
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function SavePayPalProduct($product, $status = NULL) {
        try {
            if (!isset($product->id)) {
                throw new Exception('id missing from paypal response');
            }
            $product_id_ = DB::Quote($product->id);
            $result = $this->db->Query("SELECT * FROM paypal_products WHERE product_id = $product_id_");
            $paypal_product = pg_fetch_object($result);
            if ($paypal_product) {
                $paypal_product = $this->UpdatePayPalProduct($product, $status, $paypal_product);
            } else {
                $paypal_product = $this->InsertPayPalProduct($product, $status);
            }
            return $paypal_product;
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function PayPalListProducts($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            require_once('./lib/paypal.php');
            $paypal = new PayPal($this->db);
            $products = $paypal->ListProducts($o);
            $paypal_products = [];
            foreach ($products->products as $product) {
                $product = $paypal->ShowProduct($product);              // PayPal::ShowProduct($o) は $o->id しか見ていないので、これで OK。
                $paypal_product = $this->SavePayPalProduct($product);
                $paypal_products[] = $paypal_product;
            }
            $this->db->Commit();
            return ['paypal_products' =>$paypal_products];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function PayPalShowProduct($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            require_once('./lib/paypal.php');
            $paypal = new PayPal($this->db);
            $paypal_response = $paypal->ShowProduct($o);
            $paypal_product = $this->SavePayPalProduct($paypal_response);
            $this->db->Commit();
            return ['paypal_product' => $paypal_product];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function PayPalUpdateProduct($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            require_once('./lib/paypal.php');
            $paypal = new PayPal($this->db);
            $paypal->UpdateProduct($o);                     // PayPal::UpdateProduct() は何も返さないので、
            $paypal_response = $paypal->ShowProduct($o);    // PayPal::ShowProduct() で取り直す。
            $paypal_product = $this->SavePayPalProduct($paypal_response);
            $this->db->Commit();
            return ['paypal_product' => $paypal_product];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function PayPalCreateProduct($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            require_once('./lib/paypal.php');
            $paypal = new PayPal($this->db);
            $paypal_response = $paypal->CreateProduct($o);
            $paypal_product = $this->SavePayPalProduct($paypal_response);
            $this->db->Commit();
            return ['paypal_product' => $paypal_product];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function PayPalDeactivateProduct($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            require_once('./lib/paypal.php');
            $paypal = new PayPal($this->db);
            $paypal_response = $paypal->ShowProduct($o);
            $paypal_product = $this->SavePayPalProduct($paypal_response, 'INACTIVE');
            $paypal_response = json_decode(json_encode($paypal_response), TRUE/*associative*/);
            $this->db->Commit();
            return ['paypal_product' => $paypal_product];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function PayPalActivateProduct($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            require_once('./lib/paypal.php');
            $paypal = new PayPal($this->db);
            $paypal_response = $paypal->ShowProduct($o);
            $paypal_product = $this->SavePayPalProduct($paypal_response, 'ACTIVE');
            $paypal_response = json_decode(json_encode($paypal_response), TRUE/*associative*/);
            $this->db->Commit();
            return ['paypal_product' => $paypal_product];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function PayPalCreatePlan($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            require_once('./lib/paypal.php');
            $paypal = new PayPal($this->db);
            $plan = $paypal->CreatePlan($o);
            $this->db->Commit();
            $plan = json_decode(json_encode($plan), TRUE/*associative*/);
            return ['plan' => $plan];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function PayPalListPlans($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            require_once('./lib/paypal.php');
            $paypal = new PayPal($this->db);
            $paypal_response = $paypal->ListPlans($o);
            $plans = $paypal_response->plans;
            $plans = json_decode(json_encode($plans), TRUE/*associative*/);
            $this->db->Commit();
            return ['plans' => $plans];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function PayPalShowPlan($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            require_once('./lib/paypal.php');
            $paypal = new PayPal($this->db);
            $plan = $paypal->ShowPlan($o);
            $plan = json_decode(json_encode($plan), TRUE/*associative*/);
            $this->db->Commit();
            return ['plan' => $plan];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function PayPalDeactivatePlan($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            require_once('./lib/paypal.php');
            $paypal = new PayPal($this->db);
            $paypal->DeactivatePlan($o);
            $this->db->Commit();
            return [];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function PayPalActivatePlan($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_ADMIN) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            require_once('./lib/paypal.php');
            $paypal = new PayPal($this->db);
            $paypal->ActivatePlan($o);
            $this->db->Commit();
            return [];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function PayPalShowSubscriptionDetails($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_PARENT) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            // TODO: 動作確認後、paypal_subscription_id ではなく subscription_id を渡すように変更。
            $paypal_subscription_id_ = DB::ValidateString($o, 'paypal_subscription_id', FALSE/*default value*/, 50/*max length*/);
            $result = $this->db->Query("SELECT * FROM subscriptions WHERE user_id = {$current_user->id} AND paypal_subscription_id = $paypal_subscription_id_");
            $subscription = pg_fetch_object($result);
            if (!$subscription) {
                throw new Exception('subscription with paypal_subscription_id == ' . $o->paypal_subscription_id . ' not found');
            }
            return ['subscription' => $subscription];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }
    
    private function PayPalSuspendSubscription($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_PARENT) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            $paypal_subscription_id_ = DB::ValidateString($o, 'paypal_subscription_id', FALSE/*default value*/, 50/*max length*/);
            $result = $this->db->Query("SELECT * FROM subscriptions WHERE user_id = {$current_user->id} AND paypal_subscription_id = $paypal_subscription_id_");
            $subscription = pg_fetch_object($result);
            if (!$subscription) {
                throw new Exception('subscription with paypal_subscription_id == ' . $o->paypal_subscription_id . ' not found');
            }
            require_once('./lib/paypal.php');
            $paypal = new PayPal($this->db);
            $paypal->SuspendSubscription($o);
            $paypal_subscription = $paypal->ShowSubscriptionDetails($o);
            $status_ = DB::Quote($paypal_subscription->status);
            $paypal_subscription_ = DB::Quote(json_encode($paypal_subscription, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            $result = $this->db->Query("UPDATE subscriptions SET status = $status_, paypal_subscription = $paypal_subscription_, updated_at = NOW() WHERE id = {$subscription->id} RETURNING *");
            $subscription = pg_fetch_object($result);
            $this->db->Commit();
            return ['subscription' => $subscription];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function PayPalActivateSubscription($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_PARENT) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            $paypal_subscription_id_ = DB::ValidateString($o, 'paypal_subscription_id', FALSE/*default value*/, 50/*max length*/);
            $result = $this->db->Query("SELECT * FROM subscriptions WHERE user_id = {$current_user->id} AND paypal_subscription_id = $paypal_subscription_id_");
            $subscription = pg_fetch_object($result);
            if (!$subscription) {
                throw new Exception('subscription with paypal_subscription_id == ' . $o->paypal_subscription_id . ' not found');
            }
            require_once('./lib/paypal.php');
            $paypal = new PayPal($this->db);
            $paypal->ActivateSubscription($o);
            $paypal_subscription = $paypal->ShowSubscriptionDetails($o);
            $status_ = DB::Quote($paypal_subscription->status);
            $paypal_subscription_ = DB::Quote(json_encode($paypal_subscription, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            $result = $this->db->Query("UPDATE subscriptions SET status = $status_, paypal_subscription = $paypal_subscription_, updated_at = NOW() WHERE id = {$subscription->id} RETURNING *");
            $subscription = pg_fetch_object($result);
            $this->db->Commit();
            return ['subscription' => $subscription];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function PayPalCancelSubscription($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_PARENT) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
            $paypal_subscription_id_ = DB::ValidateString($o, 'paypal_subscription_id', FALSE/*default value*/, 50/*max length*/);
            $result = $this->db->Query("SELECT * FROM subscriptions WHERE user_id = {$current_user->id} AND paypal_subscription_id = $paypal_subscription_id_");
            $subscription = pg_fetch_object($result);
            if (!$subscription) {
                throw new Exception('subscription with paypal_subscription_id == ' . $o->paypal_subscription_id . ' not found');
            }
            require_once('./lib/paypal.php');
            $paypal = new PayPal($this->db);
            $paypal->CancelSubscription($o);
            $paypal_subscription = $paypal->ShowSubscriptionDetails($o);
            $status_ = DB::Quote($paypal_subscription->status);
            $paypal_subscription_ = DB::Quote(json_encode($paypal_subscription, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            $result = $this->db->Query("UPDATE subscriptions SET status = $status_, paypal_subscription = $paypal_subscription_, updated_at = NOW() WHERE id = {$subscription->id} RETURNING *");
            $subscription = pg_fetch_object($result);
            $this->db->Commit();
            return ['subscription' => $subscription];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }
    
    private function InsertAccount($o) {
        try {
            $this->db->StartTransaction();
            self::ValidateInteger($o->type, 'type');
            self::ValidateAccount($o->account, 'account');
            self::ValidatePassword($o->password, 'password');
            $type = intval($o->type, 10);
            $account_ = DB::Quote($o->account);
            $password_ = DB::Quote($o->password);
            //$validation_nonce = mt_rand(100000, 999999);
            //$result = $this->db->Query("INSERT INTO users (type, account, password, validation_started_at, validation_nonce) VALUES ($type, $account_, $password_, NOW(), $validation_nonce) RETURNING *");
            $result = $this->db->Query("INSERT INTO users (type, account, password) VALUES ($type, $account_, $password_) RETURNING *");
            $user = pg_fetch_object($result);
            $this->db->Commit();
            return $user;
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function StartValidation($user) {
        try {
            $this->db->StartTransaction();
            $validation_nonce = mt_rand(100000, 999999);
            $result = $this->db->Query("UPDATE users SET validation_started_at = NOW(), validation_nonce = $validation_nonce WHERE id = {$user->id} RETURNING *");
            $user = pg_fetch_object($result);
            require_once('./lib/html_mail.php');
            $account = $user->account;
            $console_uri = GetConsoleURI();
            $confirm_uri = sprintf('%sapi/?_account=%s&_validation_nonce=%d&_command=validate_account&validated=1', $console_uri, $account, $user->validation_nonce);
            $deny_uri = sprintf('%sapi/?_account=%s&_validation_nonce=%d&_command=validate_account&validated=0', $console_uri, $account, $user->validation_nonce);

            $html = file_get_contents('./lib/validation.html');
            $html = str_replace('__TIMEOUT_HOURS__', VALIDATION_TIMEOUT_HOURS, $html);
            $html = str_replace('__CONFIRM_URI__', $confirm_uri, $html);
            $html = str_replace('__DENY_URI__', $deny_uri, $html);
            $html = str_replace('__RESULT__', '', $html);
            $html = str_replace('__COLOR__', 'ffffff', $html);
            $html = str_replace('__ACCOUNT__', $account, $html);

            $validation_message_id = HTMLMail::Send(NULL, $account, 'tcpdetective.com', 'no-reply@tcpdetective.com', 'Confirm Your Registration', $html);
            if ($validation_message_id) {
                $validation_message_id_ = DB::Quote($validation_message_id);
            } else {
                $validation_message_id_ = DB::Quote('FALSE');
            }
            $result = $this->db->Query("UPDATE users SET validation_message_id = $validation_message_id_ WHERE id = {$user->id} RETURNING *");
            $user = pg_fetch_object($result);

            $this->db->Commit();

            return $user;
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function PayPalLoadSubscriptions($o) {
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

    private function PayPalAddSubscription($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();
            if ($current_user->type != USER_TYPE_PARENT) {
                throw new Exception('operation not allowed to the user', ERROR_OPERATION_NOT_ALLOWED);
            }
/*
            paypal_plan_id: PayPal.getCurrent().plan_id,
            paypal_subscription_id: data.subscriptionID,
            host_name: host_name,
            paypal_subscription: <object>
            ↓DONE: 230622 こう変更。つまりこの時点ではサブスクの内容は不明。ID しか分からない。
            paypal_product_id: PayPal.getCurrent().product_id,
            paypal_plan_id: PayPal.getCurrent().plan_id,
            paypal_subscription_id: data.subscriptionID,
            host_name: host_name,

*/
            //$paypal_product_id TODO: 将来複数のプロダクトに対応するには今から paypal_product_id を保存すべきかも。
            $paypal_plan_id_ = DB::ValidateString($o, 'paypal_plan_id', FALSE/*default value*/, 50/*max length*/);
            $paypal_subscription_id_ = DB::ValidateString($o, 'paypal_subscription_id', FALSE/*default value*/, 50/*max length*/);
            require_once('./lib/paypal.php');
            $paypal = new PayPal($this->db);
            $paypal_subscription = $paypal->ShowSubscriptionDetails($o);
            $host_name_ = DB::ValidateString($o, 'host_name', FALSE/*default value*/, 128/*max length*/);
            $status_ = DB::ValidateString($paypal_subscription, 'status', FALSE/*default value*/, 24/*max length*/);
            $starting_at_ = DB::ValidateString($paypal_subscription, 'start_time', FALSE/*default value*/, 20/*max length*/);
            $paypal_subscription_ = DB::Quote(json_encode($paypal_subscription, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
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
    private function PayPalUpdateSubscription($o) {
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

    private function CreateAccount($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $user = $this->InsertAccount($o);
            $user = $this->StartValidation($user);
            return ['user' => $user];
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    private function StartAccountValidation($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $user = $this->StartValidation($current_user);
            return [];
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    static private function SendValidationResponse($user, $confirmed, $message) {

        if ($confirmed == USER_REGISTRATION_CONFIRMED) {
            $color = '95b75d';
        } else {
            $color = 'E04B4A';
        }

        $html = file_get_contents('./lib/validation.html');
        $html = str_replace('__TIMEOUT_HOURS__', VALIDATION_TIMEOUT_HOURS, $html);
        $html = str_replace('__CONFIRM_URI__', '#', $html);
        $html = str_replace('__DENY_URI__', '#', $html);
        $html = str_replace('__RESULT__', $message, $html);
        $html = str_replace('__COLOR__', $color, $html);
        $html = str_replace('__ACCOUNT__', $user->account, $html);

        $now = gmdate('D, d M Y H:i:s') . ' GMT';
        $content_length = strlen($html);
        header("HTTP/1.1 200 OK");
        header("Date: $now");
        header("Content-Length: $content_length");
        header('Connection: close');
        header('Content-Type: text/html; charset=utf-8');
        echo $html;
        exit(0);
    }

    private function _ValidateAccount($o) {
        try {
            $this->db->StartTransaction();

            // パラメータチェック
            try {
                self::ValidateAccount($o->_account, '_account');
                self::ValidateInteger($o->_validation_nonce, '_validation_nonce');
                self::ValidateInteger($o->validated, 'validated');
            } catch (Exception $e) {
                throw new Exception($e->getMessage(), USER_REGISTRATION_DENIED);
            }
            $_account_ = DB::Quote($o->_account);
            $_validation_nonce = intval($o->_validation_nonce, 10);
            if ($_validation_nonce < 100000 || 999999 < $_validation_nonce) {
                throw new Exception('invalid validation_nonce', USER_REGISTRATION_DENIED);
            }
            $validated = ($o->validated == '1' ? 1 : 0);

            // ユーザーのバリデーションの状況をチェック
            $result = $this->db->Query("SELECT * FROM users WHERE account = $_account_");
            $user = pg_fetch_object($result);
            if (!$user) {
                throw new Exception('User already deleted', USER_REGISTRATION_DENIED);
            }
            if (!isset($user->validation_started_at) || !isset($user->validation_nonce)) {
                throw new Exception('Stale URI', USER_REGISTRATION_DENIED);
            }
            if ($user->validation_nonce != $_validation_nonce) {
                throw new Exception('Outdated URI', USER_REGISTRATION_DENIED);
            }
            if (isset($user->validated_at)) {
                if ($user->validation_started_at < $user->validated_at) {
                    if ($user->validated == 1) {
                        throw new Exception('Already confirmed', USER_REGISTRATION_CONFIRMED);
                    } else {
                        throw new Exception('Already denied', USER_REGISTRATION_DENIED);
                    }
                }
            }
            // ここまで来るのはまだ確認が行われていない場合
            $result = $this->db->Query("SELECT FROM users WHERE id = {$user->id} AND NOW() < validation_started_at + INTERVAL '".VALIDATION_TIMEOUT_HOURS." HOURS'");
            if (!pg_fetch_object($result)) {
                // 時間切れ。
                throw new Exception('Confirmation timed out', USER_REGISTRATION_DENIED);
            }
            $result = $this->db->Query("UPDATE users SET validated = $validated, validated_at = NOW() WHERE id = {$user->id} RETURNING *");
            $user = pg_fetch_object($result);
            $this->db->Commit();
            if ($validated == 1) {
                $confirmed = USER_REGISTRATION_CONFIRMED;
                $message = 'Registration confirmed!';
            } else {
                $confirmed = USER_REGISTRATION_DENIED;
                $message = 'Registration denied!';
            }
            self::SendValidationResponse($user, $confirmed, $message);
        } catch (Exception $e) {
            $this->db->Rollback();
            self::SendValidationResponse($user, $e->getCode(), $e->getMessage());
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

    private function DownloadTarball($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);  // これが一番先
            $subscription_id = DB::ValidateNaturalNumber($o, 'subscription_id', FALSE/*Default value. Unlike NULL, FALSE means "Throw an Exception if the variable (in this case 'subscription_id') is not set".*/);
            require_once('./lib/tarball.php');
            $tarball = new Tarball($this->db);
            try {
                list($tarball_path, $tarball_file) = $tarball->Build($subscription_id, $current_user->account);
            } catch (Exception $e) {
                header('Content-Type: text/plain; charset=utf-8');
                printf("code: %d\n", $e->getCode());
                printf("message:\n%s\n", $e->getMessage());
                exit(0);
            }
            header('Content-Type: application/octet-stream');
            header('X-Content-Type-Options: nosniff');
            header('Content-Length: ' . filesize($tarball_path));
            header('Content-Disposition: attachment; filename="' . $tarball_file . '"');
            header('Connection: close');
            if (ob_get_level()) {
                ob_end_clean();
            }
            readfile($tarball_path);
            exit(0);
        } catch (Exception $e) {
            throw new Exception(__FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    // コンタクト
    private function ContactStarship($o) {
        try {
            $current_user = $this->Authenticate($o, __FUNCTION__);
            $this->db->StartTransaction();

            $name_ = DB::ValidateString($o, 'name', FALSE/*default value*/, 128/*max length*/);
            $from_ = DB::ValidateString($o, 'from', FALSE/*default value*/, 128/*max length*/);
            if (isset($o->organization_name)) {
                $organization_name_ = DB::ValidateString($o, 'organization_name', FALSE/*default value*/, 128/*max length*/);
            } else {
                $organization_name_ = 'NULL';
            }
            $subject_ = DB::ValidateString($o, 'subject', FALSE/*default value*/, 128/*max length*/);
            $message_ = DB::ValidateLines($o, 'message', FALSE/*default value*/, 4096/*max length*/);
            $sql = <<<SQL
INSERT INTO contacts (
name,
mail,   -- // from は DBMS の予約語ゆえ使用不能
organization_name,
subject,
message
) VALUES (
$name_,
$from_,
$organization_name_,
$subject_,
$message_
) RETURNING *
SQL;
            $result = $this->db->Query($sql);
            $contact = pg_fetch_object($result);
            $contact_js = self::ObjectToJSCode($contact);
            $console_uri = GetConsoleURI();
            $line_message = <<<LINE_MESSAGE
Contact Inquiry from $console_uri.
$contact_js
LINE_MESSAGE;
            require_once('./lib/line.php');
            $line = new LINE();
            $line->SendToSupportTeam($line_message);

$mail_message = <<<MAIL_MESSAGE
Name: {$o->name}
From: {$o->from}
Organization Name: {$o->organization_name}
Subject: {$o->subject}
Message:
{$o->message}
MAIL_MESSAGE;
            require_once('./lib/mail.php');
            $message_id = Mail::Send($o->name, $o->from, 'Starship.jp', 'no-reply@starship.jp', 'Inquiry Received', $mail_message);

            $this->db->Commit();
            return ['message_id' => $message_id];
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
        case 'paypal_load_config':
            $response = $this->PayPalLoadConfig($o);
            break;
        case 'paypal_get_access_token':
            $response = $this->PayPalGetAccessToken($o);
            break;
        case 'paypal_list_products':
            $response = $this->PayPalListProducts($o);
            break;
        case 'paypal_show_product':
            $response = $this->PayPalShowProduct($o);
            break;
        case 'paypal_update_product':
            $response = $this->PayPalUpdateProduct($o);
            break;
        case 'paypal_create_product':
            $response = $this->PayPalCreateProduct($o);
            break;
        case 'paypal_deactivate_product':
            $response = $this->PayPalDeactivateProduct($o);
            break;
        case 'paypal_activate_product':
            $response = $this->PayPalActivateProduct($o);
            break;
        case 'paypal_create_plan':
            $response = $this->PayPalCreatePlan($o);
            break;
        case 'paypal_list_plans':
            $response = $this->PayPalListPlans($o);
            break;
        case 'paypal_show_plan':
            $response = $this->PayPalShowPlan($o);
            break;
        case 'paypal_deactivate_plan':
            $response = $this->PayPalDeactivatePlan($o);
            break;
        case 'paypal_activate_plan':
            $response = $this->PayPalActivatePlan($o);
            break;
        case 'paypal_show_subscription_details':
            $response = $this->PayPalShowSubscriptionDetails($o);
            break;
        case 'paypal_suspend_subscription':
            $response = $this->PayPalSuspendSubscription($o);
            break;
        case 'paypal_activate_subscription':
            $response = $this->PayPalActivateSubscription($o);
            break;
        case 'paypal_cancel_subscription':
            $response = $this->PayPalCancelSubscription($o);
            break;
        case 'paypal_load_subscriptions':
            $response = $this->PayPalLoadSubscriptions($o);
            break;
        case 'paypal_add_subscription':
            $response = $this->PayPalAddSubscription($o);
            break;
        case 'paypal_update_subscription':
            $response = $this->PayPalUpdateSubscription($o);
            break;
        case 'create_account':
            $response = $this->CreateAccount($o);
            break;
        case 'start_account_validation':
            $response = $this->StartAccountValidation($o);
            break;
        case 'validate_account':
            $response = $this->_ValidateAccount($o);
            break;
        case 'load_paypal_plan_templates':
            $response = $this->LoadPayPalPlanTemplates($o);
            break;
        case 'save_paypal_plan_templates':
            $response = $this->SavePayPalPlanTemplate($o);
            break;
        case 'download_tarball':
            $response = $this->DownloadTarball($o);
            break;
        case 'contact_starship':
            $response = $this->ContactStarship($o);
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
