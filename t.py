import urllib.request, urllib.error, json, time

B = "https://agropulse-api-eo5o.onrender.com/api/v1"


def call(m, p, b=None, h=None, timeout=120):
    d = json.dumps(b).encode() if b else None
    hd = {"Content-Type": "application/json"}
    hd.update(h or {})
    r = urllib.request.Request(B + p, data=d, method=m, headers=hd)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as x:
            return x.status, x.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:600]
    except Exception as e:
        return "ERR", str(e)[:200]


phone = "+2289" + str(int(time.time()) % 100000000).zfill(8)
print("telephone:", phone)
print("register :", call("POST", "/auth/register", {"phone": phone, "full_name": "Diag"})[0])
print("login    :", call("POST", "/auth/login", {"phone": phone, "otp": "000000"}))

st, body = call("GET", "/health?detail=1")
try:
    j = json.loads(body)
    le = j.get("last_error")
    print("last_error type    :", (le or {}).get("type"))
    print("last_error message :", (le or {}).get("message"))
    print("last_error path    :", (le or {}).get("path"))
    print("traceback:\n", (le or {}).get("traceback", "")[-900:])
except Exception as e:
    print("health brut:", body[:400])
