
////////////////////////////////////////////////////////////////////////
// PayPal - PayPal API client

PayPal.MAX_DESCRIPTION_LENGTH = 256;    // NOTE: これだけは残す。

function PayPal(isDev) {
    // 環境別定数
    this.isDev = isDev;
    // アクセストークンを取得する
    this.getAccessToken = function(argv) {
        CallStarshipAPI('/api/', 'POST', 7013, 'paypal_get_access_token', {
            data: {},
            wait_cursor: argv.wait_cursor,
            success: function(response) {
                //this.token_response = response; DONE: これでは代入の効果がない。メンバー関数内の this は、コンストラクタの this のコピーらしい。
                PayPal.getCurrent().token_response = response;  // こうすると実際に代入される。
                if (argv.success) {
                    argv.success(response);
                }
            },
            error: function(response) {
                Console.debug(response, '>>>>>>> response:');
                if (argv.error) {
                    argv.error(response);
                }
            },
            fatal: function(xhr) {
                var log = {
                    status: xhr.status,
                    headers: xhr.getAllResponseHeaders().split(/\r\n/),
                    response: xhr.responseJSON ? xhr.responseJSON : null,
                };
                Console.debug(log, '>>>>>>> xhr:');
                if (argv.fatal) {
                    argv.fatal(xhr);
                }
            },
            complete: function(xhr) {
                if (argv.complete) {
                    argv.complete(xhr);
                }
            },
        });
    }
    // 製品のリストを取得する
    this.listProducts = function(argv) {
        if (this.token_response == undefined || this.token_response.access_token == undefined) {
            throw 'PayPal.getProducts(): Call getAccessToken() first.';
        }
        CallStarshipAPI('/api/', 'POST', 7013, 'paypal_list_products', {
            data: {},
            wait_cursor: argv.wait_cursor,
            success: function(response) {
                if (argv.success) {
                    argv.success(response);
                }
            },
            error: function(response) {
                Console.debug(response, '>>>>>>> response:');
                if (argv.error) {
                    argv.error(response);
                }
            },
            fatal: function(xhr) {
                var log = {
                    status: xhr.status,
                    headers: xhr.getAllResponseHeaders().split(/\r\n/),
                    response: xhr.responseJSON ? xhr.responseJSON : null,
                };
                Console.debug(log, '>>>>>>> xhr:');
                if (argv.fatal) {
                    argv.fatal(xhr);
                }
            },
            complete: function(xhr) {
                if (argv.complete) {
                    argv.complete(xhr);
                }
            },
        });
    }
    // 製品の詳細を取得する
    this.showProduct = function(argv) {
        if (this.token_response == undefined || this.token_response.access_token == undefined) {
            throw 'PayPal.showProduct(): Call getAccessToken() first.';
        }
        if (argv.id == undefined) {
            throw 'PayPal.showProduct(): id missing';
        }
        CallStarshipAPI('/api/', 'POST', 7013, 'paypal_show_product', {
            data: {
                id: argv.id,
            },
            wait_cursor: argv.wait_cursor,
            success: function(response) {
                if (argv.success) {
                    argv.success(JSON.parse(response.paypal_product.product_json));
                }
            },
            error: function(response) {
                Console.debug(response, '>>>>>>> PayPal.showProduct(): error: response:');
                if (argv.error) {
                    argv.error(response);
                }
            },
            fatal: function(xhr) {
                var log = {
                    status: xhr.status,
                    headers: xhr.getAllResponseHeaders().split(/\r\n/),
                    response: xhr.responseJSON ? xhr.responseJSON : null,
                };
                Console.debug(log, '>>>>>>> PayPal.showProduct(): fatal: xhr:');
                if (argv.fatal) {
                    argv.fatal(xhr);
                }
            },
            complete: function(xhr) {
                if (argv.complete) {
                    argv.complete(xhr);
                }
            },
        });
    }
    // 製品を更新する
    this.updateProduct = function(argv) {
        if (argv.bCreate) {
            this.createProduct(argv);
            return;
        }
        if (this.token_response == undefined || this.token_response.access_token == undefined) {
            throw 'PayPal.updateProduct(): Call getAccessToken() first.';
        }
        if (argv.id == undefined) {
            throw 'PayPal.updateProduct(): id missing';
        }
        CallStarshipAPI('/api/', 'POST', 7013, 'paypal_update_product', {
            data: {
                id: argv.id,
                name: argv.name,
                description: argv.description,
                home_url: argv.home_url,
                image_url: argv.image_url,
            },
            wait_cursor: argv.wait_cursor,
            success: function(response) {
                if (argv.success) {
                    argv.success(response);
                }
            },
            error: function(response) {
                Console.debug(response, '>>>>>>> response:');
                if (argv.error) {
                    argv.error(response);
                }
            },
            fatal: function(xhr) {
                var log = {
                    status: xhr.status,
                    headers: xhr.getAllResponseHeaders().split(/\r\n/),
                    response: xhr.responseJSON ? xhr.responseJSON : null,
                };
                Console.debug(log, '>>>>>>> xhr:');
                if (argv.fatal) {
                    argv.fatal(xhr);
                }
            },
            complete: function(xhr) {
                if (argv.complete) {
                    argv.complete(xhr);
                }
            },
        });
    }
    // 製品を作成する
    this.createProduct = function(argv) {
        if (this.token_response == undefined || this.token_response.access_token == undefined) {
            throw 'PayPal.createProduct(): Call getAccessToken() first.';
        }
        if (argv.id == undefined) {
        } else {
            if (typeof argv.id == 'string') {
                if (argv.id.length < 6) {
                    throw 'PayPal.createProduct(): id too short (min==6)';
                } else if (50 < argv.id.length) {
                    throw 'PayPal.createProduct(): id too long (max==50)';
                }
            } else {
                throw 'PayPal.createProduct(): typeof id invalid';
            }
        }
        if (argv.name == undefined) {
            throw 'PayPal.createProduct(): name missing';
        }
        if (argv.description == undefined) {
            throw 'PayPal.createProduct(): description missing';
        }
        if (PayPal.MAX_DESCRIPTION_LENGTH < argv.description.length) {
            throw 'PayPal.createProduct(): description too long (max==' + PayPal.MAX_DESCRIPTION_LENGTH + ')';
        }
        if (argv.home_url == undefined) {
            throw 'PayPal.createProduct(): home_url missing';
        }
        if (argv.image_url == undefined) {
            throw 'PayPal.createProduct(): image_url missing';
        }
        let data = {
            id: argv.id,
            name: argv.name,
            description: argv.description,
            home_url: argv.home_url,
            image_url: argv.image_url,
        };
        //Console.debug(data, '>>>>>>> data:');
        CallStarshipAPI('/api/', 'POST', 7013, 'paypal_create_product', {
            data: data,
            wait_cursor: argv.wait_cursor,
            success: function(response) {
                if (argv.success) {
                    argv.success(response);
                }
            },
            error: function(response) {
                Console.debug(response, '>>>>>>> response:');
                if (argv.error) {
                    argv.error(response);
                }
            },
            fatal: function(xhr) {
                var log = {
                    status: xhr.status,
                    headers: xhr.getAllResponseHeaders().split(/\r\n/),
                    response: xhr.responseJSON ? xhr.responseJSON : null,
                };
                Console.debug(log, '>>>>>>> xhr:');
                if (argv.fatal) {
                    argv.fatal(xhr);
                }
            },
            complete: function(xhr) {
                if (argv.complete) {
                    argv.complete(xhr);
                }
            },
        });
    }
    // 製品を無効化する（これは PayPal の機能ではなく tcpdetective.com の機能）
    this.deactivateProduct = function(argv) {
        // access_token
        if (this.token_response == undefined || this.token_response.access_token == undefined) {
            throw 'PayPal.deactivateProduct(): Call getAccessToken() first.';
        }
        // body
        if (argv.id == undefined) {
            throw 'PayPal.deactivateProduct(): id missing';
        }
        // API call
        CallStarshipAPI('/api/', 'POST', 7013, 'paypal_deactivate_product', {
            data: {
                id: argv.id,
            },
            wait_cursor: argv.wait_cursor,
            success: function(response) {
                if (argv.success) {
                    argv.success(JSON.parse(response.paypal_product.product_json));
                }
            },
            error: function(response) {
                Console.debug(response, '>>>>>>> response:');
                if (argv.error) {
                    argv.error(response);
                }
            },
            fatal: function(xhr) {
                var log = {
                    status: xhr.status,
                    headers: xhr.getAllResponseHeaders().split(/\r\n/),
                    response: xhr.responseJSON ? xhr.responseJSON : null,
                };
                Console.debug(log, '>>>>>>> xhr:');
                if (argv.fatal) {
                    argv.fatal(xhr);
                }
            },
            complete: function(xhr) {
                if (argv.complete) {
                    argv.complete(xhr);
                }
            },
        });
    }
    // 製品を有効化する（これは PayPal の機能ではなく tcpdetective.com の機能）
    this.activateProduct = function(argv) {
        // access_token
        if (this.token_response == undefined || this.token_response.access_token == undefined) {
            throw 'PayPal.activateProduct(): Call getAccessToken() first.';
        }
        // body
        if (argv.id == undefined) {
            throw 'PayPal.activateProduct(): id missing';
        }
        // API call
        CallStarshipAPI('/api/', 'POST', 7013, 'paypal_activate_product', {
            data: {
                id: argv.id,
            },
            wait_cursor: argv.wait_cursor,
            success: function(response) {
                if (argv.success) {
                    argv.success(JSON.parse(response.paypal_product.product_json));
                }
            },
            error: function(response) {
                Console.debug(response, '>>>>>>> response:');
                if (argv.error) {
                    argv.error(response);
                }
            },
            fatal: function(xhr) {
                var log = {
                    status: xhr.status,
                    headers: xhr.getAllResponseHeaders().split(/\r\n/),
                    response: xhr.responseJSON ? xhr.responseJSON : null,
                };
                Console.debug(log, '>>>>>>> xhr:');
                if (argv.fatal) {
                    argv.fatal(xhr);
                }
            },
            complete: function(xhr) {
                if (argv.complete) {
                    argv.complete(xhr);
                }
            },
        });
    }
    // プランのリストを取得する
    this.listPlans = function(argv) {
        // access_token
        if (this.token_response == undefined || this.token_response.access_token == undefined) {
            throw 'PayPal.listPlans(): Call getAccessToken() first.';
        }
        // body
        if (argv.product_id == undefined) {
            throw 'PayPal.listPlans(): product_id missing';
        }
        // API call
        CallStarshipAPI('/api/', 'POST', 7013, 'paypal_list_plans', {
            data: {
                product_id: argv.product_id,
            },
            wait_cursor: argv.wait_cursor,
            success: function(response) {
                //Console.debug(response, '>>>>>>> response:');
                if (argv.success) {
                    argv.success(response);
                }
            },
            error: function(response) {
                Console.debug(response, '>>>>>>> response:');
                if (argv.error) {
                    argv.error(response);
                }
            },
            fatal: function(xhr) {
                var log = {
                    status: xhr.status,
                    headers: xhr.getAllResponseHeaders().split(/\r\n/),
                    response: xhr.responseJSON ? xhr.responseJSON : null,
                };
                Console.debug(log, '>>>>>>> xhr:');
                if (argv.fatal) {
                    argv.fatal(xhr);
                }
            },
            complete: function(xhr) {
                if (argv.complete) {
                    argv.complete(xhr);
                }
            },
        });
    }
    // プランの詳細を取得する
    this.showPlan = function(argv) {
        if (this.token_response == undefined || this.token_response.access_token == undefined) {
            throw 'PayPal.showPlan(): Call getAccessToken() first.';
        }
        if (argv.plan_id == undefined) {
            throw 'PayPal.showPlan(): plan_id missing';
        }
        CallStarshipAPI('/api/', 'POST', 7013, 'paypal_show_plan', {
            data: {
                plan_id: argv.plan_id,
            },
            wait_cursor: argv.wait_cursor,
            success: function(response) {
                if (argv.success) {
                    argv.success(response);
                }
            },
            error: function(response) {
                Console.debug(response, '>>>>>>> response:');
                if (argv.error) {
                    argv.error(response);
                }
            },
            fatal: function(xhr) {
                var log = {
                    status: xhr.status,
                    headers: xhr.getAllResponseHeaders().split(/\r\n/),
                    response: xhr.responseJSON ? xhr.responseJSON : null,
                };
                Console.debug(log, '>>>>>>> xhr:');
                if (argv.fatal) {
                    argv.fatal(xhr);
                }
            },
            complete: function(xhr) {
                if (argv.complete) {
                    argv.complete(xhr);
                }
            },
        });
    }
    // プランを作成する
    this.createPlan = function(argv) {
        // access_token
        if (this.token_response == undefined || this.token_response.access_token == undefined) {
            throw 'PayPal.createPlan(): Call getAccessToken() first.';
        }
        // body
        if (argv.product_id == undefined) {
            throw 'PayPal.createPlan(): product_id missing';
        }
        if (argv.name == undefined) {
            throw 'PayPal.createPlan(): name missing';
        }
        if (argv.description == undefined) {
            throw 'PayPal.createPlan(): description missing';
        }
        if (argv.billing_cycles == undefined) {
            throw 'PayPal.createPlan(): billing_cycles missing';
        }
        if (argv.payment_preferences == undefined) {
            throw 'PayPal.createPlan(): payment_preferences missing';
        }
        if (argv.taxes == undefined) {
            throw 'PayPal.createPlan(): taxes missing';
        }
        // API call
        CallStarshipAPI('/api/', 'POST', 7013, 'paypal_create_plan', {
            data: {
                product_id: argv.product_id,
                name: argv.name,
                description: argv.description,
                billing_cycles: argv.billing_cycles,
                payment_preferences: argv.payment_preferences,
                taxes: argv.taxes,
            },
            wait_cursor: argv.wait_cursor,
            success: function(response) {
                if (argv.success) {
                    argv.success(response);
                }
            },
            error: function(response) {
                Console.debug(response, '>>>>>>> response:');
                if (argv.error) {
                    argv.error(response);
                }
            },
            fatal: function(xhr) {
                var log = {
                    status: xhr.status,
                    headers: xhr.getAllResponseHeaders().split(/\r\n/),
                    response: xhr.responseJSON ? xhr.responseJSON : null,
                };
                Console.debug(log, '>>>>>>> xhr:');
                if (argv.fatal) {
                    argv.fatal(xhr);
                }
            },
            complete: function(xhr) {
                if (argv.complete) {
                    argv.complete(xhr);
                }
            },
        });
    }
    // プランを無効化する
    this.deactivatePlan = function(argv) {
        // access_token
        if (this.token_response == undefined || this.token_response.access_token == undefined) {
            throw 'PayPal.deactivatePlan(): Call getAccessToken() first.';
        }
        // body
        if (argv.plan_id == undefined) {
            throw 'PayPal.deactivatePlan(): plan_id missing';
        }
        // API call
        CallStarshipAPI('/api/', 'POST', 7013, 'paypal_deactivate_plan', {
            data: {
                plan_id: argv.plan_id,
            },
            wait_cursor: argv.wait_cursor,
            success: function(response) {
                if (argv.success) {
                    argv.success(response);
                }
            },
            error: function(response) {
                Console.debug(response, '>>>>>>> response:');
                if (argv.error) {
                    argv.error(response);
                }
            },
            fatal: function(xhr) {
                var log = {
                    status: xhr.status,
                    headers: xhr.getAllResponseHeaders().split(/\r\n/),
                    response: xhr.responseJSON ? xhr.responseJSON : null,
                };
                Console.debug(log, '>>>>>>> xhr:');
                if (argv.fatal) {
                    argv.fatal(xhr);
                }
            },
            complete: function(xhr) {
                if (argv.complete) {
                    argv.complete(xhr);
                }
            },
        });
    }
    // プランを有効化する
    this.activatePlan = function(argv) {
        // access_token
        if (this.token_response == undefined || this.token_response.access_token == undefined) {
            throw 'PayPal.activatePlan(): Call getAccessToken() first.';
        }
        // body
        if (argv.plan_id == undefined) {
            throw 'PayPal.activatePlan(): plan_id missing';
        }
        // API call
        CallStarshipAPI('/api/', 'POST', 7013, 'paypal_activate_plan', {
            data: {
                plan_id: argv.plan_id,
            },
            wait_cursor: argv.wait_cursor,
            success: function(response) {
                if (argv.success) {
                    argv.success(response);
                }
            },
            error: function(response) {
                Console.debug(response, '>>>>>>> response:');
                if (argv.error) {
                    argv.error(response);
                }
            },
            fatal: function(xhr) {
                var log = {
                    status: xhr.status,
                    headers: xhr.getAllResponseHeaders().split(/\r\n/),
                    response: xhr.responseJSON ? xhr.responseJSON : null,
                };
                Console.debug(log, '>>>>>>> xhr:');
                if (argv.fatal) {
                    argv.fatal(xhr);
                }
            },
            complete: function(xhr) {
                if (argv.complete) {
                    argv.complete(xhr);
                }
            },
        });
    }
    // サブスクリプションを作成する。
    this.createSubscription = function(argv) {
        /*
        サブスクリプションの作成は paypal.Buttons() で行う。
        REST API でもできるはずだが、面倒臭そうだしサンプルコードが無いのでやめておく。
        ../includes/subscribe.html の CreatePayPalButtons() を参照。
        */
        throw 'PayPal.createSubscription(): Not implemented.';
    }
    // サブスクリプションの詳細な情報を取得する。
    this.showSubscriptionDetails = function(argv) {
        Console.debug('PayPal.showSubscriptionDetails()');
        if (this.token_response == undefined || this.token_response.access_token == undefined) {
            throw 'PayPal.showSubscriptionDetails(): Call getAccessToken() first.';
        }
        if (argv.id == undefined) {
            throw 'PayPal.showSubscriptionDetails(): id missing';
        }
        // API call
        let data = {
            paypal_subscription_id: argv.id,
        };
        CallStarshipAPI('/api/', 'POST', 7013, 'paypal_show_subscription_details', {
            data: data,
            wait_cursor: argv.wait_cursor,
            success: argv.success,
            error: function(response) {
                ShowAPIErrorDialog({
                    data: data,         // _command は、この時点で data のプロパティになっている
                    response: response,
                });
            },
            fatal: function(xhr) {
                ShowHTTPErrorDialog({
                    data: data,         // _command は、この時点で data のプロパティになっている
                    xhr: xhr,
                });
            },
        });
    }
    // サブスクリプションをキャンセルする
    this.cancelSubscription = function(argv) {
        // access_token
        if (this.token_response == undefined || this.token_response.access_token == undefined) {
            throw 'PayPal.cancelSubscription(): Call getAccessToken() first.';
        }
        // body
        if (argv.id == undefined) {
            throw 'PayPal.cancelSubscription(): id missing';
        }
        if (argv.reason == undefined) {
            throw 'PayPal.cancelSubscription(): reason missing';
        }
        if (typeof argv.reason != 'string') {
            throw 'PayPal.cancelSubscription(): reason not a string';
        }
        if (argv.reason.length < 1) {
            throw 'PayPal.cancelSubscription(): reason too short';
        }
        if (128 < argv.reason.length) {
            throw 'PayPal.cancelSubscription(): reason too long';
        }
        // API call
        let data = {
            paypal_subscription_id: argv.id,
            reason: argv.reason,
        };
        CallStarshipAPI('/api/', 'POST', 7013, 'paypal_cancel_subscription', {
            data: data,
            wait_cursor: argv.wait_cursor,
            success: argv.success,
            error: function(response) {
                ShowAPIErrorDialog({
                    data: data,         // _command は、この時点で data のプロパティになっている
                    response: response,
                });
            },
            fatal: function(xhr) {
                ShowHTTPErrorDialog({
                    data: data,         // _command は、この時点で data のプロパティになっている
                    xhr: xhr,
                });
            },
        });
    }

    // サブスクリプションをアクティブにする
    this.activateSubscription = function(argv) {
        // access_token
        if (this.token_response == undefined || this.token_response.access_token == undefined) {
            throw 'PayPal.activateSubscription(): Call getAccessToken() first.';
        }
        // body
        if (argv.id == undefined) {
            throw 'PayPal.activateSubscription(): id missing';
        }
        if (argv.reason == undefined) {
            throw 'PayPal.activateSubscription(): reason missing';
        }
        if (typeof argv.reason != 'string') {
            throw 'PayPal.activateSubscription(): reason not a string';
        }
        if (argv.reason.length < 1) {
            throw 'PayPal.activateSubscription(): reason too short';
        }
        if (128 < argv.reason.length) {
            throw 'PayPal.activateSubscription(): reason too long';
        }
        // API call
        let data = {
            paypal_subscription_id: argv.id,
            reason: argv.reason,
        };
        CallStarshipAPI('/api/', 'POST', 7013, 'paypal_activate_subscription', {
            data: data,
            wait_cursor: argv.wait_cursor,
            success: argv.success,
            error: function(response) {
                ShowAPIErrorDialog({
                    data: data,         // _command は、この時点で data のプロパティになっている
                    response: response,
                });
            },
            fatal: function(xhr) {
                ShowHTTPErrorDialog({
                    data: data,         // _command は、この時点で data のプロパティになっている
                    xhr: xhr,
                });
            },
        });
    }
    // サブスクリプションを一時停止する
    this.suspendSubscription = function(argv) {
        // access_token
        if (this.token_response == undefined || this.token_response.access_token == undefined) {
            throw 'PayPal.suspendSubscription(): Call getAccessToken() first.';
        }
        // body
        if (argv.id == undefined) {
            throw 'PayPal.suspendSubscription(): id missing';
        }
        if (argv.reason == undefined) {
            throw 'PayPal.suspendSubscription(): reason missing';
        }
        if (typeof argv.reason != 'string') {
            throw 'PayPal.suspendSubscription(): reason not a string';
        }
        if (argv.reason.length < 1) {
            throw 'PayPal.suspendSubscription(): reason too short';
        }
        if (128 < argv.reason.length) {
            throw 'PayPal.suspendSubscription(): reason too long';
        }
        // API call
        let data = {
            paypal_subscription_id: argv.id,
            reason: argv.reason,
        };
        CallStarshipAPI('/api/', 'POST', 7013, 'paypal_suspend_subscription', {
            data: data,
            wait_cursor: argv.wait_cursor,
            success: argv.success,
            error: function(response) {
                ShowAPIErrorDialog({
                    data: data,         // _command は、この時点で data のプロパティになっている
                    response: response,
                });
            },
            fatal: function(xhr) {
                ShowHTTPErrorDialog({
                    data: data,         // _command は、この時点で data のプロパティになっている
                    xhr: xhr,
                });
            },
        });
    }
}
/*
PayPal の設定をロードし、SDK もロードする（ボタンを表示する paypal.Buttons() を呼び出すため）。
jquery を使うとキャッシュを回避するため（？）のクエリーパラメータを追加してしまい、それがサーバーによって拒否され、SDK をロードできない。
そこでここでだけ直接 DOM を操作する。
index.html の head に直接書かないのは開発環境と商用環境で client_id が違うため。
*/
PayPal._sdk_uri;
PayPal._client_id;
PayPal.loadConfig = function() {
    if (PayPal._sdk_uri != undefined) {
        return;
    }
    if (User.getCurrent().isGuest()) {
        return;
    }
    //Console.debug('PayPal.loadConfig()');
    let data = {};
    CallStarshipAPI('/api/', 'POST', 7013, 'paypal_load_config', {
        data: data,
        wait_cursor: {
            classname: 'cursor_wait',
            containers: [$('body'), $('button'), $('input')],
        },
        success: function(response) {
            //Console.debug(response, '>>>>>>> PayPal.loadConfig(): response');
            PayPal._sdk_uri = response.sdk_uri;
            PayPal._client_id = response.client_id;
            //let sdk_script_src = PayPal._sdk_uri + '?client-id=' + PayPal._client_id + '&vault=true&intent=subscription&locale=en_US';
            let sdk_script_src = PayPal._sdk_uri + '?client-id=' + PayPal._client_id + '&vault=true&intent=subscription';
            let head = document.getElementsByTagName('head')[0];
            let sdk_script = document.createElement('script');
            sdk_script.type = 'text/javascript';
            sdk_script.src = sdk_script_src;
            head.appendChild(sdk_script);

            PayPal.getCurrent().product_id = response.product_id;
            PayPal.getCurrent().plan_id = response.plan_id;
            PayPal.getCurrent().plan_name = response.plan_name;
        },
        error: function(response) {
            ShowAPIErrorDialog({
                data: data,         // _command は、この時点で data のプロパティになっている
                response: response,
            });
        },
        fatal: function(xhr) {
            ShowHTTPErrorDialog({
                data: data,         // _command は、この時点で data のプロパティになっている
                xhr: xhr,
            });
        },
        complete: function(xhr) {
        },
    });
};
PayPal._current;
PayPal.setCurrent = function(isDev) {
    PayPal._current = new PayPal(isDev);
};
PayPal.getCurrent = function() {
    return PayPal._current;
};

/*
PayPalSubscription - PayPal subscription
当初の設計では
PayPal: クライアントから直接 PayPal API を呼び出すクラス
PayPalSubscription: tcpdetective.com API を呼び出すクラス
という役割分担だったが、その構成では重大な脆弱性があることに気づき、PayPal のメソッドも tcpdetective.com API を呼び出す形に変更した。
従って、本来なら PayPalSubscription クラスは PayPal クラスに吸収して廃止すべきところだが、そうすると改造のコストが大きいので当面、このままとする。
*/
function PayPalSubscription() {
}
PayPalSubscription._statuses = {
    APPROVAL_PENDING: 'pending',
    APPROVED: 'approved',
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
};
PayPalSubscription.statusNameToLabel = function(name) {
    return PayPalSubscription._statuses[name];
};
PayPalSubscription.responseToMap = function(response) {
    PayPalSubscription._map = {};
    for (var i = 0; i < response.subscriptions.length; i++) {
        var subscription = response.subscriptions[i];
        PayPalSubscription._map[subscription.id] = subscription;
    }
};
PayPalSubscription.getMap = function() {
    return PayPalSubscription._map;
};
PayPalSubscription.getById = function(id) {
    return PayPalSubscription._map[id];
};
PayPalSubscription.set = function(subscription) {
    return PayPalSubscription._map[subscription.id] = subscription;
};
PayPalSubscription.load = function(argv) {
    CallStarshipAPI('/api/', 'POST', 21013, 'paypal_load_subscriptions', {
        data: {},
        wait_cursor: {
            classname: 'cursor_wait',
            containers: [$('body'), $('button'), $('input')],
        },
        success: function(response) {
            PayPalSubscription.responseToMap(response);
            if (argv.success) {
                argv.success(response);
            }
        },
        error: function(response) {
            ShowAPIErrorDialog({
                data: data,         // _command は、この時点で data のプロパティになっている
                response: response,
            });
        },
        fatal: function(xhr) {
            ShowHTTPErrorDialog({
                data: data,         // _command は、この時点で data のプロパティになっている
                xhr: xhr,
            });
        },
        complete: function(xhr) {
            if (argv.complete) {
                argv.complete(xhr);
            }
        },
    });
};
PayPalSubscription.getByHostName = function(host_name) {
    for (var id in PayPalSubscription._map) {
        var subscription = PayPalSubscription._map[id];
        if (subscription.host_name == host_name) {
            return subscription;
        }
    }
    return undefined;
};
PayPalSubscription.add = function(argv) {
    /*
    argv.data.status_code = 500;
    argv.data.status_message = 'Internal Server Error';
    argv.data.html_title = 'Internal Server Error';
    argv.data.html_body = '<h1>HTTP/1.1 500 Internal Server Error</h1>';
    CallStarshipAPI('/api/', 'POST', 21013, 'generate_http_error', {
    */
    CallStarshipAPI('/api/', 'POST', 21013, 'paypal_add_subscription', {
        data: argv.data,
        wait_cursor: {
            classname: 'cursor_wait',
            containers: [$('body'), $('button'), $('input')],
        },
        success: function(response) {
            PayPalSubscription.responseToMap(response);
            if (argv.success) {
                argv.success(response);
            }
        },
        error: function(response) {
            console.log('>>>>>>>code: ' + response.code + '\n' + '>>>>>>>message: ' + response.message);
            if (argv.error) {
                argv.error(response);
            }
        },
        fatal: function(xhr) {
            var log = {
                status: xhr.status,
                headers: xhr.getAllResponseHeaders().split(/\r\n/),
                response: xhr.responseJSON ? xhr.responseJSON : null,
            };
            var strLog = JSON.stringify(log, null, '    ');
            console.log('>>>>>>>', strLog);
            alert(strLog);
            if (argv.fatal) {
                argv.fatal(xhr);
            }
        },
        complete: function(xhr) {
            if (argv.complete) {
                argv.complete(xhr);
            }
        },
    });
};
PayPalSubscription.updateStatus = function(argv) {
    CallStarshipAPI('/api/', 'POST', 21013, 'paypal_update_subscription', {
        data: argv.data,
        wait_cursor: argv.wait_cursor,
        success: function(response) {
            var subscription = PayPalSubscription.set(response.subscription);
            if (argv.success) {
                argv.success(response);
            }
        },
        error: function(response) {
            console.log('>>>>>>>code: ' + response.code + '\n' + '>>>>>>>message: ' + response.message);
            if (argv.error) {
                argv.error(response);
            }
        },
        fatal: function(xhr) {
            var log = {
                status: xhr.status,
                headers: xhr.getAllResponseHeaders().split(/\r\n/),
                response: xhr.responseJSON ? xhr.responseJSON : null,
            };
            var strLog = JSON.stringify(log, null, '    ');
            console.log('>>>>>>>', strLog);
            alert(strLog);
            if (argv.fatal) {
                argv.fatal(xhr);
            }
        },
        complete: function(xhr) {
            if (argv.complete) {
                argv.complete(xhr);
            }
        },
    });
};

/*
node.js のスクリプトから require() で読み込むための処置
DONE: この方法で関数を使う案はボツ。common.js で jquery を多用しているので node.js からは関数は使用不能。
PayPal.* の定数だけ使う。
DONE: 230620 それ↑もやめた。理由は PayPalSubscription クラスの能書きを参照。
if (typeof module != 'undefined') {
    module.exports = {
        PayPal: PayPal,
        //PayPalSubscription: PayPalSubscription,
    };
}
*/
