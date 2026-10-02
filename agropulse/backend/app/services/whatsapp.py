"""WhatsApp Gateway — parsing commandes (FR + éwé/kabyè minimal)."""
import re

HELP = ("Bienvenue AgroPulse 🌱\nPRIX [produit] [marché] ex: PRIX MAIS KARA\n"
        "ALERTE [produit] > [montant] ex: ALERTE MAIS > 250\nMON COMPTE / ABONNEMENT\n"
        "LANGUE [fr/ee/kb] / MES ALERTES / STOP / SUPPRIMER / AIDE")

def parse(text: str) -> dict:
    t = (text or "").strip().upper()
    if t.startswith("BONJOUR") or t == "AIDE" or t.startswith("HELP"):
        return {"intent": "INSCRIPTION" if "BONJOUR" in t else "AIDE"}
    m = re.match(r"PRIX\s+(\w+)(?:\s+(\w+))?", t)
    if m:
        return {"intent": "PRIX", "product": m.group(1), "market": m.group(2)}
    m = re.match(r"ALERTE\s+(\w+)\s*([><])\s*(\d+(?:\.\d+)?)", t)
    if m:
        return {"intent": "ALERTE", "product": m.group(1), "op": m.group(2), "threshold": float(m.group(3))}
    if t.startswith("MES ALERTES"):
        return {"intent": "MES_ALERTES"}
    if t.startswith("SUPPRIMER ALERTE"):
        return {"intent": "SUPPRIMER_ALERTE"}
    if t.startswith("MON COMPTE"):
        return {"intent": "MON_COMPTE"}
    if t.startswith("ABONNEMENT"):
        return {"intent": "ABONNEMENT"}
    if t.startswith("LANGUE"):
        parts = t.split()
        return {"intent": "LANGUE", "lang": parts[1].lower() if len(parts) > 1 else "fr"}
    if t == "STOP":
        return {"intent": "STOP"}
    if t.startswith("SUPPRIMER"):
        return {"intent": "SUPPRIMER"}
    return {"intent": "UNKNOWN"}

def reply(parsed: dict) -> str:
    i = parsed.get("intent")
    if i == "AIDE" or i == "INSCRIPTION":
        return HELP
    if i == "UNKNOWN":
        return "Commande non comprise. Envoyez AIDE pour le menu."
    return i
