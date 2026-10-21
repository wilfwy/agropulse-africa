import urllib.request, urllib.error, json, time

B = "https://agropulse-api-eo5o.onrender.com/api/v1"


def call(m, p, b=None, h=None, timeout=120):
    d = json.dumps(b).encode() if b else None
    hd = {"Content-Type": "application/json"}
    hd.update(h or {})
    r = urllib.request.Request(B + p, data=d, method=m, headers=hd)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as x:
            return x.status, x.read().decode()[:400]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:400]
    except Exception as e:
        return "ERR", str(e)[:200]


phone = "+22890" + str(int(time.time()) % 1000000).zfill(6)
print("telephone frais:", phone)
print("1. register :", call("POST", "/auth/register", {"phone": phone, "full_name": "Probe"}))
st, body = call("POST", "/auth/login", {"phone": phone, "otp": "000000"})
print("2. login faux:", st)
print("   corps     :", body)
