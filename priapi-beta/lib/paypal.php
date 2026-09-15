<?php

require_once(dirname(__FILE__) . '/misc.php');
require_once(dirname(__FILE__) . '/config.php');
require_once(dirname(__FILE__) . '/curl.php');

class PayPal {
    const PAYPAL_PLAN_STATUSES = [
        'CREATED',
        'INACTIVE',
        'ACTIVE',
    ];
    const PAYPAL_SUBSCRIPTION_STATUSES = [
        'APPROVAL_PENDING',
        'APPROVED',
        'ACTIVE',
        'SUSPENDED',
        'CANCELLED',
        'EXPIRED',      // なんといつの間にか配列の最後の要素の後のカンマが許されるようになっている！ChatGPT氏によれば「非常に早い段階、PHP4 以前から」許可されていたそうな…
    ];
    private $db = NULL;
    private $curl = NULL;
    private $access_token = NULL;

    function __construct($db) {
        try {
            if (ENV == 'DEV') {
                define('PAYPAL_SERVER',         'https://api-m.sandbox.paypal.com');
                define('PAYPAL_CLIENT_ID',      Env('PAYPAL_CLIENT_ID_DEV'));
                define('PAYPAL_CLIENT_SECRET',  Env('PAYPAL_CLIENT_SECRET_DEV'));
            } else {
                define('PAYPAL_SERVER',         'https://api-m.paypal.com');
                define('PAYPAL_CLIENT_ID',      Env('PAYPAL_CLIENT_ID_REL'));
                define('PAYPAL_CLIENT_SECRET',  Env('PAYPAL_CLIENT_SECRET_REL'));
            }
            define('PAYPAL_APP_ID',             1);
            define('PAYPAL_TOKEN_PATH',         '/v1/oauth2/token');
            define('PAYPAL_PRODUCTS_PATH',      '/v1/catalogs/products');
            define('PAYPAL_PLANS_PATH',         '/v1/billing/plans');
            define('PAYPAL_SUBSCRIPTIONS_PATH', '/v1/billing/subscriptions');
            // ↑これらの定数は、初め ./config.php に書いていたがそれは変だということに気づいてこっちに移した。
            // 本来は PayPal クラスの const とすべきだが、そうすると参照のコードの書き換えが大量に発生するので日和っておく。
            // あと、const は if (ENV == 'DEV') のような分岐ができない。
            define('PAYPAL_SDK_URI',        'https://www.paypal.com/sdk/js');

            $this->db = $db;
            $this->curl = new Curl();
            $result = $this->db->Query("SELECT * FROM paypal_access_tokens WHERE id = 1");
            $access_token = pg_fetch_object($result);
            if (!$access_token) {
                throw new Exception("can't get access token");
            }
            $this->access_token = $access_token->access_token;
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    public function GetAccessToken($o) {
        try {
            $uri = sprintf('%s%s', PAYPAL_SERVER, PAYPAL_TOKEN_PATH);
            $auth = [
                'user' => PAYPAL_CLIENT_ID,
                'password' => PAYPAL_CLIENT_SECRET
            ];
            $data = [
                'grant_type' => 'client_credentials'
            ];
            $response_json = $this->curl->Post(NULL, NULL, $uri, $auth, $data);
            $status_code = $this->curl->GetStatusCode();
            if ($status_code != 200) {
                throw new Exception("$uri returned $status_code");
            }
            $response_object = json_decode($response_json);
            if (!$response_object || !isset($response_object->access_token)) {
                throw new Exception("invalid response from $uri: " . json_encode($response_json, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            }
            $access_token_ = DB::Quote($response_object->access_token);
            $response_ = DB::Quote($response_json);
            $sql = <<<SQL
UPDATE paypal_access_tokens SET
access_token = $access_token_,
expires_in = {$response_object->expires_in},
response = $response_
WHERE id = 1
RETURNING *
SQL;
            $result = $this->db->Query($sql);
            $paypal_access_token = pg_fetch_object($result);
            return $paypal_access_token;
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    public function LoadConfig($o) {
        try {
            // ACTIVE な製品
            $app_id = PAYPAL_APP_ID;
            $active_ = DB::Quote('ACTIVE');
            $result = $this->db->Query("SELECT product_id FROM paypal_products WHERE app_id = $app_id AND status = $active_");
            $product_ids = pg_fetch_all_columns($result, 0);
            if (!$product_ids || !is_array($product_ids)) {
                throw new Exception('DB table paypal_products corrupt');
            }
            $product_id_count = count($product_ids);
            if ($product_id_count < 1) {
                throw new Exception('no active paypal product found');
            }
            if (1 < $product_id_count) {
                throw new Exception('too many active paypal products found');
            }
            $product_id = $product_ids[0];

            // その製品のプラン
            $uri = sprintf('%s%s', PAYPAL_SERVER, PAYPAL_PLANS_PATH);
            $data = [
                'product_id' => $product_id
            ];
            $headers = ['Authorization: Bearer ' . $this->access_token];
            $response_json = $this->curl->Get(NULL, NULL, $uri, NULL, $data, $headers);
            $status_code = $this->curl->GetStatusCode();
            $response_object = json_decode($response_json);
            if ($status_code != 200) {
                throw new Exception("$uri returned $status_code: " . Misc::pretty_print_json($response_json));
            }
            $plan_active = NULL;
            foreach ($response_object->plans as $plan) {
                // アクティブなプラン
                if ($plan->status == 'ACTIVE') {
                    if (isset($plan_active)) {
                        throw new Exception("too many active plans for product $product_id");
                    }
                    $plan_active = $plan;
                }
            }
            return [
                'sdk_uri' => PAYPAL_SDK_URI,
                'client_id' => PAYPAL_CLIENT_ID,
                'product_id' => $product_id,
                'plan_id' => $plan_active->id,
                'plan_name' => $plan_active->name,
            ];
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    public function ListProducts($o) {
        try {
            $uri = sprintf('%s%s', PAYPAL_SERVER, PAYPAL_PRODUCTS_PATH);
            $headers = ['Authorization: Bearer ' . $this->access_token];
            $data = [
                'page' => 1,
                'page_size' => 20,
                'total_required' => 'true'  // 文字列にしないと http_build_query() によって true は 1 に、false は空文字列に変換されてしまうので。てゆうか x-www-form-urlencoded に boolean という型は無いんだから、仕様書に boolean と書いた PayPal のミス。GET なのに application/json とか書いてあるし。変でしょ？
            ];
            $response_json = $this->curl->Get(NULL, NULL, $uri, NULL, $data, $headers);
            $status_code = $this->curl->GetStatusCode();
            $response_object = json_decode($response_json);
            if ($status_code != 200) {
                throw new Exception("$uri returned $status_code: " . json_encode($response_object, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            }
            if (!$response_object) {
                throw new Exception("invalid response from $uri: $response_json");
            }
            return $response_object;
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    public function ShowProduct($o) {
        try {
            if (!isset($o->id)) {
                throw new Exception('id missing');
            }
            if (!is_string($o->id)) {
                throw new Exception('type of id wrong');
            }
            if (strlen($o->id) < 6) {
                throw new Exception('id too short');
            }
            if (50 < strlen($o->id)) {
                throw new Exception('id too long');
            }
            $uri = sprintf('%s%s/%s', PAYPAL_SERVER, PAYPAL_PRODUCTS_PATH, $o->id);
            $headers = ['Authorization: Bearer ' . $this->access_token];
            $response_json = $this->curl->Get(NULL, NULL, $uri, NULL, '', $headers);
            $status_code = $this->curl->GetStatusCode();
            $response_object = json_decode($response_json);
            if ($status_code != 200) {
                throw new Exception("$uri returned $status_code: " . json_encode($response_object, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            }
            if (!$response_object) {
                throw new Exception("invalid response from $uri: $response_json");
            }
            return $response_object;
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    public function UpdateProduct($o) {
        try {
            if (!isset($o->id)) {
                throw new Exception('id missing');
            }
            if (!is_string($o->id)) {
                throw new Exception('type of id wrong');
            }
            if (strlen($o->id) < 6) {
                throw new Exception('id too short');
            }
            if (50 < strlen($o->id)) {
                throw new Exception('id too long');
            }
            $uri = sprintf('%s%s/%s', PAYPAL_SERVER, PAYPAL_PRODUCTS_PATH, $o->id);
            $headers = ['Authorization: Bearer ' . $this->access_token];
            $data = [];
            if (isset($o->name)) {
                if (!is_string($o->name)) {
                    throw new Exception('type of name wrong');
                }
                if (strlen($o->name) < 5) {     // 5 はテキトー
                    throw new Exception('name too short');
                }
                if (127 < strlen($o->name)) {   // 127 は PayPal の仕様通り
                    throw new Exception('name too long');
                }
                $data[] = [
                    'op' => 'replace',
                    'path' => '/name',  // DONE: これが本当に書き換えられるのか、まだテストしていない。→変わった。
                    'value' => $o->name
                ];
            }
            if (isset($o->description)) {
                if (!is_string($o->description)) {
                    throw new Exception('type of description wrong');
                }
                if (strlen($o->description) < 5) {     // 5 はテキトー
                    throw new Exception('description too short');
                }
                if (256 < strlen($o->description)) {   // 256 は PayPal の仕様通り
                    throw new Exception('description too long');
                }
                $data[] = [
                    'op' => 'replace',
                    'path' => '/description',
                    'value' => $o->description
                ];
            }
            if (isset($o->home_url)) {
                if (!is_string($o->home_url)) {
                    throw new Exception('type of home_url wrong');
                }
                if (strlen($o->home_url) < 13) {    // 13 はテキトー
                    throw new Exception('home_url too short');
                }
                if (2000 < strlen($o->home_url)) {  // 2000 は PayPal の仕様通り
                    throw new Exception('home_url too long');
                }
                $data[] = [
                    'op' => 'replace',
                    'path' => '/home_url',
                    'value' => $o->home_url
                ];
            }
            if (isset($o->image_url)) {
                if (!is_string($o->image_url)) {
                    throw new Exception('type of image_url wrong');
                }
                if (strlen($o->image_url) < 13) {   // 13 はテキトー
                    throw new Exception('image_url too short');
                }
                if (2000 < strlen($o->image_url)) { // 2000 は PayPal の仕様通り
                    throw new Exception('image_url too long');
                }
                $data[] = [
                    'op' => 'replace',
                    'path' => '/image_url',
                    'value' => $o->image_url
                ];
            }
            $response = $this->curl->SendJSON('PATCH', $uri, $headers, $data);
            $status_code = $this->curl->GetStatusCode();
            if ($status_code != 204) {
                throw new Exception("$uri returned $status_code: $response");
            }
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    public function CreateProduct($o) {
        try {
            $uri = sprintf('%s%s', PAYPAL_SERVER, PAYPAL_PRODUCTS_PATH);

            $headers = ['Authorization: Bearer ' . $this->access_token];

            $data = [];

            if (isset($o->id)) {
                if (!is_string($o->id)) {
                    throw new Exception('type of id wrong');
                }
                if (strlen($o->id) < 6) {
                    throw new Exception('id too short');
                }
                if (50 < strlen($o->id)) {
                    throw new Exception('id too long');
                }
                $data['id'] = $o->id;
            }

            $data['type'] = 'DIGITAL';

            $data['category'] = 'COMPUTER_HARDWARE_AND_SOFTWARE';

            if (!isset($o->name)) {
                throw new Exception('name missing');
            }
            if (!is_string($o->name)) {
                throw new Exception('type of name wrong');
            }
            if (strlen($o->name) < 5) {     // 5 はテキトー
                throw new Exception('name too short');
            }
            if (127 < strlen($o->name)) {   // 127 は PayPal の仕様通り
                throw new Exception('name too long');
            }
            $data['name'] = $o->name;

            if (!isset($o->description)) {
                throw new Exception('description missing');
            }
            if (!is_string($o->description)) {
                throw new Exception('type of description wrong');
            }
            if (strlen($o->description) < 5) {     // 5 はテキトー
                throw new Exception('description too short');
            }
            if (256 < strlen($o->description)) {   // 256 は PayPal の仕様通り
                throw new Exception('description too long');
            }
            $data['description'] = $o->description;

            if (!isset($o->home_url)) {
                throw new Exception('home_url missing');
            }
            if (!is_string($o->home_url)) {
                throw new Exception('type of home_url wrong');
            }
            if (strlen($o->home_url) < 13) {    // 13 はテキトー
                throw new Exception('home_url too short');
            }
            if (2000 < strlen($o->home_url)) {  // 2000 は PayPal の仕様通り
                throw new Exception('home_url too long');
            }
            $data['home_url'] = $o->home_url;

            if (!isset($o->image_url)) {
                throw new Exception('image_url missing');
            }
            if (!is_string($o->image_url)) {
                throw new Exception('type of image_url wrong');
            }
            if (strlen($o->image_url) < 13) {   // 13 はテキトー
                throw new Exception('image_url too short');
            }
            if (2000 < strlen($o->image_url)) { // 2000 は PayPal の仕様通り
                throw new Exception('image_url too long');
            }
            $data['image_url'] = $o->image_url;

            $product_json = $this->curl->SendJSON('POST', $uri, $headers, $data);
            $status_code = $this->curl->GetStatusCode();
            $product = json_decode($product_json);
            if ($status_code != 201) {
                throw new Exception("$uri returned $status_code: " . json_encode($product, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            }
            if (!$product) {
                throw new Exception("invalid response from $uri: $product_json");
            }
            return $product;
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    public function CreatePlan($o) {
        try {
            if (!isset($o->product_id)) {
                throw new Exception('product_id missing');
            }
            if (!is_string($o->product_id)) {
                throw new Exception('type of product_id wrong');
            }
            if (strlen($o->product_id) < 6) {
                throw new Exception('product_id too short');
            }
            if (50 < strlen($o->product_id)) {
                throw new Exception('product_id too long');
            }
            $uri = sprintf('%s%s', PAYPAL_SERVER, PAYPAL_PLANS_PATH);
            $headers = [
                'Authorization: Bearer ' . $this->access_token,
                'Prefer: return=representation'
            ];
            $data = [
                'product_id' => $o->product_id,
                'name' => $o->name,
                'description' => $o->description,
                'billing_cycles' => $o->billing_cycles,
                'payment_preferences' => $o->payment_preferences,
                'taxes' => $o->taxes
            ];
            $response_json = $this->curl->SendJSON('POST', $uri, $headers, $data);
            $status_code = $this->curl->GetStatusCode();
            $response_object = json_decode($response_json);
            if ($status_code != 201) {
                throw new Exception("$uri returned $status_code: " . json_encode($response_object, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            }
            if (!$response_object) {
                throw new Exception("invalid response from $uri: $response_json");
            }
            return $response_object;
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    public function ListPlans($o) {
        try {
            if (!isset($o->product_id)) {
                throw new Exception('product_id missing');
            }
            if (!is_string($o->product_id)) {
                throw new Exception('type of product_id wrong');
            }
            if (strlen($o->product_id) < 6) {
                throw new Exception('product_id too short');
            }
            if (50 < strlen($o->product_id)) {
                throw new Exception('product_id too long');
            }
            $uri = sprintf('%s%s', PAYPAL_SERVER, PAYPAL_PLANS_PATH);
            $headers = ['Authorization: Bearer ' . $this->access_token];
            $data = [
                'product_id' => $o->product_id
            ];
            $response_json = $this->curl->Get(NULL, NULL, $uri, NULL, $data, $headers);
            $status_code = $this->curl->GetStatusCode();
            $response_object = json_decode($response_json);
            if ($status_code != 200) {
                throw new Exception("$uri returned $status_code: " . json_encode($response_object, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            }
            if (!$response_object) {
                throw new Exception("invalid response from $uri: $response_json");
            }
            return $response_object;
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    public function ShowPlan($o) {
        try {
            if (!isset($o->plan_id)) {
                throw new Exception('plan_id missing');
            }
            if (!is_string($o->plan_id)) {
                throw new Exception('type of plan_id wrong');
            }
            if (strlen($o->plan_id) < 3) {
                throw new Exception('plan_id too short');
            }
            if (50 < strlen($o->plan_id)) {
                throw new Exception('plan_id too long');
            }
            $uri = sprintf('%s%s/%s', PAYPAL_SERVER, PAYPAL_PLANS_PATH, $o->plan_id);
            $headers = ['Authorization: Bearer ' . $this->access_token];
            $response_json = $this->curl->Get(NULL, NULL, $uri, NULL, '', $headers);
            $status_code = $this->curl->GetStatusCode();
            $response_object = json_decode($response_json);
            if ($status_code != 200) {
                throw new Exception("$uri returned $status_code: " . json_encode($response_object, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            }
            if (!$response_object) {
                throw new Exception("invalid response from $uri: $response_json");
            }
            return $response_object;
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    public function DeactivatePlan($o) {
        try {
            if (!isset($o->plan_id)) {
                throw new Exception('plan_id missing');
            }
            if (!is_string($o->plan_id)) {
                throw new Exception('type of plan_id wrong');
            }
            if (strlen($o->plan_id) < 3) {
                throw new Exception('plan_id too short');
            }
            if (50 < strlen($o->plan_id)) {
                throw new Exception('plan_id too long');
            }
            $uri = sprintf('%s%s/%s/deactivate', PAYPAL_SERVER, PAYPAL_PLANS_PATH, $o->plan_id);
            $headers = ['Authorization: Bearer ' . $this->access_token];
            $response_json = $this->curl->SendJSON('POST', $uri, $headers, NULL);
            $status_code = $this->curl->GetStatusCode();
            $response_object = json_decode($response_json);
            if ($status_code != 204) {
                throw new Exception("$uri returned $status_code: " . json_encode($response_object, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            }
            return $response_object;    // これは常に NULL
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    public function ActivatePlan($o) {
        try {
            if (!isset($o->plan_id)) {
                throw new Exception('plan_id missing');
            }
            if (!is_string($o->plan_id)) {
                throw new Exception('type of plan_id wrong');
            }
            if (strlen($o->plan_id) < 3) {
                throw new Exception('plan_id too short');
            }
            if (50 < strlen($o->plan_id)) {
                throw new Exception('plan_id too long');
            }
            $uri = sprintf('%s%s/%s/activate', PAYPAL_SERVER, PAYPAL_PLANS_PATH, $o->plan_id);
            $headers = ['Authorization: Bearer ' . $this->access_token];
            $response_json = $this->curl->SendJSON('POST', $uri, $headers, NULL);
            $status_code = $this->curl->GetStatusCode();
            $response_object = json_decode($response_json);
            if ($status_code != 204) {
                throw new Exception("$uri returned $status_code: " . json_encode($response_object, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            }
            return $response_object;    // これは常に NULL
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    public function ShowSubscriptionDetails($o) {
        try {
            if (!isset($o->paypal_subscription_id)) {
                throw new Exception('paypal_subscription_id missing');
            }
            if (!is_string($o->paypal_subscription_id)) {
                throw new Exception('type of paypal_subscription_id wrong');
            }
            if (strlen($o->paypal_subscription_id) < 3) {
                throw new Exception('paypal_subscription_id too short');
            }
            if (50 < strlen($o->paypal_subscription_id)) {
                throw new Exception('paypal_subscription_id too long');
            }
            $uri = sprintf('%s%s/%s', PAYPAL_SERVER, PAYPAL_SUBSCRIPTIONS_PATH, $o->paypal_subscription_id);
            $headers = ['Authorization: Bearer ' . $this->access_token];
            $response_json = $this->curl->Get(NULL, NULL, $uri, NULL, '', $headers);
            $status_code = $this->curl->GetStatusCode();
            $response_object = json_decode($response_json);
            if ($status_code != 200) {
                throw new Exception("$uri returned $status_code: " . json_encode($response_object, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            }
            if (!$response_object) {
                throw new Exception("invalid response from $uri: $response_json");
            }
            return $response_object;
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    public function SuspendSubscription($o) {
        try {
            if (!isset($o->paypal_subscription_id)) {
                throw new Exception('paypal_subscription_id missing');
            }
            if (!is_string($o->paypal_subscription_id)) {
                throw new Exception('type of paypal_subscription_id wrong');
            }
            if (strlen($o->paypal_subscription_id) < 3) {
                throw new Exception('paypal_subscription_id too short');
            }
            if (50 < strlen($o->paypal_subscription_id)) {
                throw new Exception('paypal_subscription_id too long');
            }
            if (!isset($o->reason)) {
                throw new Exception('reason missing');
            }
            if (!is_string($o->reason)) {
                throw new Exception('type of reason wrong');
            }
            if (strlen($o->reason) < 1) {
                throw new Exception('reason too short');
            }
            if (128 < strlen($o->reason)) {
                throw new Exception('reason too long');
            }
            $uri = sprintf('%s%s/%s/suspend', PAYPAL_SERVER, PAYPAL_SUBSCRIPTIONS_PATH, $o->paypal_subscription_id);
            $headers = ['Authorization: Bearer ' . $this->access_token];
            $data = [
                'reason' => $o->reason,
            ];
            $response = $this->curl->SendJSON('POST', $uri, $headers, $data);
            $status_code = $this->curl->GetStatusCode();
            if ($status_code != 204) {
                throw new Exception("$uri returned $status_code: $response");
            }
            return NULL;
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    public function ActivateSubscription($o) {
        try {
            if (!isset($o->paypal_subscription_id)) {
                throw new Exception('paypal_subscription_id missing');
            }
            if (!is_string($o->paypal_subscription_id)) {
                throw new Exception('type of paypal_subscription_id wrong');
            }
            if (strlen($o->paypal_subscription_id) < 3) {
                throw new Exception('paypal_subscription_id too short');
            }
            if (50 < strlen($o->paypal_subscription_id)) {
                throw new Exception('paypal_subscription_id too long');
            }
            if (!isset($o->reason)) {
                throw new Exception('reason missing');
            }
            if (!is_string($o->reason)) {
                throw new Exception('type of reason wrong');
            }
            if (strlen($o->reason) < 1) {
                throw new Exception('reason too short');
            }
            if (128 < strlen($o->reason)) {
                throw new Exception('reason too long');
            }
            $uri = sprintf('%s%s/%s/activate', PAYPAL_SERVER, PAYPAL_SUBSCRIPTIONS_PATH, $o->paypal_subscription_id);
            $headers = ['Authorization: Bearer ' . $this->access_token];
            $data = [
                'reason' => $o->reason,
            ];
            $response = $this->curl->SendJSON('POST', $uri, $headers, $data);
            $status_code = $this->curl->GetStatusCode();
            if ($status_code != 204) {
                throw new Exception("$uri returned $status_code: $response");
            }
            return NULL;
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

    public function CancelSubscription($o) {
        try {
            if (!isset($o->paypal_subscription_id)) {
                throw new Exception('paypal_subscription_id missing');
            }
            if (!is_string($o->paypal_subscription_id)) {
                throw new Exception('type of paypal_subscription_id wrong');
            }
            if (strlen($o->paypal_subscription_id) < 3) {
                throw new Exception('paypal_subscription_id too short');
            }
            if (50 < strlen($o->paypal_subscription_id)) {
                throw new Exception('paypal_subscription_id too long');
            }
            if (!isset($o->reason)) {
                throw new Exception('reason missing');
            }
            if (!is_string($o->reason)) {
                throw new Exception('type of reason wrong');
            }
            if (strlen($o->reason) < 1) {
                throw new Exception('reason too short');
            }
            if (128 < strlen($o->reason)) {
                throw new Exception('reason too long');
            }
            $uri = sprintf('%s%s/%s/cancel', PAYPAL_SERVER, PAYPAL_SUBSCRIPTIONS_PATH, $o->paypal_subscription_id);
            $headers = ['Authorization: Bearer ' . $this->access_token];
            $data = [
                'reason' => $o->reason,
            ];
            $response = $this->curl->SendJSON('POST', $uri, $headers, $data);
            $status_code = $this->curl->GetStatusCode();
            if ($status_code != 204) {
                throw new Exception("$uri returned $status_code: " . Misc::pretty_print_json($response));
            }
            return NULL;
        } catch (Exception $e) {
            throw new Exception(__CLASS__ . '::' . __FUNCTION__ . '(): ' . $e->getMessage(), $e->getCode());
        }
    }

}

?>
