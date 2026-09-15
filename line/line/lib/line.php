<?php
/*
LINE API を呼び出す
*/
namespace LINE;

class LINE {
    private $push_api = 'https://api.line.me/v2/bot/message/push';
    private $profile_api = 'https://api.line.me/v2/bot/profile/{userId}';
    private $exit_from_group_api = 'https://api.line.me/v2/bot/group/{groupId}/leave';
    //private $token = 'R5eiUJ9DJ+MYyAi2s4YO2rNFE2emrSyHnEZMHRmBusMf5tt04bnRGM0ZjAqJ/nPXqo7WoyJLX0E9zyDiGgeBioRFxcC73h011SbBxtkzow+jfy/iRij1NuLd9SSWULzCNWFpjAflr6Ty+N8/X26JuQdB04t89/1O/w1cDnyilFU=';
    private $token = 'xUpsE5vCr85YfnPzxAqUEHipMhYZQlueKN6UsPrXIsZqDGvxQEPmvqHFfz3/6RVnylFM1uHhNPAyBC4Qmou4EwbXwURt8PPmX8P8kMHaG6myaM1NrTKGklnGvsxDEsH2XeecKmAdGYhbtbYrpkX9TQdB04t89/1O/w1cDnyilFU=';
    private $curl = NULL;

    function __construct() {
        require_once(dirname(__FILE__) . '/curl.php');
        $this->curl = new Curl();
    }

    public function Profile($user_id) {
        $api = str_replace('{userId}', $user_id, $this->profile_api);
        $headers = array(
            'Authorization: Bearer ' . $this->token
        );
        $json_response = $this->curl->Get(NULL, NULL, $api, NULL, $headers);
        $response = new \stdClass();
        $response->response = json_decode($json_response);
        $response->status = $this->curl->GetStatusCode();
        return $response;
    }

    public function ExitFromGroup($group_id) {
        $api = str_replace('{groupId}', $group_id, $this->exit_from_group_api);
        $body = '';
        $headers = array(
            //'Content-Type: application/json',
            'Authorization: Bearer ' . $this->token
        );
        $json_response = $this->curl->Post(NULL, NULL, $api, NULL, $body, $headers);
        $status_code = $this->curl->GetStatusCode();
        if ($status_code != 200) {
            throw new \Exception("{$api} returned error code {$status_code}");
        }
        return json_decode($json_response); // カラっぽのオブジェクトが返る
    }

    public function SendTo($message, $line_id) {
        $headers = array(
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->token
        );
        $body = array(
            'to' => $line_id,
            'messages' => array(
                array(
                    'type' => 'text',
                    'text' => $message
                )
            )
        );
        $json_body = json_encode($body);
        $json_response = $this->curl->Post(NULL, NULL, $this->push_api, NULL, $json_body, $headers);
        $status_code = $this->curl->GetStatusCode();
        if ($status_code != 200) {
            throw new \Exception("{$this->push_api} returned error code {$status_code}");
        }
        return json_decode($json_response); // カラっぽのオブジェクトが返る
    }
}

?>
