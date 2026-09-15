/*
syncdb.js - DB を PayPal サーバーのデータと同期する node.js スクリプト

2023-03-16 10:37:33 JST
PayPal サーバーが持っているデータとクライアントのデータベースのデータの齟齬（※）はいつ発生するか予測できない。
従って、それらのデータを定期的に同期するバッチ処理が必要。
それを実行する手段として最適なのは node.js だろう。
node.js なら、クライアント用に作成済みの javascript コードをおそらくほぼそのまま使うことができるので。
DONE: 2023-03-20 ↑これは【大嘘】。作成済みの javascript コードは jQuery を多用しているので、node.js からは使えない。
そのバッチ処理のスクリプトのファイル名を syncdb.js とする。
※「齟齬を発生させないために、クライアント側 DB にはデータを保存しない」という設計は不可能。
  何故なら例えば subscriptions テーブルには（ユーザーの便宜のために）TCPDetective をインストールした／するホスト名を書かざるを得ないから。
  また、期限付きのプランを導入すれば、齟齬は自動的かつ必然的に発生するから。
DONE: 2023-03-20 これ↓を見て await (new Promise()) 的なアレをナニすれば逐次処理が可能になる？→なった。
https://neos21.net/blog/2020/09/29-02.html
結局、クライアント用とサーバー用の common.js と paypal.js を作ることになる。
あちこちで場合分けをすれば共用できないこともないが、それでは保守性が低下して逆効果になるだろう。
*/
if (process.argv.length < 4) {
    console.error('argument(s) missing');
    process.exit(1);
}
const _isDev = (process.argv[2] == '0' ? false : true);
const _isTty = (process.argv[3] == '0' ? false : true);

const _paypal = require('./paypal.js');
const _common = _paypal._common;

PayPal = _paypal.PayPal;

PayPal.setCurrent(_isDev);

_common.LoadConfig(_isDev);

async function RefreshSubscriptions() {
    _common.log(undefined, '>>>>>>> PayPalGetAccessToken()');
    let token_response = await PayPalGetAccessToken();
    //console.log('>>>>>>>token_response', token_response);

    _common.log(undefined, '>>>>>>> LoadSubscriptions()');
    let subscriptions = await LoadSubscriptions();
    //console.log('>>>>>>>subscriptions', subscriptions);

    for (let i = 0; i < subscriptions.length; i++) {
        let subscription = subscriptions[i];
        _common.log(undefined, '>>>>>>> PayPalShowSubscriptionDetails()', 'id=' + subscription.paypal_subscription_id, '(' + i + '/' + subscriptions.length + ')');
        let paypal_subscription = await PayPalShowSubscriptionDetails(subscription.paypal_subscription_id);
        let paypal_status = paypal_subscription.status;
        let status = subscription.status;
        let paypal_start_time = new Date(paypal_subscription.start_time);
        let starting_at = new Date(subscription.starting_at);
        if (paypal_status == status && paypal_start_time.getTime() == starting_at.getTime()) {
            _common.log(undefined, subscription.paypal_subscription_id + ' not updated');
            continue;
        }
        let subscription_updated = await UpdateSubscription(subscription, paypal_subscription);
        if (subscription_updated != undefined) {
            if (_isTty) {
                console.log('>>>>>>>', subscription_updated);
            }
        }
    }
}

function PayPalGetAccessToken() {
    return new Promise(function(resolve, reject) {
        PayPal.getCurrent().getAccessToken({
            on_success: function(response, body_object) {
                PayPal.getCurrent().token_response = body_object;
                //console.log('PayPalGetAccessToken>>>>>>>', body_object);
                resolve(body_object);
            },
            on_failure: function(response, body_string) {
                console.log('PayPalGetAccessToken>>>>>>>', body_string);
                reject(body_string);
            },
            on_error: function(error) {
                reject(error);
            },
            on_timeout: function() {
                reject('request timed out');
            },
            on_complete: function() {
            },
        });
    }).catch(function(e) {
        console.error('>>>>>>>PayPalGetAccessToken(): ' + _common.ToJSON(e));
    });
}

/*
新規に作成されたサブスクリプションを tcpdetective.com の DB に登録出来なかったとき、このやり方では永遠にデータの同期ができない。
データは PayPal から取得しなければならない。
→サポートに問い合わせたら、そもそも「サブスクを列挙する方法は存在しない」とのこと。Event Logs から目で探すか Webhook を使うしか無い（Webhook でサブスクの ID が実際に取れるかどうかは未確認）。
function LoadSubscriptions() {
    return new Promise(function(resolve, reject) {
        _common.CallTCPDetectiveAPI('/api/', 'POST', 1000 * 60 * 10, 'paypal_load_subscriptions', {
            //data: {},
            on_success: function(response, body_object) {
                resolve(body_object.subscriptions);
            },
            on_failure: function(response, body) {
                reject(body);
            },
            on_error: function(error) {
                reject(error);
            },
            on_timeout: function() {
                reject('request timed out');
            },
            on_complete: function() {
                //console.log('>>>>>>>on_complete');
            },
        });
    }).catch(function(e) {
        console.error('>>>>>>>LoadSubscriptions(): ' + _common.ToJSON(e));
    });
}
*/

function LoadSubscriptions() {
    return new Promise(function(resolve, reject) {
        _common.CallTCPDetectiveAPI('/api/', 'POST', 1000 * 60 * 10/*10分*/, 'paypal_load_subscriptions', {
            //data: {},
            on_success: function(response, body_object) {
                resolve(body_object.subscriptions);
            },
            on_failure: function(response, body) {
                reject(body);
            },
            on_error: function(error) {
                reject(error);
            },
            on_timeout: function() {
                reject('request timed out');
            },
            on_complete: function() {
                //console.log('>>>>>>>on_complete');
            },
        });
    }).catch(function(e) {
        console.error('>>>>>>>LoadSubscriptions(): ' + _common.ToJSON(e));
    });
}

function PayPalShowSubscriptionDetails(paypal_subscription_id) {
    return new Promise(function(resolve, reject) {
        PayPal.getCurrent().showSubscriptionDetails({
            id: paypal_subscription_id,
            on_success: function(response, body_object) {
                resolve(body_object);
            },
            on_failure: function(response, body_string) {
                reject(body_string);
            },
            on_error: function(error) {
                reject(error);
            },
            on_timeout: function() {
                reject('request timed out');
            },
            on_complete: function() {
            },
        });
    }).catch(function(e) {
        console.error('>>>>>>>PayPalShowSubscriptionDetails(): ' + _common.ToJSON(e));
    });
}

function UpdateSubscription(subscription, paypal_subscription) {
    //console.log('paypal_subscription>>>>>>>', paypal_subscription);
    return new Promise(function(resolve, reject) {
        _common.CallTCPDetectiveAPI('/api/', 'POST', 7013, 'paypal_update_subscription', {
            data: {
                subscription_id: subscription.id,
                paypal_subscription: paypal_subscription,
            },
            on_success: function(response, body_object) {
                resolve(body_object.subscription);
            },
            on_failure: function(response, body) {
                reject(body);
            },
            on_error: function(error) {
                reject(error);
            },
            on_timeout: function() {
                reject('request timed out');
            },
            on_complete: function() {
            },
        });
    }).catch(function(e) {
        console.error('>>>>>>>UpdateSubscription(): ' + _common.ToJSON(e));
    });
}

RefreshSubscriptions();
