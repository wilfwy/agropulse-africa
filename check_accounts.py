import urllib.request, urllib.error, json, time

B = "https://agropulse-api-eo5o.onrender.com/api/v1"


def call(method, path, body=None, token=None, headers=None, timeout=120):
    data = json.dumps(body).encode() if body is not None else None
    h = {"Content-Type": "application/json"}
    h.update(headers or {})
    req = urllib.request.Request(B + path, data=data, method=method, headers=h)
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw or b"{}")
        except Exception:
            return e.code, {"raw": raw.decode("utf-8", "ignore")[:200]}
    except Exception as e:
        return "ERR", {"err": str(e)[:150]}


PHONE = "+22890112233"
print("A. REGISTER (nouveau numero)")
st, reg = call("POST", "/auth/register", {"phone": PHONE, "full_name": "Test Compte"})
print("   ->", st, "| plan:", reg.get("plan"), "| created:", reg.get("created"))
print("   -> dev_otp dans la reponse ?", "dev_otp" in reg)

print("B. REGISTER (meme numero, deja existant)")
st2, reg2 = call("POST", "/auth/register", {"phone": PHONE, "full_name": "Test Compte"})
print("   ->", st2, "| created:", reg2.get("created"), "(False = pas de doublon)")

print("C. LOGIN avec un OTP inventee")
st3, _ = call("POST", "/auth/login", {"phone": PHONE, "otp": "000000"})
print("   ->", st3, "(401 = le code existe bien, il est juste faux)")

print("D. LOGIN sans OTP valide -> impossible sans le code")
st4, _ = call("POST", "/auth/login", {"phone": PHONE, "otp": "123456"})
print("   ->", st4)

print("E. Le compte existe-t-il en base ? (via /users/me apres login)")
st5, me = call("GET", "/users/me", token="faux")
print("   ->", st5, "(401 attendu : pas de token)")
