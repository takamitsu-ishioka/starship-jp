#!/bin/bash

cd "`dirname $0`"

source ~/bin/config.sh

_api_uri='https://api-m.sandbox.paypal.com'
_token_path='/v1/oauth2/token'
_client_id='Aap5KIwEoezDQRYHWyb9HWnxdMs6WT7HRgoSv0SBna5CNBEBrYEXRSLACy2lVeXuKIhw9loBt9_EAs8V'
_client_secret='EOlFCJGgSODMFslNBt5JCg3N-q4OqxcRNanfmoPpS776obDjeDT6lLAP_4gus40jH2r_Re_VWFxy3cKl'
_plan_path='/v1/billing/plans'
_plan_id='P-9DY878597X3927150MQX5PFQ'

function GetAccessToken() {
    local options
    local php_params
    if [ $_verbose -eq 1 ]; then
        options='-v'
        php_params=('verbose')
    else
        options='-s'
        php_params=()
    fi
    #curl -v -X POST "$_api_uri$_token_path" \
    curl $options "$_api_uri$_token_path" \
        -H "Accept: application/json" \
        -H "Accept-Language: en_US" \
        -u "$_client_id:$_client_secret" \
        -d "grant_type=client_credentials" \
    | php -r '{
        $response_json = file_get_contents("php://stdin");
        $response_object = json_decode($response_json);
        if (1 < $argc && $argv[1] == 'verbose') {
            $response_json_pretty = json_encode($response_object, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            //$response_json_pretty = preg_replace("/\"(.+)\":/", "$1:", $response_json_pretty);
            //$response_json_pretty = str_replace("\"", "", $response_json_pretty);
            fprintf(STDERR, "%s\n", $response_json_pretty);
        }
        echo $response_object->access_token . "\n";
    }' ${php_params[@]}
    return $?
}

function GetPlanDetails() {
    local access_token="$1"
    curl -v "$_api_uri$_plan_path/$_plan_id" \
        -H "Authorization: Bearer $access_token" \
        -H 'Content-Type: application/json' \
        -H 'Accept: application/json' \
    | php -r '{
        $response_json = file_get_contents("php://stdin");
        $response_object = json_decode($response_json);
        $response_json_pretty = json_encode($response_object, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        printf("%s\n", $response_json_pretty);
    }'
    return $?
}

access_token="`GetAccessToken`"

GetPlanDetails "$access_token"

exit $?
