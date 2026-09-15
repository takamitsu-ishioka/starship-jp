/*
./restore_subscriptions.sh

./batch/syncdb.js の修正中に恐ろしいことに気がついた。subscription を列挙する方法が見当たらない！
サポートに問い合わせたところ「無い」とのこと。
つまり、サブスクリプション作成時に ID を保存し損ねた場合、次の 2 つしか ID を知る手段が無い。
1. イベントログから POST /v1/billing/subscriptions を探し、レスポンスを見て ID の値を調べる。
2. webhook を仕掛ける（実際にできるかどうかは未確認）。
いずれにしても、ID を引数として tcpdetective.com API の paypal_add_subscription を呼び出す CUI コマンドが必要
*/
if (process.argv.length < 5) {
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

async function RestoreSubscriptions() {
    _common.log(undefined, '>>>>>>> PayPalGetAccessToken()');
    let token_response = await PayPalGetAccessToken();
    //console.log('>>>>>>>token_response', token_response);

    let total_subscription_count = process.argv.length - 4;
    let subscription_count = 0;
    for (let argi = 4; argi < process.argv.length; argi++) {
        subscription_count++;
        let subscription_id = process.argv[argi];
        _common.log(undefined, '>>>>>>> PayPalShowSubscriptionDetails()', 'id=' + subscription_id, '(' + subscription_count + '/' + total_subscription_count + ')');
        let subscription = await PayPalShowSubscriptionDetails(subscription_id);
        console.log(subscription);
/*
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
*/
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

function AddSubscription(subscription, paypal_subscription) {
    //console.log('paypal_subscription>>>>>>>', paypal_subscription);
    return new Promise(function(resolve, reject) {
        _common.CallTCPDetectiveAPI('/api/', 'POST', 7013, 'paypal_add_subscription', {
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

RestoreSubscriptions();
