<?php

require_once(dirname(__FILE__) . '/config.php');

class Tarball {
    private $db = NULL;

    function __construct($db) {
        $this->db = $db;
    }

    public function Build($subscription_id, $account) {
        try {
            $this->db->StartTransaction();
            $result = $this->db->Query("SELECT * FROM subscriptions WHERE id = $subscription_id");
            $subscription = pg_fetch_object($result);
            if (!$subscription) {
                throw new Exception("subscription with id $subscription_id not found");
            }
            $local_host_id = $subscription->host_id;    // ここで local とは、ユーザーから見て local
            //$status_server = GetServerURI();  DONE: 230523 これでは内部 API の URI が STATUS_SERVER の値になってしまう。
            $status_server = GetPublicServerURI();
            $system_alert_mailto_csv = $account;

            $socket = socket_create(AF_UNIX, SOCK_STREAM, 0);
            if (!$socket) {
                $message = socket_strerror(socket_last_error());
                throw new Exception(sprintf('socket_create(): %s', $message));
            }
            $socket_path = './build.sock';
            /*
            NOTE: $socket_path に socket_connect() するには、
            (1) sudo usermod -a -G ec2-user apache
            (2) chmod g+rx /home/ec2-user せんければいけん
            →無駄だったw
            つまり、ウェブサーバーに於いてはドキュメントルート配下以外の場所へのアクセスは絶対の禁忌である、と。
            */
            if (!socket_connect($socket, $socket_path)) {
                $message = socket_strerror(socket_last_error());
                socket_close($socket);
                throw new Exception(sprintf('socket_connect(): %s', $message));
            }
            $request = sprintf("%s %s %s\n", $local_host_id, $status_server, $system_alert_mailto_csv);
            $byte_count = socket_write($socket, $request, strlen($request));
            if ($byte_count === FALSE) {
                $message = socket_strerror(socket_last_error());
                socket_close($socket);
                throw new Exception(sprintf('socket_write(): %s', $message));
            }
            /*
            応答の形式は、次の 3 種類
            SUCCESS TCPDetective.25486.tgz
            FAILURE build.sh.9221.log
            ERROR 8 DomSock::ReceiveLine(): socket closed in recv()
            */
            $response = socket_read($socket, 1024);
            if ($response === FALSE) {
                $message = socket_strerror(socket_last_error());
                socket_close($socket);
                throw new Exception(sprintf('socket_read(): %s', $message));
            }
            socket_close($socket);
            $match = [];
            //VarDump('$response', $response);
            if (!preg_match('/^([A-Z]+) (.+)$/', $response, $match)) {
                throw new Exception("invalid response from $socket_path:\n" . $response);
            }
            $result_code = $match[1];
            $file_name = $match[2];     
            if ($result_code == 'SUCCESS') {
            } else if ($result_code == 'FAILURE') {
                $log = file_get_contents(sprintf('./_logs/%s', $file_name));
                throw new Exception(sprintf("failure log %s received from %s:\n%s", $file_name, $socket_path, $log));
            } else if ($result_code == 'ERROR') {
                $message = $file_name;
                throw new Exception(sprintf('failure reported from %s: %s', $socket_path, $message));
            } else {
                throw new Exception(sprintf('unknown result code received from %s: %s', $socket_path, $response));
            }
            $tarball_file = $file_name;
            $tarball_path = sprintf('./_tars/%s', $tarball_file);

            $tarball_content = file_get_contents($tarball_path);
            if ($tarball_content === FALSE) {
                throw new Exception("file_get_contents() failed to get $tarball_path");
            }

            $this->db->Commit();
            return [$tarball_path, $tarball_file];
        } catch (Exception $e) {
            $this->db->Rollback();
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . ': ' . $e->getMessage(), $e->getCode());
        }
    }
}

?>
