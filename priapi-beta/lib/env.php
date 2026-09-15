<?php

// .env ファイル(KEY="value" 形式。#始まりの行はコメント)を読み込み、
// getenv()/Env() で参照できるようにする。

function LoadEnv($path) {
    if (!file_exists($path)) {
        fprintf(STDERR, "LoadEnv(): file not found: %s\n", $path);
        exit(1);
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
            continue;
        }
        $pos = strpos($line, '=');
        if ($pos === FALSE) {
            continue;
        }
        $key = trim(substr($line, 0, $pos));
        $value = trim(substr($line, $pos + 1));
        if (strlen($value) >= 2 && $value[0] === '"' && substr($value, -1) === '"') {
            $value = str_replace('\\"', '"', str_replace('\\\\', '\\', substr($value, 1, -1)));
        }
        putenv("$key=$value");
        $_ENV[$key] = $value;
    }
}

function Env($key) {
    $value = getenv($key);
    if ($value === FALSE) {
        fprintf(STDERR, "Env(): environment variable not set: %s\n", $key);
        exit(1);
    }
    return $value;
}

?>
