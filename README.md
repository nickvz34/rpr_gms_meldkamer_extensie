<div align="center">
  <img src="https://rpr.nickvz.nl/rprlogo_white2.png" alt="Logo" width="150">
</div>


<div align="center">
  <h1>⚙️ RPR GMS Meldkamer Extensie</h1>
  <span>Een Tampermonkey-script dat verschillende realistische functies toevoegt aan het huidige RPR GMS voor de Meldkamer.</span>
</div>

<br>

## 🧩 Functies
- **🖌️ Classificaties & Karakteristieken:** De classificaties & karakteristieken volgens het officiële LMS bestand volgens [C2000.nl](https://www.c2000.nl/).
- **💬 Chatbuffer:** Je kan voor jezelf meerdere kladblok regels typen zonder dat deze direct naar andere verstuurd worden. Door dubbel te klikken op een kladblok regel die nog niet verzonden is kan je deze ook nog aanpassen. Als je alle openstaande regels wilt verzenden type je `.mr` in de chat.
- **📟 Geadvanceerde pager:** Een uitgebreider menu om eenheden van de Ambulance of Brandweer te alarmeren. Zo kan je de pagertekst handmatig aanpassen, de classificatie wijzigen, props toevoegen en zijn er meer en buurregio eenheden beschikbaar (Bron: [Meldkamerspel](https://forum.meldkamerspel.com/index.php?board/36-roepnummeroverzichten-brandweer/)).
- **📍 Locatie notatie:** Het kunnen noteren van een incident straatnaam zodat dit gebruikt kan worden bij het alarmeren van Ambulance en/of Brandweer. *(Voorbeeld: =Rotterdam/Alta Street)*
- **🚨 Wijzigen van prioriteit:** Het snel kunnen aanpassen van een incident prioriteit met `.prio 1/2/3`.
- **🚓 Eenheden koppelen:** Het koppelen van eenheden via het kladblok is net iets veranderd. Dit gaat nu met: `.kop rt3101 rt2201 rt2210`.

<br>

#### Aan bepaalde karakteristieken zitten acties gekoppeld. Hieronder vind je een overzicht van deze functies per karakistiek:
| Karakteristiek | Actie/Omschrijving | Afkortingen |
| --- | --- | --- |
| Ops Br/HV/IBGS/LVO: Middel, Groot, Zeer Groot | Dit zijn brandweer gerelateerde opschalingen. Wanneer een van deze verstuurd wordt zal automatisch gevraagd worden om de melding-titel aan te passen zodat de opschaling in de titel te zien is. Bij opschaling groot of hoger en de aanwezigheid van een SvD zal deze via de MK-chat ingelicht worden. | brmd/hvmd/gsmd <br> brgr/hvgr/gsgr <br> brzg/hvzg/gszg |
| Ops Ambu: Code 5/10/20/30/40/50 | Dit zijn GHOR (ambulance) gerelateerde opschalingen. Wanneer een van deze verstuurd wordt zal automatisch gevraagd worden om de melding-titel aan te passen zodat de opschaling in de titel te zien is. | code10/20/30/40/50 |
| Inzet Ambu: MMT | Wanneer deze karakteristiek verstuurd wordt zal automatisch gevraagd worden om "(MMT") in de melding-titel toe te voegen. | iammt |
| Inzet Pol landelijk: DSI RRT/QRF | Wanneer een van deze verstuurd wordt zal automatisch gevraagd worden om de melding-titel aan te passen zodat de opschaling in de titel te zien is. Dit wordt ook in de MK-chat gestuurd. | dsirrt, dsiqrf |
| Procedure Pol: BTGP | Wanneer een van deze verstuurd wordt zal automatisch gevraagd worden om de melding-titel aan te passen zodat de BTGP in de titel te zien is. Dit wordt ook in de MK-chat gestuurd. | pbtgp, pbtgpe |
| GRIP: 1 t/m 5 | Wanneer een van deze verstuurd wordt zal automatisch gevraagd worden om de melding-titel aan te passen zodat de opschaling in de titel te zien is. En bij de aanwezigheid van een SvD zal deze via de MK-chat ingelicht worden. | grip1, grip2, grip3, grip4, grip5 |

## 🚀 Installatie

Zorg er allereerst voor dat **Tampermonkey** correct is geïnstalleerd in je browser.  
Op [de officiële Tampermonkey-website](https://www.tampermonkey.net/) vind je een uitleg over hoe je Tampermonkey kunt installeren.  

#### 👉 [Installeer hier de GMS-extensie](https://github.com/nickvz34/rpr_gms_meldkamer_extensie/releases/latest/download/main_script.js)

> Wanneer je de extensie voor het eerst gebruikt binnen het GMS, wordt er gevraagd om toestemming te geven voor het inladen van externe bronnen.  
> Dit zijn aanvullende scripts die nodig zijn om bepaalde functies te laten werken, evenals databestanden zoals realistische classificaties, karakteristieken en straatnamen.  
>  
> ##### 💡 Tampermonkey haalt automatisch updates op zodra er een nieuwe versie beschikbaar is.

## 🆕 Updates

- **v2025.10.13** — Eerste publieke release 🎉
