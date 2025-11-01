<div align="center">
  <img src="https://rpr.nickvz.nl/rprlogo_white2.png" alt="Logo" width="150">
</div>

<div align="center">
  <h1>⚙️ RPR GMS Meldkamer Extensie</h1>
  <span>Een Tampermonkey-script dat verschillende realistische functies toevoegt aan het huidige RPR GMS voor de Meldkamer.</span>
</div>

<br>

## 🧩 Functies

- **🖌️ Classificaties & Karakteristieken:** Bevat de classificaties en karakteristieken volgens het officiële LMS-bestand van [C2000.nl](https://www.c2000.nl/).

- **💬 Chatbuffer:** Je kunt meerdere kladblokregels typen zonder dat deze direct naar anderen worden verzonden. Dubbelklik op een kladblokregel die nog niet is verzonden om deze aan te passen. Wil je alle openstaande regels in één keer verzenden? Typ dan `.mr` in de chat.

- **📟 Geavanceerde pager:** Een uitgebreid menu om eenheden van Ambulance of Brandweer te alarmeren. Je kunt de pagertekst handmatig aanpassen, de classificatie wijzigen, props toevoegen en toegang krijgen tot meer eenheden, inclusief buurregio’s. (Bron: [Meldkamerspel](https://forum.meldkamerspel.com/index.php?board/36-roepnummeroverzichten-brandweer/))

- **📍 Locatie-notatie:** Je kunt een incidentstraatnaam noteren zodat deze gebruikt kan worden bij het alarmeren van Ambulance en/of Brandweer. _(Voorbeeld: `=Rotterdam/Alta Street`)_

- **🚨 Wijzigen van prioriteit:** Pas snel de prioriteit van een incident aan met `.prio 1/2/3`.

- **🚓 Eenheden koppelen:** Het koppelen van eenheden via het kladblok is vernieuwd en werkt nu met: `.kop rt3101 rt2201 rt2210`.

<br>

#### Acties gekoppeld aan karakteristieken

| Karakteristiek                                    | Actie/Omschrijving                                                                                                                                                                                                                           | Afkortingen                                            |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Ops Br/HV/IBGS/LVO: Middel, Groot, Zeer Groot** | Brandweer-gerelateerde opschalingen. Bij versturen wordt automatisch gevraagd om de melding-titel aan te passen zodat de opschaling zichtbaar is. Bij opschaling Groot of hoger en aanwezigheid van een SvD wordt dit via de MK-chat gemeld. | brmd/hvmd/gsmd <br> brgr/hvgr/gsgr <br> brzg/hvzg/gszg |
| **Ops Ambu: Code 5/10/20/30/40/50**               | GHOR (ambulance)-gerelateerde opschalingen. Bij versturen wordt automatisch gevraagd de melding-titel aan te passen.                                                                                                                         | code10/20/30/40/50                                     |
| **Inzet Ambu: MMT**                               | Bij versturen wordt automatisch gevraagd "(MMT)" aan de melding-titel toe te voegen.                                                                                                                                                         | iammt                                                  |
| **Inzet Pol landelijk: DSI RRT/QRF**              | Bij versturen wordt automatisch gevraagd de melding-titel aan te passen; wordt tevens in de MK-chat gemeld.                                                                                                                                  | dsirrt, dsiqrf                                         |
| **Procedure Pol: BTGP**                           | Bij versturen wordt automatisch gevraagd de melding-titel aan te passen; BTGP wordt zichtbaar in de titel en in de MK-chat gemeld.                                                                                                           | pbtgp, pbtgpe                                          |
| **GRIP: 1 t/m 5**                                 | Bij versturen wordt automatisch gevraagd de melding-titel aan te passen; bij aanwezigheid van een SvD wordt dit via de MK-chat gemeld.                                                                                                       | grip1, grip2, grip3, grip4, grip5                      |

## 🚀 Installatie

Zorg er allereerst voor dat **Tampermonkey** correct is geïnstalleerd in je browser.  
Op [de officiële Tampermonkey-website](https://www.tampermonkey.net/) vind je een uitleg over hoe je Tampermonkey kunt installeren.

#### 👉 [Installeer hier de GMS-extensie](https://github.com/nickvz34/rpr_gms_meldkamer_extensie/releases/latest/download/main_script.js)

> Wanneer je de extensie voor het eerst gebruikt binnen het GMS, wordt er gevraagd om toestemming te geven voor het inladen van externe bronnen.  
> Dit zijn aanvullende scripts die nodig zijn om bepaalde functies te laten werken, evenals databestanden zoals realistische classificaties, karakteristieken en straatnamen.
>
> ##### 💡 Tampermonkey haalt automatisch updates op zodra er een nieuwe versie beschikbaar is.

## 🆕 Updates

- **v2025.10.13** — Lokale basis versie
- **v2025.11.01** — Eerste publieke versie (inclusief auto-updates)
