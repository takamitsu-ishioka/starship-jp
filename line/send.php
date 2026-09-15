<?php

require 'vendor/autoload.php';
require_once(dirname(__FILE__) . '/lib/env.php');
LoadEnv(dirname(__FILE__) . '/.env');

use Aws\Sns\SnsClient;

$args = array(
    'credentials' => array(
        'key' => Env('AWS_ACCESS_KEY_ID'),
        'secret' => Env('AWS_SECRET_ACCESS_KEY'),
    ),
    //'region' => 'ap-northeast-1',     // 東京
    'region' => 'eu-west-1',          // アイルランド
    //'region' => 'us-east-1',          // バージニア
    //'region' => 'ap-southeast-1',     // シンガポール
    //'region' => 'ap-southeast-2',     // シドニー Sender が NOTICE になる！。返信できないから使える！→それも不安定 orz
    'version' => 'latest'
);

$sns = new SnsClient($args);

//arn:aws:sns:ap-northeast-1:730357557849:STARSHIP00

$args = array(
    'SMSType' => 'Promotional',
    //'SMSType' => 'Transactional',
    'Message' => "AWS SNS の SMS 送信 API から\nこんにちは！",
    'PhoneNumber' => Env('SEND_TEST_PHONE_NUMBER'),
    'SenderID' => 'STARSHIP'
);

try {
    $result = $sns->publish($args);
    var_dump($result);
} catch (Exception $e) {
    die($e->getMessage() . "\n");
}

?>
