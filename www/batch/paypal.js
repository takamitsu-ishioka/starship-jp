
const _common = require('./common.js');

// カレントディレクトリ (batch) は HTTP サーバーによる読み取りが禁止されているので、諸々秘密の定数を書いてヨシ！

// BEGIN PayPal の仕様
PayPal.SERVER_SANDBOX =         'https://api-m.sandbox.paypal.com';
PayPal.SERVER_LIVE =            'https://api-m.paypal.com';
PayPal.CLIENT_ID_SANDBOX =      'Aap5KIwEoezDQRYHWyb9HWnxdMs6WT7HRgoSv0SBna5CNBEBrYEXRSLACy2lVeXuKIhw9loBt9_EAs8V';
PayPal.CLIENT_ID_LIVE =         'AbpXfLlD8ZAgZ61d3htCEzAfvI2TlNtou52PehOCecTHk5LbFO8MZK8Rw1R9wbASJuIj_ZdTmUYxdp7L';
PayPal.CLIENT_SECRET_SANDBOX =  'EOlFCJGgSODMFslNBt5JCg3N-q4OqxcRNanfmoPpS776obDjeDT6lLAP_4gus40jH2r_Re_VWFxy3cKl';
PayPal.CLIENT_SECRET_LIVE =     'EGILuD5D9UZXzsUJlrQ2DchzusGNhPrUexm8mX5gEUNWtxW5UnaD188l9aDjXg27KuUA3K8rbQnLSaiO';
PayPal.PRODUCTS_PATH =          '/v1/catalogs/products';
PayPal.PLANS_PATH =             '/v1/billing/plans';
PayPal.SUBSCRIPTIONS_PATH =     '/v1/billing/subscriptions';
PayPal.MAX_DESCRIPTION_LENGTH = 256;
// END PayPal の仕様

// BEGIN tcpdetective.com の仕様（仕様変更時は手動で書き換える。TODO: 複数のプロダクトやプランを扱うようにするときは、DB から読み取るなどの改造を施す必要あり）
PayPal.PRODUCT_ID_SANDBOX =     'PROD-6LX16046LD859000X';
PayPal.PRODUCT_ID_LIVE =        'TCPDetective-1.1';
PayPal.PLAN_ID_SANDBOX =        'P-418925716T890270KMSFMGQY';
PayPal.PLAN_ID_LIVE =           'P-55E599651V182814BMRVVJGI';
PayPal.PLAN_NAME_SANDBOX =      'TCPDetective-7.5-USD/month/host';
PayPal.PLAN_NAME_LIVE =         'TCPDetective-7.5-USD/month/host';
PayPal.TOKEN_PATH =             '/v1/oauth2/token';
// END tcpdetective.com の仕様

function PayPal(isDev) {
    // 環境別定数
    this.isDev = isDev;
    if (this.isDev) {
        this.server = PayPal.SERVER_SANDBOX;
        this.client_id = PayPal.CLIENT_ID_SANDBOX;
        this.client_secret = PayPal.CLIENT_SECRET_SANDBOX;
        this.product_id = PayPal.PRODUCT_ID_SANDBOX;
        this.plan_id = PayPal.PLAN_ID_SANDBOX;
        this.plan_name = PayPal.PLAN_NAME_SANDBOX;
    } else {
        this.server = PayPal.SERVER_LIVE;
        this.client_id = PayPal.CLIENT_ID_LIVE;
        this.client_secret = PayPal.CLIENT_SECRET_LIVE;
        this.product_id = PayPal.PRODUCT_ID_LIVE;
        this.plan_id = PayPal.PLAN_ID_LIVE;
        this.plan_name = PayPal.PLAN_NAME_LIVE;
    }
    // アクセストークンを取得する
    this.getAccessToken = function(argv) {
        _common.CallAPIEx({
            uri: this.server + PayPal.TOKEN_PATH,
            method: 'POST',
            timeout: 7013,
            auth: {
                type: 'Basic',
                user: this.client_id,
                pass: this.client_secret,
            },
            data: {grant_type: 'client_credentials'},
            // 通信が成功し
            on_success: function(response, body) {
                // 応答の形式が正しい
                if (response['headers'] && response.headers['content-type'] && response.headers['content-type'] == 'application/json') {
                    var body_object = JSON.parse(body);
                    PayPal.getCurrent().token_response = body_object;
                    if (argv.on_success) {
                        argv.on_success(response, body_object);
                    }
                // 応答の形式が間違っている
                } else {
                    PayPal.getCurrent().token_response = undefined;
                    if (argv.on_failure) {
                        argv.on_failure(response, body);
                    }
                }
            },
            // 通信が失敗した
            on_error: function(error) {
                PayPal.getCurrent().token_response = undefined;
                if (argv.on_error) {
                    argv.on_error(error);
                }
            },
            // 通信が時間切れ
            on_timeout: function() {
                PayPal.getCurrent().token_response = undefined;
                if (argv.on_timeout) {
                    argv.on_timeout();
                }
            },
            // 終わった（通信の成功／失敗も応答の形式の正誤も問わない）
            on_complete: argv.on_complete,
        });
    }
    // サブスクリプションの詳細な情報を取得する。
    this.showSubscriptionDetails = function(argv) {
        if (this.token_response == undefined || this.token_response.access_token == undefined) {
            throw 'PayPal(): showSubscriptionDetails(): Call getAccessToken() first.';
        }
        if (argv.id == undefined) {
            throw 'PayPal(): showSubscriptionDetails(): id missing';
        }
        _common.CallAPIEx({
            uri: this.server + PayPal.SUBSCRIPTIONS_PATH + '/' + argv.id,
            method: 'GET',
            timeout: 7013,
            auth: {
                type: 'Bearer',
                token: this.token_response.access_token,
            },
            on_success: function(response, body) {
                // 応答の形式が正しい
                if (response['headers'] && response.headers['content-type'] && response.headers['content-type'] == 'application/json') {
                    var body_object = JSON.parse(body);
                    if (argv.on_success) {
                        argv.on_success(response, body_object);
                    }
                // 応答の形式が間違っている
                } else {
                    if (argv.on_failure) {
                        argv.on_failure(response, body);
                    }
                }
            },
            // 通信が失敗した
            on_error: function(error) {
                if (argv.on_error) {
                    argv.on_error(error);
                }
            },
            // 通信が時間切れ
            on_timeout: function() {
                if (argv.on_timeout) {
                    argv.on_timeout();
                }
            },
            // 終わった（通信の成功／失敗も応答の形式の正誤も問わない）
            on_complete: argv.on_complete,
        });
    }
}
PayPal._current;
PayPal.setCurrent = function(isDev) {
    PayPal._current = new PayPal(isDev);
};
PayPal.getCurrent = function() {
    return PayPal._current;
};

module.exports = {
    _common: _common,
    PayPal: PayPal,
};
