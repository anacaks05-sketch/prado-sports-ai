import requests
import json
import os
from datetime import datetime, timedelta

API_KEY = os.getenv("508c2ae3d61ffd21296011f844cf9154")

if not API_KEY:
    print("❌ ERRO: API_FOOTBALL_KEY não encontrada no GitHub Secrets.")
    exit()

headers = {
    "x-apisports-key": API_KEY
}

ligas_permitidas = [
    ("Brazil", "Serie A"),
    ("Brazil", "Serie B"),
    ("Brazil", "Copa do Brasil"),
    ("England", "Premier League"),
    ("Spain", "La Liga"),
    ("Germany", "Bundesliga"),
    ("Italy", "Serie A"),
    ("France", "Ligue 1")
]

def calcular_confianca(pais, liga, horario):
    score = 50

    if pais == "Brazil":
        score += 10

    if liga == "Serie A":
        score += 15
    elif liga == "Serie B":
        score += 8
    elif liga == "Premier League":
        score += 18
    elif liga == "La Liga":
        score += 16
    elif liga == "Bundesliga":
        score += 16
    elif liga == "Ligue 1":
        score += 14

    hora = int(horario.split(":")[0])

    if hora >= 18:
        score += 5

    if hora >= 20:
        score += 3

    over15 = min(score + 10, 95)
    over25 = min(score - 5, 90)

    geral = int((over15 + over25) / 2)

    return geral, over15, over25

analises = []

for dias in range(0, 7):

    data_busca = (
        datetime.utcnow()
        - timedelta(hours=3)
        + timedelta(days=dias)
    ).strftime("%Y-%m-%d")

    url = f"https://v3.football.api-sports.io/fixtures?date={data_busca}"

    resposta = requests.get(url, headers=headers)
    dados = resposta.json()

    print("----------------------------------------")
    print("DATA:", data_busca)
    print("STATUS:", resposta.status_code)
    print("TOTAL DA API:", len(dados.get("response", [])))
    print("ERROS:", dados.get("errors"))

    for jogo in dados.get("response", []):

        pais = jogo["league"]["country"]
        liga = jogo["league"]["name"]

        if (pais, liga) not in ligas_permitidas:
            continue

        casa = jogo["teams"]["home"]["name"]
        fora = jogo["teams"]["away"]["name"]
        horario = jogo["fixture"]["date"][11:16]

        geral, over15, over25 = calcular_confianca(
            pais,
            liga,
            horario
        )

        if geral >= 90:
            categoria = "🟢 ELITE"
            status = "🔥 OPORTUNIDADE PREMIUM"
        elif geral >= 80:
            categoria = "🟡 FORTE"
            status = "🔥 OPORTUNIDADE FORTE"
        elif geral >= 70:
            categoria = "🔵 BOA"
            status = "⚠️ OPORTUNIDADE MODERADA"
        else:
            categoria = "🔴 EVITAR"
            status = "❌ EVITAR"

        analises.append({
            "jogo": f"{casa} x {fora}",
            "liga": liga,
            "pais": pais,
            "horario": horario,
            "confianca": geral,
            "over15": over15,
            "over25": over25,
            "categoria": categoria,
            "status": status
        })

print("----------------------------------------")
print("TOTAL FILTRADO:", len(analises))

analises = sorted(
    analises,
    key=lambda x: x["confianca"],
    reverse=True
)

top5 = analises[:5]

with open("dados.json", "w", encoding="utf-8") as arquivo:
    json.dump(
        top5,
        arquivo,
        ensure_ascii=False,
        indent=4
    )

bilhete = []

for item in top5[:3]:
    bilhete.append({
        "jogo": item["jogo"],
        "mercado": "Over 1.5",
        "confianca": item["confianca"]
    })

odd_estimativa = round(1.35 ** len(bilhete), 2)

bilhete_json = {
    "titulo": "🎟 Bilhete Prado do Dia",
    "entradas": bilhete,
    "odd_estimativa": odd_estimativa
}

with open("bilhete.json", "w", encoding="utf-8") as arquivo:
    json.dump(
        bilhete_json,
        arquivo,
        ensure_ascii=False,
        indent=4
    )

print("✅ dados.json atualizado")
print("✅ bilhete.json atualizado")
print("Jogos no TOP 5:", len(top5))
