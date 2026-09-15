<?php
/*
LINE でメッセージを送信する LINE クラス。
*/

require_once(dirname(__FILE__) . '/config.php');
require_once(dirname(__FILE__) . '/line_config.php');
require_once(dirname(__FILE__) . '/curl.php');

class LINE {

    private $push_api = LINE_PUSH_API;
    private $profile_api = LINE_PROFILE_API;
    private $exit_from_group_api = LINE_EXIT_FROM_GROUP_API;
    //private $token = LINE_CHANNEL_TOKEN_TCPDETECTIVE;
    private $token = LINE_CHANNEL_TOKEN_STARSHIP_BOT;
    private $curl = NULL;

    function __construct() {
        $this->curl = new Curl();
    }

    // ユーザーのプロファイルを取得する。
    public function Profile($user_id) {
        try {
            $api = str_replace('{userId}', $user_id, $this->profile_api);
            $headers = [
                'Authorization: Bearer ' . $this->token
            ];
            $json_response = $this->curl->Get(NULL, NULL, $api, NULL, $headers);
            $response = new stdClass();
            $response->response = json_decode($json_response);
            $response->status = $this->curl->GetStatusCode();
            return $response;
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    // トークルームから退出する。
    public function ExitFromGroup($group_id) {
        try {
            $api = str_replace('{groupId}', $group_id, $this->exit_from_group_api);
            $body = '';
            $headers = [
                //'Content-Type: application/json',
                'Authorization: Bearer ' . $this->token
            ];
            $json_response = $this->curl->Post(NULL, NULL, $api, NULL, $body, $headers);
            $status_code = $this->curl->GetStatusCode();
            if ($status_code != 200) {
                throw new Exception("{$api} returned error code {$status_code}");
            }
            return json_decode($json_response); // カラっぽのオブジェクトが返る
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    // ユーザーやトークルームにテキストメッセージを送信する。
    public function SendTo($message, $line_id) {
        try {
            $headers = [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->token
            ];
            $body = [
                'to' => $line_id,
                'messages' => [
                    [
                        'type' => 'text',
                        'text' => $message
                    ]
                ]
            ];
            $json_body = json_encode($body, JSON_UNESCAPED_UNICODE);
            $json_response = $this->curl->Post(NULL, NULL, $this->push_api, NULL, $json_body, $headers);
            $status_code = $this->curl->GetStatusCode();
            if ($status_code != 200) {
                VarDump('$json_response', $json_response);
                $response = json_decode($json_response);
                if (isset($response) && isset($response->message)) {
                    $message = $response->message;
                } else {
                    $message = $json_response;
                }
                throw new Exception("{$this->push_api} returned error code {$status_code}: " . $message);
            }
            return json_decode($json_response); // カラっぽのオブジェクトが返る
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    public function SendToSupportTeam($message) {
        try {
            $line_ids = [
                LINE_USER_ID_KISABURO,
                //LINE_USER_ID_KISABURO_XPERIA,
                LINE_USER_ID_KISABURO_GALAXY,
            ];
            foreach ($line_ids as $line_id) {
                $this->SendTo($message, $line_id);
            }
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

}

?>
