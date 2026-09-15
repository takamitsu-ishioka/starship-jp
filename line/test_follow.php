<?php
require_once('./lib/curl.php');
/*
object(stdClass)#6 (4) {
  ["type"]=>
  string(6) "follow"
  ["replyToken"]=>
  string(32) "181e586327384e17a01be90691ef2b52"
  ["source"]=>
  object(stdClass)#7 (2) {
    ["userId"]=>
    string(33) "U4cf23ef0dfb0becbca6a7f72d9fd45f0"
    ["type"]=>
    string(4) "user"
  }
  ["timestamp"]=>
  int(1539774748775)
}
*/
$data = array(
    'events' => array(
        array(
            'type' => 'follow',
            'replyToken' => '181e586327384e17a01be90691ef2b52',
            'source' => array(
                'userId' => 'U4cf23ef0dfb0becbca6a7f72d9fd45f0',
                'type' => 'user'
            ),
            'timestamp' => 1539774748775
        )
    )
);
$json_data = json_encode($data);
$curl = new Curl();
$response = $curl->Post(NULL, NULL, 'https://line.starship.jp/', NULL, $json_data, array('Content-Type: application/json'));
var_dump($curl->GetStatusCode());
var_dump('$response', $response);
?>
