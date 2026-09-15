<?php
$url = 'http://username:password@hostname:8080/path?arg=value#anchor';

print_r(parse_url($url));

// 上記のコードは以下の配列を出力します:
// Array
// (
//     [scheme] => http
//     [host] => hostname
//     [user] => username
//     [pass] => password
//     [path] => /path
//     [query] => arg=value
//     [fragment] => anchor
// )
?>
