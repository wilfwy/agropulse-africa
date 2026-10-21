import urllib.request, urllib.error, json

B = "http://127.0.0.1:8000/api/v1"


def call(m, p, b=None):
    d = json.dumps(b).encode() if b else None
    r = urllib.request.Request(B + p, data=d, method=m, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=20) as x:
            return x.status, x.read().decode()[:200]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:250]


print("register  :", call("POST", "/auth/register", {"phone": "+22890555501"}))
print("login faux:", call("POST", "/auth/login", {"phone": "+22890555501", "otp": "000000"}))
