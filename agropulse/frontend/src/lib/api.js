// Design tokens AgroPulse : #2D6A4F #52B788 #F4A261 #E63946 #457B9D #F8F9FA #212529
export async function getPrices(product="MAIS") {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const r = await fetch(`${base}/prices/current?product=${product}&country=TGO`, {cache:"no-store"});
  return r.json();
}
