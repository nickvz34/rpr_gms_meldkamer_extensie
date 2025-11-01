// ==UserScript==
// @name         RPR GMS Meldkamer Extensie
// @namespace    https://github.com/nickvz34/rpr_gms_meldkamer_extensie
// @version      2025.11.01
// @description  Een Tampermonkey-script dat verschillende realistische functies toevoegt aan het huidige RPR GMS voor de Meldkamer.
// @author       Nick v Z.
// @match        https://gms.roleplayreality.nl/meldkamer/
// @icon         https://intranet.roleplayreality.nl/shared/images/logo/favicon.png
// @grant        GM_xmlhttpRequest
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @run-at       document-end
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// @require      https://code.jquery.com/ui/1.14.0/jquery-ui.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js
// @require      https://cdn.socket.io/4.8.1/socket.io.min.js
// @require      https://cdn.jsdelivr.net/npm/fuse.js@7.1.0
// @resource     customCSS https://raw.githubusercontent.com/nickvz34/rpr_gms_meldkamer_extensie/main/assets/styling.css
// @resource     windows98 https://unpkg.com/98.css
// @resource     toastr_css https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css
// @updateURL    https://github.com/nickvz34/rpr_gms_meldkamer_extensie/releases/latest/download/main_script.user.js
// @downloadURL  https://github.com/nickvz34/rpr_gms_meldkamer_extensie/releases/latest/download/main_script.user.js
// ==/UserScript==

const $ = window.$;
const toastr = window.toastr;
const io = window.io;

console.debug('ℹ️ RPR Realistische Classificaties & Karakteristieken V2 wordt ingeladen..');

let classificaties = [];
let karakteristieken = [];

let plaatsnamen = ['Rotterdam'];
let plaatsnamenFuse = undefined;
let straatnamen = [];
let straatnamenFuse = undefined;
let locatieTreffers = [];

let prevKladblokValue = "";

let regioEenheden = {};
let activeTab = 'classificaties';

let unsendMessages = [];

let isInEditMode = false;
let currentEditId = -1;
let isP2000Set = false;

let p2000_discipline = '';
let p2000_prioriteit = '';
let p2000_gespreksgroep = '';
let p2000_classificatie = '';
let p2000_straatnaam = '';
let p2000_postcode = '';
let p2000_dia = '';
let p2000_regio = '17';
let p2000_beschikbare_eenheden = [];
let p2000_props = [];
let p2000_mmt = false;

let filterDebounce = null;

// kladblok_from_bericht

function setupHTML() {

    const $currentInput = document.getElementById('kladblok_sendmsg');
    $('#kladblok_sendmsg').replaceWith($currentInput.cloneNode(true));

    $('#suggestionsList').remove();

    const $content = $(`
        <div class="win98 window-body" style="margin:0;margin-left:10px;">
            <menu role="tablist">
                <li role="tab" id="classificaties" aria-selected="true">
                    <a href="#tabs">Classificaties</a>
                </li>
                <li role="tab" id="karakteristieken" aria-selected="false">
                    <a href="#tabs">Karakteristieken</a>
                </li>
                <li role="tab" id="locaties" aria-selected="false">
                    <a href="#tabs">Locaties</a>
                </li>
            </menu>

            <div class="window" style="min-height: 325px;">

                <div role="tabpanel" class="window-body tab-content" aria-labelledby="tab-classificaties">
                    <div style="max-width: 100%; overflow-x: auto; max-height: 300px;">
                        <table class="interactive">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Prim. Parser</th>
                                    <th>MC 1</th>
                                    <th>MC 2</th>
                                    <th>MC 3</th>
                                    <th>Afkorting</th>
                                    <th>Presentatietekst</th>
                                    <th>Pagertekst BRW</th>
                                    <th>Stand. prio POL</th>
                                    <th>Stand. prio BRW</th>
                                    <th>Stand. prio CPA</th>
                                    <th>Parsertermen</th>
                                    <th>Score</th>
                                </tr>
                            </thead>
                            <tbody id="table_classificaties_body">
                            </tbody>
                        </table>
                    </div>
                </div>

                <div role="tabpanel" class="window-body tab-content" style="display: none;"
                    aria-labelledby="tab-karakteristieken">
                    <div style="max-width: 100%; overflow-x: auto; max-height: 300px;">
                        <table class="interactive">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Prim. Parser</th>
                                    <th>Naam</th>
                                    <th>Waarde</th>
                                    <th>Pagertekst BRW</th>
                                    <th>Plaats in alarmtekst BRW</th>
                                    <th>Parsertermen</th>
                                    <th>Score</th>
                                </tr>
                            </thead>
                            <tbody id="table_karakteristieken_body">
                            </tbody>
                        </table>
                    </div>
                </div>

                <div role="tabpanel" class="window-body tab-content" style="display: none;"
                    aria-labelledby="tab-locaties">
                    <div style="max-width: 100%; overflow-x: auto; max-height: 300px;">
                        <table class="interactive">
                            <thead>
                                <tr>
                                    <th>Index</th>
                                    <th>Type</th>
                                    <th>Waarde</th>
                                </tr>
                            </thead>
                            <tbody id="table_locaties_body">
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    `);
    $('.columns > .column:nth-child(4) > div:first').after($content);

    // const $kladblokDiv = $(`<div style="background-color:white;margin-bottom:0.75rem;position:relative;"></div>`);

    const $kladblokInput = $(`<input type="text" id="kladblok_input" placeholder="Typ hier.."style="width: 100%;background:transparent;padding:0.75rem;" />`);
    $kladblokInput.on('wheel', (e) => {
        if (!e.originalEvent.shiftKey) return;

        e.preventDefault();

        const newScrollLeftPos = $(`[role=tabpanel][aria-labelledby='tab-${activeTab}']`).scrollLeft() + e.originalEvent.deltaY;

        // $(`[role=tabpanel][aria-labelledby='tab-${activeTab}']`).scrollLeft(newScrollLeftPos);
        $('table.interactive').parent().scrollLeft(newScrollLeftPos);
    });

    const $kladblokHint = $(`<span id="kladblok_input_hint" style="user-select: none;pointer-events: none;">Hint</span>`);
    $('#kladblok_sendmsg').parent().append($kladblokHint);
}

$(document).ready(() => {

    // Begin Custom P2000 Code
    $('.p2000_field.brandweer').hide();
    $('.p2000_field.ambu').hide();

    function setupP2000Classificaties() {
        const values = sortByFirstLetter(classificaties.map(classificatie => {
            return String(classificatie.PAGERTEKST_BRW).trim() === '' || String(classificatie.PAGERTEKST_BRW).trim() === '-' ? classificatie.PRESENTATIETEKST : classificatie.PAGERTEKST_BRW;
        })).map(v => `<option value="${v}">${v}</option>`);

        $('select#p2000_classificatie').append(Array.from(new Set(values)).join(' '));
    }
    function setupP2000Karakteristieken() {
        const values = sortByFirstLetter(karakteristieken.filter(kar => kar.PAGERTEKST_BRW !== "").map(kar => kar.PAGERTEKST_BRW), 1).map(v => `<option value="${v}">${v}</option>`);
        $('select#p2000_karakteristieken').append(Array.from(new Set(values)).join(' '));
    }
    function setupP2000Straatnamen() {
        const values = sortByFirstLetter(straatnamen).map(v => `<option value="${v}"></option>`);
        $('datalist#straatnamen').append(Array.from(new Set(values)).join(' '));
    }
    function updateP2000PagerFinal() {
        const checkboxes = document.querySelectorAll('#p2000_eenheden_lijst input[type="checkbox"]:checked');
        const selectedEenheden = Array.from(checkboxes).map(cbx => cbx.value);

        $('#p2000_pagertekst_final').val(
            [
                String(p2000_prioriteit).toUpperCase(),
                String(p2000_discipline).toLowerCase() === 'ambu' ? p2000_dia : '',
                String(p2000_discipline).toLowerCase() === 'ambu' ? p2000_props.filter(prop => prop.place === 'VOOR').map(p => p.value).join(' ') : '',
                String(p2000_discipline).toLowerCase() === 'ambu' ? p2000_mmt ? '(MMT)' : 'AMBU' : '',
                String(p2000_discipline).toLowerCase() === 'ambu' ? selectedEenheden.map(roepnummer => roepnummer.replace(/-/g, "")).join(' ') : '',
                String(p2000_discipline).toLowerCase() === 'brw' ? p2000_gespreksgroep : '',
                String(p2000_discipline).toLowerCase() === 'brw' ? p2000_props.filter(prop => prop.place === 'VOOR').map(p => p.value).join(' ') : '',
                String(p2000_discipline).toLowerCase() === 'brw' ? p2000_classificatie : '',
                String(p2000_discipline).toLowerCase() === 'brw' && p2000_props.filter(prop => prop.place === 'NA').length > 0 ? p2000_props.filter(prop => prop.place === 'NA').map(p => p.value).join(' ') : '',
                p2000_straatnaam,
                p2000_postcode !== '' ? isNaN(Number(p2000_postcode)) ? p2000_postcode : `PC${p2000_postcode}` : '',
                String(p2000_discipline).toLowerCase() === 'brw' ? 'Rotterdam' : String(p2000_discipline).toLowerCase() === 'ambu' ? 'Rotterdam ROTTDM' : '',
                String(p2000_discipline).toLowerCase() === 'brw' ? selectedEenheden.map(roepnummer => roepnummer.replace(/-/g, "")).join(' ') : '',
                String(p2000_discipline).toLowerCase() === 'ambu' ? `bon ${Math.round(Date.now() / 100).toString()}` : ''

            ].filter(v => v !== "").join(' ').trim()
        );
    }
    function updateP2000Eenheden() {
        $('#p2000_eenheden_lijst').empty();
        if (p2000_discipline === '' || p2000_regio === '') return;

        let beschikbareEenheden = [];
        let eenhedenUitBuurregio = false;
        const discipline_tekst = p2000_discipline === 'brw' ? "brandweer" : p2000_discipline === 'ambu' ? 'ambulance' : null;

        if (p2000_regio !== '17' && p2000_regio !== '') {
            const regio_tekst = p2000_regio === '09' ? 'Utrecht' : p2000_regio === '13' ? 'Amsterdam-Amstelland' : p2000_regio === '15' ? "Haaglanden" : p2000_regio === '16' ? "Hollands-Midden" : p2000_regio === '18' ? 'Zuid-Holland-Zuid' : null;
            if (!regio_tekst || !discipline_tekst) return;

            let newEenheden = buurRegioEenheden;

            newEenheden["brandweer"]["Haaglanden"] = regioEenheden["15"]["brandweer"];
            newEenheden["ambulance"]["Haaglanden"] = regioEenheden["15"]["ambulance"];

            newEenheden["brandweer"]["Amsterdam-Amstelland"] = regioEenheden["13"]["brandweer"];
            newEenheden["ambulance"]["Amsterdam-Amstelland"] = regioEenheden["13"]["ambulance"];

            newEenheden["brandweer"]["Hollands-Midden"] = regioEenheden["16"]["brandweer"];
            newEenheden["ambulance"]["Hollands-Midden"] = regioEenheden["16"]["ambulance"];

            newEenheden["brandweer"]["Utrecht"] = regioEenheden["09"]["brandweer"];
            newEenheden["ambulance"]["Utrecht"] = regioEenheden["09"]["ambulance"];

            eenhedenUitBuurregio = true;
            beschikbareEenheden = buurRegioEenheden?.[discipline_tekst]?.[regio_tekst];
        } else {
            const disciplineEenheden = eenheden.filter(eenheid => eenheid.eenheid_afdeling === discipline_tekst);

            eenhedenUitBuurregio = false;
            beschikbareEenheden = disciplineEenheden;
            // beschikbareEenheden = p2000_discipline === 'brw' ? disciplineEenheden.filter(eenheid => eenheid.eenheid_status == 4 || eenheid.eenheid_status == 5) : p2000_discipline === 'ambu' ? disciplineEenheden.filter(eenheid => eenheid.eenheid_status == 5 || eenheid.eenheid_status == 6) : [];
        }

        if (beschikbareEenheden.length > 0) {
            beschikbareEenheden.forEach(option => {
                let roepnummers = option?.eenheid_roepnummer?.split(roepnummerSplitter) ?? [option];

                const isNietBeschikbaar = option?.eenheid_afdeling === "brandweer" && (option?.eenheid_status != 4 && option?.eenheid_status != 5) || option?.eenheid_afdeling === 'ambulance' && (option?.eenheid_status != 5 && option?.eenheid_status != 6);

                roepnummers?.forEach(roepnummer => {
                    const isHaaglandenObj = typeof roepnummer === 'object';

                    const checkbox = document.createElement("input");
                    const label = document.createElement("label");
                    const span = document.createElement("span");
                    const div = document.createElement("div");

                    checkbox.type = "checkbox";
                    const isMulti = roepnummers.length > 1;
                    if (isMulti) {
                        checkbox.dataset.group = option.eenheid_id;
                    }

                    let labelText = "";
                    let checkboxId = "";

                    if (eenhedenUitBuurregio) {
                        checkbox.value = option?.roepnummer;
                        labelText = `${option?.roepnummer || ''} ${option?.afkorting?.length <= 5 ? option?.afkorting : ''}`.trim();
                        checkboxId = option?.roepnummer;

                        div.title = `${option?.afkorting || ''} ${option?.info ? `(${option?.info})` : ''}`;
                    } else {
                        checkbox.value = roepnummer?.charAt?.(0)?.toUpperCase() + roepnummer?.slice?.(1);
                        checkboxId = `${option?.eenheid_id}-${roepnummer}`;
                        labelText = roepnummer?.charAt?.(0)?.toUpperCase() + roepnummer?.slice?.(1);
                    }

                    if (isNietBeschikbaar) labelText += " (N.I.)";

                    checkbox.id = checkboxId;
                    label.setAttribute("for", checkboxId);

                    span.classList.add("label-text");
                    span.textContent = " " + labelText;
                    label.appendChild(span);

                    const eenheidList = document.getElementById('p2000_eenheden_lijst');
                    checkbox.addEventListener("change", () => {
                        if (isMulti) {
                            const allInGroup = eenheidList.querySelectorAll(`input[data-group='${option.eenheid_id}']`);
                            allInGroup.forEach(cb => {
                                const lbl = eenheidList.querySelector(`label[for='${cb.id}']`);
                                const spanText = lbl?.querySelector(".label-text");
                                if (!spanText) return;

                                if (checkbox.checked) {
                                    if (cb !== checkbox) {
                                        cb.checked = false;
                                        spanText.classList.add("disabled-label");
                                    } else {
                                        spanText.classList.remove("disabled-label");
                                    }
                                } else {
                                    spanText.classList.remove("disabled-label");
                                }
                            });
                        }

                        updateP2000PagerFinal();
                    });

                    div.appendChild(checkbox);
                    div.appendChild(label);
                    $('#p2000_eenheden_lijst').append(div);
                });

            });
        } else {
            const error = document.createElement("p");
            error.textContent = `Geen ${discipline_tekst} eenheden vrij!`;
            $('#p2000_eenheden_lijst').append(error);
        }
    }
    function ResetP2000Form() {
        $('.p2000_field.brandweer').hide();
        $('.p2000_field.ambu').hide();

        p2000_discipline = '';
        p2000_prioriteit = '';
        p2000_gespreksgroep = '';
        p2000_classificatie = '';
        p2000_straatnaam = '';
        p2000_postcode = '';
        p2000_dia = '';
        p2000_regio = '17';
        p2000_beschikbare_eenheden = [];
        p2000_props = [];
        p2000_mmt = false;

        $('#p2000_discipline').val('');
        $('#p2000_prioriteit').val('');
        $('#p2000_gespreksgroep').val('');
        $('#p2000_classificatie').val('');
        $('#p2000_straatnaam').val('');
        $('#p2000_postcode').val('');
        $('#p2000_dia').prop('checked', false);
        $('#p2000_regio').val('17');
        $('#p2000_mmt').prop('checked', false);

        $('#p2000_props_lijst').empty();

        updateP2000PagerFinal();
        updateP2000Eenheden();
    }

    $('#p2000_reset_form').on('click', ResetP2000Form);

    function setupCustomP2000() {
        isP2000Set = true;

        //$('#p2000-modal').remove();

        const $resetButton = $('<button aria-label="Reset" id="p2000_reset_form" style="cursor:pointer;margin-right: 0.5rem;">R</button>');
        $resetButton.on('click', ResetP2000Form);

        const $closeButton = $('<button aria-label="Close" style="cursor:pointer;"></button>');
        $closeButton.on('click', (e) => {
            if (!e.shiftKey) ResetP2000Form();
            $('#p2000_modal2').removeClass('is-active');
        });

        $('#meldingwijzigen').after(`
       <div class="modal win98" id="p2000_modal2">
        <div class="window" style="min-width: 45vw;min-height:45vh;z-index:500;display:flex;flex-direction:column;">
            <div class="title-bar">
                <div class="title-bar-text">P2000 Paging</div>
                <div class="title-bar-controls">
                </div>
            </div>
            <div class="window-body" id="custom_p2000_window_body">

                <div class="p2000_fields_container">
                    <div class="p2000_field">
                        <label for="p2000_discipline">Discipline</label>
                        <select id="p2000_discipline">
                            <option value="">Kies een discipline</option>
                            <option value="ambu">Ambulance</option>
                            <option value="brw">Brandweer</option>
                        </select>
                    </div>

                    <div class="p2000_field">
                        <label for="p2000_prioriteit">Prioriteit</label>
                        <select id="p2000_prioriteit">
                            <option value="">Kies een prioriteit</option>
                        </select>
                    </div>
                </div>

                <div class="p2000_fields_container">
                    <div class="p2000_field brandweer">
                        <label for="p2000_gespreksgroep">Gespreksgroep</label>
                        <select id="p2000_gespreksgroep">
                            <option value="">Kies een gespreksgroep</option>
                        </select>
                    </div>

                    <div class="p2000_field brandweer">
                        <label for="p2000_classificatie">Classificatie</label>
                        <select id="p2000_classificatie">
                            <option value="">Kies een classificatie</option>
                        </select>
                    </div>

                    <div class="p2000_field no_flex ambu">
                        <input type="checkbox" id="p2000_dia" />
                        <label for="p2000_dia" style="cursor: pointer;">Direct Inzet Ambulance (DIA)</label>
                    </div>

                    <div class="p2000_field no_flex ambu">
                        <input type="checkbox" id="p2000_mmt" />
                        <label for="p2000_mmt" style="cursor: pointer;">Inzet MMT</label>
                    </div>
                </div>

                <div class="p2000_fields_container">
                    <div class="p2000_field brandweer ambu">
                        <label for="p2000_straatnaam">Straatnaam</label>
                        <input type="text" name="p2000_straatnaam" id="p2000_straatnaam"
                            placeholder="Geef een straatnaam op" list="straatnamen" />

                        <datalist id="straatnamen"></datalist>
                    </div>

                    <div class="p2000_field brandweer ambu">
                        <label for="p2000_postcode">Postcode</label>
                        <input type="text" name="p2000_postcode" id="p2000_postcode" class="remove-arrows"
                            placeholder="Kies een postcode of hectometerpaal" list="p2000_locaties" />

                        <datalist id="p2000_locaties"></datalist>
                    </div>
                </div>

                <div class="p2000_fields_container" style="align-items:start;">
                    <div class="p2000_field brandweer ambu">
                        <h5 style="font-weight: bold;text-align: center;visibility: hidden;">...:</h5>

                        <label>Props</label>

                        <div style="display: flex;gap: 0.2rem;">
                            <select id="p2000_karakteristieken" style="flex: 1;">
                                <option value="">Kies een karakteristiek/prop</option>
                            </select>

                            <button type="button" id="add_p2000_prop" style="min-height: auto;">+</button>
                        </div>

                        <div style="min-height:150px;max-height:150px;overflow-y:auto;">
                            <div id="p2000_props_lijst">
                            </div>
                        </div>
                    </div>

                    <div class="p2000_field brandweer ambu">
                        <h5 style="font-weight: bold;text-align: center;">Eenheden:</h5>

                        <label for="p2000_regio" style="font-weight:600;">Regio</label>
                        <select id="p2000_regio">
                            <option value="">Kies een regio</option>
                            <option value="15">(15) Haaglanden</option>
                            <option value="17" selected>(17) Rotterdam-Rijnmond</option>
                            <option value="18">(18) Zuid-Holland Zuid</option>
                        </select>

                        <div style="min-height:150px;max-height:150px;overflow-y:auto;">
                            <div id="p2000_eenheden_lijst"></div>
                        </div>
                    </div>
                </div>

                <div class="p2000_bottom_bar">
                    <input type="text" name="p2000_pagertekst_final" id="p2000_pagertekst_final" value=""
                        style="flex:1;" placeholder="Het pagerbericht is leeg..." />
                    <button type="button" class="default" id="p2000_alarmeren"
                        style="width:fit-content;;cursor: pointer;">Alarmeren</button>
                </div>
            </div>
        </div>
    </div>
       `);

        $('#p2000_modal2').find('.title-bar-controls').append($resetButton);
        $('#p2000_modal2').find('.title-bar-controls').append($closeButton);

        setupP2000Classificaties();
        setupP2000Karakteristieken();
        setupP2000Straatnamen();

        $('#p2000_modal2').draggable();
    }

    $(document).on('click', '#p2000_alarmeren', () => {
        const checkboxes = document.querySelectorAll('#p2000_eenheden_lijst input[type="checkbox"]:checked');
        if (Array.from(checkboxes).length === 0) return toastr.error(`Er zijn geen eenheden gealarmeerd om te alarmeren!`);

        let prio = document.getElementById("prio")?.value || ""
        let regio = document.getElementById("regio")?.value || ""
        let meldingTekst = document.getElementById("melding-tekst")?.value || ""
        let melding = meldingen.find(melding => melding.melding_id == huidigGeselecteerdeMelding.melding_id)
        let dicipline = document.getElementById("dicipline")?.value || ""
        let tijd = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Amsterdam' });
        let eigenaar = meldkamer.meldkamer_naam
        let selected_eenheden = Array.from(checkboxes).map(checkbox => checkbox.value);

        if (!melding) return toastr.error(`Er is geen geldige melding geselecteerd!`);

        const pagerBericht = $('#p2000_pagertekst_final').val().trim();
        let meldingObj = structuredClone(melding)
        meldingObj.gekoppelde_eenheden ??= [];

        // Indien er roepnummers bijzitten die ingemeld zijn, koppel deze dan.
        selected_eenheden.forEach(async (roepnummer) => {
            let eenheid = eenheden.find(eenheid => eenheid.eenheid_roepnummer.includes(roepnummer));


            if (eenheid) {
                const isAlGekoppeld = meldingObj?.gekoppelde_eenheden?.find(eenh => eenh.eenheid_roepnummer.includes(roepnummer));
                const isAanMeldingGekoppeld = eenheid.eenheid_melding !== null;

                meldingObj.gekoppelde_eenheden?.push({
                    eenheid_afdeling: eenheid.eenheid_afdeling,
                    eenheid_roepnummer: eenheid.eenheid_roepnummer,
                    eenheid_status: mapGetOnKoppel(eenheid.eenheid_afdeling)
                });

                if (isAanMeldingGekoppeld && eenheid?.eenheid_melding_id !== melding?.melding_id) {
                    socket.emit("eenheid:ontkoppel", eenheid.eenheid_roepnummer, true);
                    await new Promise(resolve => setTimeout(resolve, 250));
                }

                if (!isAlGekoppeld) {
                    setTimeout(() => {
                        socket.emit("eenheid:melding_koppel",
                            eenheid.eenheid_roepnummer,
                            eenheid.eenheid_afdeling,
                            melding.melding_nummer,
                            melding.melding_id,
                            eenheid.eenheid_m_aantal,
                            mapGetOnKoppel(eenheid.eenheid_afdeling),
                            meldingObj
                        );
                    }, 750);

                    console.debug(`Eenheid ${roepnummer}, gekoppeld aan: ${melding.melding_nummer}.`);
                }
                socket.emit("eenheid:insert_pager", eenheid.eenheid_roepnummer, pagerBericht)
            }
        });

        $('#p2000_modal2').removeClass('is-active');
        ResetP2000Form();

        setTimeout(() => {
            socket.emit("create_kladblok_tekst", melding.melding_id, tijd, eigenaar, pagerBericht);
        }, 1000);

    });

    // Custom Paging
    $(document).on('change', '#p2000_prioriteit', (e) => {
        p2000_prioriteit = e.target.value;

        if (p2000_discipline !== '' && p2000_prioriteit !== '') {
            $('.p2000_field.brandweer').hide();
            $('.p2000_field.ambu').hide();

            if (p2000_discipline.toLowerCase() === 'brw') $('.p2000_field.brandweer').css("display", "flex");
            else if (p2000_discipline.toLowerCase() === 'ambu') $('.p2000_field.ambu').css("display", "flex");
        } else {
            $('.p2000_field.brandweer').hide();
            $('.p2000_field.ambu').hide();
        }

        updateP2000PagerFinal();
    });

    $(document).on('change', '#p2000_gespreksgroep', (e) => {
        p2000_gespreksgroep = e.target.value;

        updateP2000PagerFinal();
    });

    $(document).on('change', '#p2000_regio', (e) => {
        p2000_regio = e.target.value;

        $('#p2000_gespreksgroep').empty();
        p2000_gespreksgroep = '';

        if (p2000_discipline === 'brw') {
            const currentInciNummer = Number(huidigGeselecteerdeMelding?.nummer);
            $('#p2000_gespreksgroep').append(`
                <option value="">Kies een gespreksgroep</option>
                <option value="${getC2000Afko()}-${String(currentInciNummer).padStart(2, '0')}">${getC2000Afko()}-${String(currentInciNummer).padStart(2, '0')}</option>
                <option value="OD-${50 + currentInciNummer}">OD-${50 + currentInciNummer}</option>
                <option value="BRT-GBO-${850 + currentInciNummer}">BRT-GBO-${850 + currentInciNummer}</option>
            `);
        }
        updateP2000Eenheden();
        updateP2000PagerFinal();
    });


    $(document).on('change', '#p2000_dia', (e) => {
        p2000_dia = e.target.checked ? '(DIA: ja)' : '';

        updateP2000PagerFinal();
    });

    $(document).on('change', '#p2000_mmt', (e) => {
        p2000_mmt = e.target.checked;

        updateP2000PagerFinal();
    });

    $(document).on('change', '#p2000_discipline', (e) => {
        const isChanged = e.target.value !== p2000_discipline;

        p2000_discipline = e.target.value;

        if (e.target.value.toLowerCase() === 'brw') {
            $('#p2000_prioriteit').empty().append(`
                <option value="">Kies een prioriteit</option>
                <option value="P 1">P 1</option>
                <option value="P 2">P 2</option>
                <option value="P 3">P 3</option>
            `);

            const currentInciNummer = Number(huidigGeselecteerdeMelding?.nummer);
            $('#p2000_gespreksgroep').empty().append(`
                <option value="">Kies een gespreksgroep</option>
                <option value="${getC2000Afko()}-${String(currentInciNummer).padStart(2, '0')}">${getC2000Afko()}-${String(currentInciNummer).padStart(2, '0')}</option>
                <option value="OD-${50 + currentInciNummer}">OD-${50 + currentInciNummer}</option>
                <option value="BRT-GBO-${850 + currentInciNummer}">BRT-GBO-${850 + currentInciNummer}</option>
            `);
        } else if (e.target.value.toLowerCase() === 'ambu') {
            $('#p2000_prioriteit').empty().append(`
                <option value="">Kies een prioriteit</option>
                <option value="A0">A0</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
            `);
            $('#p2000_gespreksgroep').empty();
        }

        if (isChanged) {
            p2000_prioriteit = '';

            // $('#p2000_props_lijst').empty();
            $('#p2000_regio').empty();

            if (p2000_discipline === 'brw') {
                $('#p2000_regio').append(`
                     <option value="">Kies een regio</option>
<option value="09">(09) Utrecht</option>
                     <option value="15">(15) Haaglanden</option>
<option value="16">(16) Hollands-Midden</option>
                     <option value="17" selected>(17) Rotterdam-Rijnmond</option>
                `);
            } else if (p2000_discipline === 'ambu') {
                $('#p2000_regio').append(`
                    <option value="">Kies een regio</option>
<option value="09">(09) Utrecht</option>
                    <option value="13">(13) Amsterdam-Amstelland</option>
                    <option value="15">(15) Haaglanden</option>
<option value="16">(16) Hollands-Midden</option>
                    <option value="17" selected>(17) Rotterdam-Rijnmond</option>
                 `);
            }

            updateP2000Eenheden();
        }

        if (p2000_discipline !== '' && p2000_prioriteit !== '') {
            $('.p2000_field.brandweer').hide();
            $('.p2000_field.ambu').hide();

            if (p2000_discipline.toLowerCase() === 'brw') $('.p2000_field.brandweer').css("display", "flex");
            else if (p2000_discipline.toLowerCase() === 'ambu') $('.p2000_field.ambu').css("display", "flex");
        } else {
            $('.p2000_field.brandweer').hide();
            $('.p2000_field.ambu').hide();
        }

        updateP2000PagerFinal();
    });

    $(document).on('change', '#p2000_classificatie', (e) => {
        p2000_classificatie = e.target.value;

        updateP2000PagerFinal();
    });

    $(document).on('change', '#p2000_straatnaam', (e) => {
        p2000_straatnaam = e.target.value;

        updateP2000PagerFinal();
    });

    $(document).on('change', '#p2000_postcode', (e) => {
        p2000_postcode = e.target.value;

        updateP2000PagerFinal();
    });

    function removeP2000Prop(kar) {
        p2000_props = p2000_props.filter(prop => prop.value !== kar);
        $('#p2000_props_lijst').find(`[aria-labelledby="${kar}"]`).remove();

        updateP2000PagerFinal();
    }

    $(document).on('click', '#add_p2000_prop', () => {
        const selectValue = $('#p2000_karakteristieken').find(':selected').val();
        if (selectValue === '') return;

        const karakteristiek = karakteristieken.find(kar => kar.PAGERTEKST_BRW === selectValue);
        if (!karakteristiek) {
            $('#p2000_karakteristieken').val('');
            return toastr.error(`Er kon geen matchende karakteristiek gevonden worden!`);
        }

        if (p2000_props.find(p => p.value === karakteristiek.PAGERTEKST_BRW)) {
            $('#p2000_karakteristieken').val('');
            return toastr.error(`Deze prop zit momenteel al in het pagerbericht!`);
        }

        p2000_props.push({
            value: karakteristiek.PAGERTEKST_BRW,
            place: String(karakteristiek.PLAATS_IN_ALARMTEKST_BRW).toLowerCase() === 'voor mc' ? 'VOOR' : 'NA'
        });

        const $div = $(`<div aria-labelledby="${karakteristiek.PAGERTEKST_BRW}"><span>${karakteristiek.PAGERTEKST_BRW}</span></div>`);
        const $removeButton = $(`<button type="button">x</button>`);
        $removeButton.on('click', e => removeP2000Prop(karakteristiek.PAGERTEKST_BRW));

        $div.append($removeButton);

        $('#p2000_props_lijst').append($div);
        $('#p2000_karakteristieken').val('');
        updateP2000PagerFinal();
    });

    // Einde CustomP2000 Code

    const socket = io({
        transports: ['websocket'], // Eerst WebSockets proberen, dan polling
        reconnection: true, // Herverbind automatisch bij verbroken verbinding
        reconnectionAttempts: 5, // Maximaal 5 keer proberen te herverbinden
        reconnectionDelay: 2000 // Wacht 2 seconden tussen pogingen
    });

    GM_xmlhttpRequest({
        method: "GET",
        url: "https://raw.githubusercontent.com/nickvz34/rpr_gms_meldkamer_extensie/main/data/classificaties_v2.3.json?t=" + Date.now(),
        onload: function (response) {
            try {
                const data = JSON.parse(response.responseText);
                classificaties = data;
            } catch (error) {
                console.error(error);
                return toastr.error(`Er is iets misgegaan met het parsen van de classificaties!`);
            }

            if (!isP2000Set && karakteristieken.length > 0 && straatnamen.length > 0 && Object.keys(regioEenheden).length > 0) setupCustomP2000();
        }
    });

    GM_xmlhttpRequest({
        method: "GET",
        url: "https://raw.githubusercontent.com/nickvz34/rpr_gms_meldkamer_extensie/main/data/karakteristieken_v2.6.json?t=" + Date.now(),
        onload: function (response) {
            try {
                const data = JSON.parse(response.responseText);
                karakteristieken = data;
            } catch (error) {
                console.error(error);
                return toastr.error(`Er is iets misgegaan met het parsen van de karakteristieken!`);
            }

            if (!isP2000Set && karakteristieken.length > 0 && straatnamen.length > 0 && Object.keys(regioEenheden).length > 0) setupCustomP2000();
        }
    });

    GM_xmlhttpRequest({
        method: "GET",
        url: "https://raw.githubusercontent.com/nickvz34/rpr_gms_meldkamer_extensie/main/data/straatnamen.json?t=" + Date.now(),
        onload: function (response) {
            try {
                const data = JSON.parse(response.responseText);
                straatnamen = data;
            } catch (error) {
                console.error(error);
                return toastr.error(`Er is iets misgegaan met het parsen van de straatnamen!`);
            }

            if (!isP2000Set && karakteristieken.length > 0 && straatnamen.length > 0 && Object.keys(regioEenheden).length > 0) setupCustomP2000();
        }
    });

    GM_xmlhttpRequest({
        method: "GET",
        url: "https://raw.githubusercontent.com/nickvz34/rpr_gms_meldkamer_extensie/main/data/regio_eenheden.json?t=" + Date.now(),
        onload: function (response) {
            try {
                const data = JSON.parse(response.responseText);
                regioEenheden = data;
            } catch (error) {
                console.error(error);
                return toastr.error(`Er is iets misgegaan met het parsen van de regio-eenheden!`);
            }

            if (!isP2000Set && karakteristieken.length > 0 && straatnamen.length > 0 && Object.keys(regioEenheden).length > 0) setupCustomP2000();
        }
    });

    toastr.success("Alle externe data is succesvol ingeladen!");

    setupHTML();

    // Click handler
    $(document).on('click', e => {
        if (!isInEditMode) return;
        if ($(event.target).closest(`div.unsend-kladblok-msg#${currentEditId}`).length) return; // Geklikt in de draft div

        cancelEditedDraft(currentEditId);
    });

    // Hotkey/Shortcut om tabblad te wisselen
    $(document).on('keydown', e => {
        // if (e.target.id === 'kladblok_input') return; // Niet als je typt in het kladblok (TODO: of in de onderlinge chat..)

        if (e.altKey && e.key.toLowerCase() === 't') {
            e.preventDefault();

            const newTabId = activeTab === 'classificaties' ? 'karakteristieken' : activeTab === 'karakteristieken' ? 'locaties' : 'classificaties';

            $('li[role=tab]').each((idx, e) => {
                if (e.id === newTabId) {
                    $(e).attr('aria-selected', 'true')
                } else {
                    $(e).attr('aria-selected', false);
                }
            });

            $('.tab-content').hide();
            const $panel = $(`[role=tabpanel][aria-labelledby='tab-${newTabId}']`);
            $panel.show();

            activeTab = newTabId;

            const searchQuery = $('#kladblok_sendmsg').val();

            if (newTabId === 'classificaties') filterClassificaties(searchQuery);
            if (newTabId === 'karakteristieken') filterKarakteristieken(searchQuery);

            updateHint();
        }

    });

    $('li[role=tab]').click(e => {
        const tabId = $(e.currentTarget).attr("id");

        $('li[role=tab]').each((idx, e) => {
            if (e.id === tabId) {
                $(e).attr('aria-selected', 'true')
            } else {
                $(e).attr('aria-selected', false);
            }
        });

        $('.tab-content').hide();
        const $panel = $(`[role=tabpanel][aria-labelledby='tab-${tabId}']`);
        $panel.show();

        activeTab = tabId;

        const searchQuery = $('#kladblok_sendmsg').val();

        if (tabId === 'classificaties') filterClassificaties(searchQuery);
        if (tabId === 'karakteristieken') filterKarakteristieken(searchQuery);

        updateHint();
    });

    // Filter Classificaties en/of Karakteristieken bij input
    $('#kladblok_sendmsg').on('input', e => {
        if (filterDebounce !== null) clearTimeout(filterDebounce);

        const inputQuery = String(e.target.value || '');
        if (inputQuery.trim() === '') $('#table_karakteristieken_body').empty();

        if ($(`[role=tabpanel][aria-labelledby='tab-locaties']`).is(':visible')) filterLocaties(String(e.target.value));

        filterDebounce = setTimeout(() => {
            if ($(`[role=tabpanel][aria-labelledby='tab-classificaties']`).is(':visible')) filterClassificaties(String(e.target.value));
            if ($(`[role=tabpanel][aria-labelledby='tab-karakteristieken']`).is(':visible')) filterKarakteristieken(String(e.target.value));
        }, 350);

        $('table.interactive').parent().scrollTop(0);

        $('#kladblok_input_hint').css('margin-left', `${String(e.target.value).length === 0 ? 12 : String(e.target.value).length + 4}ch`);
        updateHint();
    });

    $('#kladblok_sendmsg').on('keydown', (e) => {
        if (e.key === "=" && e.currentTarget.value.trim() === "") {
            const newTabId = 'locaties';

            $('li[role=tab]').each((idx, e) => {
                if (e.id === newTabId) {
                    $(e).attr('aria-selected', 'true')
                } else {
                    $(e).attr('aria-selected', false);
                }
            });

            $('.tab-content').hide();
            const $panel = $(`[role=tabpanel][aria-labelledby='tab-${newTabId}']`);
            $panel.show();

            activeTab = newTabId;
        }
    });

    function setTextToInput(text, index, doSpace = false) {
        const isSameText = $('#kladblok_sendmsg').val() === String(text);

        $('#kladblok_sendmsg').val(`${String(text)}${doSpace ? ' ' : ''}`);
        $('#kladblok_sendmsg').focus();
        if ($(`[role=tabpanel][aria-labelledby='tab-classificaties']`).is(':visible')) currentClassficatiesTabIndex = index;
        if ($(`[role=tabpanel][aria-labelledby='tab-karakteristieken']`).is(':visible')) currentKarakteristiekenTabIndex = index;

        if (!isSameText) {
            if ($(`[role=tabpanel][aria-labelledby='tab-classificaties']`).is(':visible')) filterClassificaties(String(text));
            if ($(`[role=tabpanel][aria-labelledby='tab-karakteristieken']`).is(':visible')) filterKarakteristieken(String(text));
        }

        $('#kladblok_input_hint').css('margin-left', `${String(text).length === 0 ? 12 : String(text).length + 4}ch`);
        updateHint();
    }

    function pasteValueToKladblok(event, text, type) {
        event.preventDefault();

        onCreateDraft(null, text, type);

        $('#kladblok_sendmsg').val('');
        $('#kladblok_sendmsg').focus();
    }

    let currentClassficaties = [];
    let currentClassficatiesTabIndex = -1;

    let currentKarakteristieken = [];
    let currentKarakteristiekenTabIndex = -1;

    // Zorg voor autocompletion wanneer er TAB gedrukt wordt
    $('#kladblok_sendmsg').on('keydown', e => {
        if (e.key !== 'Tab') return;
        e.preventDefault();

        if ($(`[role=tabpanel][aria-labelledby='tab-classificaties']`).is(':visible')) {
            const afkorting = currentClassficatiesTabIndex + 1 === currentClassficaties.length ? currentClassficaties[0]?.AFKORTING : currentClassficaties[currentClassficatiesTabIndex + 1]?.AFKORTING || null;
            if (!afkorting) return;

            $('#kladblok_sendmsg').val(`-${afkorting}`);
            $('#kladblok_input_hint').css('margin-left', `${String(afkorting).length === 0 ? 12 : String(afkorting).length + 5}ch`);
            if (currentClassficatiesTabIndex + 1 <= currentClassficaties.length - 1) {
                currentClassficatiesTabIndex++;
            } else {
                currentClassficatiesTabIndex = 0;
            }
            updateHint();

            const $tableRow = $(`#table_classificaties_body > tr:nth-child(${currentClassficatiesTabIndex + 1})`);

            $tableRow[0].scrollIntoView({ behavior: 'instant', block: 'center' });

            $('#table_classificaties_body > tr').removeClass('highlighted');
            $tableRow.first().addClass('highlighted');

        } else if ($(`[role=tabpanel][aria-labelledby='tab-karakteristieken']`).is(':visible')) {
            const karakteristiek = currentKarakteristiekenTabIndex + 1 === currentKarakteristieken.length ? currentKarakteristieken[0] : currentKarakteristieken[currentKarakteristiekenTabIndex + 1] || null;
            if (!karakteristiek) return;

            const inputRequires = String(karakteristiek.TYPE).toLowerCase() === 'getal' || String(karakteristiek.TYPE).toLowerCase() === 'vrije tekst';
            const isGeenWaarde = karakteristiek.PARSER_WAARDE === "" || karakteristiek.PARSER_WAARDE === "-";
            const afkorting = isGeenWaarde ? karakteristiek.PARSER_NAAM : karakteristiek.PARSER_WAARDE;
            $('#kladblok_sendmsg').val(`-${afkorting}${inputRequires ? ' ' : ''}`);
            $('#kladblok_input_hint').css('margin-left', `${String(afkorting).length === 0 ? 12 : String(afkorting).length + 6}ch`);
            if (currentKarakteristiekenTabIndex + 1 <= currentKarakteristieken.length - 1) {
                currentKarakteristiekenTabIndex++;
            } else {
                currentKarakteristiekenTabIndex = 0;
            }
            updateHint();

            const $tableRow = $(`#table_karakteristieken_body > tr:nth-child(${currentKarakteristiekenTabIndex + 1})`);

            $tableRow[0].scrollIntoView({ behavior: 'instant', block: 'center' });

            $('#table_karakteristieken_body > tr').removeClass('highlighted');
            $tableRow.first().addClass('highlighted');
        }
    });

    function updateHint() {
        const searchQuery = String($('#kladblok_sendmsg').val()).trim();
        if (!searchQuery.startsWith('-')) {
            $('#kladblok_input_hint').val('');
            $('#kladblok_input_hint').hide();
            return;
        }

        const classificatie = classificaties.find(cls => String(`-${cls.AFKORTING}`) === searchQuery.toLowerCase() || cls.PARSERTERMEN.includes(searchQuery.toLowerCase()));
        const karakteristiek = karakteristieken.find(kar => {
            const isInput = kar.WAARDE === null && kar.SOORT_PARSER == "Enkele parser";

            const woorden = normalize(searchQuery).split(' ');
            if (!woorden[0]) return undefined;

            const zoekWoord = woorden[0];

            if (isInput) {
                // Iets anders bedenken..
                return String(kar.PRIMAIRE_PARSER).toLowerCase() === zoekWoord;
            } else {
                return String(kar.PRIMAIRE_PARSER).toLowerCase() === searchQuery.toLowerCase() || kar.PARSERTERMEN.includes(searchQuery.toLowerCase());
            }
        });

        if (classificatie) {
            $('#kladblok_input_hint').show();
            $('#kladblok_input_hint').text(`| ${[classificatie.MC_1, classificatie.MC_2, classificatie.MC_3].filter(v => v !== '').join('/')} (${classificatie.PRESENTATIETEKST?.trim()}) [CLASSIFICATIE]`);
        } else if (karakteristiek) {
            let waarde = karakteristiek.WAARDE;

            //if (String(karakteristiek.TYPE).toLowerCase() === 'getal') waarde = parseInt(searchQuery.split(' ').pop());
            //if (String(karakteristiek.TYPE).toLowerCase() === 'vrije tekst') waarde = searchQuery.replace(`-${karakteristiek.NAAM}`, '').replace(`-${karakteristiek.WAARDE}`, '').trim() || '';

            $('#kladblok_input_hint').show();
            $('#kladblok_input_hint').text(`| ${karakteristiek.NAAM}: ${waarde} [KARAKTERISTIEK]`);
        } else {
            $('#kladblok_input_hint').val('');
            $('#kladblok_input_hint').hide();
        }
    }

    function filterClassificaties(searchQuery) {
        searchQuery = String(searchQuery).toLowerCase();

        const matchingClassificaties = getMatchingClassificaties(searchQuery);

        const $lijst = $('#table_classificaties_body').empty();

        if (matchingClassificaties.length > 0) {
            matchingClassificaties.forEach((r, idx) => {
                const $row = $(`
                    <tr title="𝗣𝗮𝗿𝘀𝗲𝗿𝘁𝗲𝗿𝗺𝗲𝗻:\n${r.PARSERTERMEN.join("\n")}">
                        <td>${idx}</td>
                        <td>${r.PRIMAIRE_PARSER}</td>
                        <td>${r.MC_1}</td>
                        <td>${r.MC_2}</td>
                        <td>${r.MC_3}</td>
                        <td>-${r.AFKORTING}</td>
                        <td>${r.PRESENTATIETEKST}</td>
                        <td>${r.PAGERTEKST_BRW}</td>
                        <td>${r.DEFAULT_PRIO_POL}</td>
                        <td>${r.DEFAULT_PRIO_BRW}</td>
                        <td>${r.DEFAULT_PRIO_CPA}</td>
                        <td>${r.PARSERTERMEN.join(', ')}</td>
                        <td>${r.score}</td>
                    </tr>
                `);

                $row.on('click', () => setTextToInput(`-${r.AFKORTING}`, `${idx}`, false));
                $row.on('contextmenu', (e) => pasteValueToKladblok(e, `-${r.AFKORTING} | ${[r.MC_1, r.MC_2, r.MC_3].filter(v => v !== '').join('/')}`, 'classificatie'));

                $lijst.append($row);
            });
        } else {
            $lijst.append(`
            <tr>
                <td colspan="13" style="font-style: italic;">Geen resultaten gevonden</td>
            </tr>
        `);
        }

        currentClassficaties = matchingClassificaties;
    }

    function getMatchingClassificaties(searchQuery) {
        if (String(searchQuery).trim().length < 3) return [];
        const woorden = normalize(searchQuery).split(" ");

        return classificaties.map(item => {
            let score = 0;

            const velden = {
                AFKORTING: `-${normalize(item.AFKORTING || "")}`,
                PRIMAIRE_PARSER: normalize(item.PRIMAIRE_PARSER || ""),
                MC_1: normalize(item.MC_1 || ""),
                MC_2: normalize(item.MC_2 || ""),
                MC_3: normalize(item.MC_3 || ""),
                PRESENTATIETEKST: normalize(item.PRESENTATIETEKST || ""),
                WAARDE: normalize(item.WAARDE || ""),
                NAAM: normalize(item.NAAM || "")
            };

            woorden.forEach(w => {
                if (!w) return;

                if (item.PARSERTERMEN.includes(`-${w}`)) score += 8;

                // Gewicht per veld
                if (velden.PRIMAIRE_PARSER.startsWith(w)) score += 6;
                else if (velden.PRIMAIRE_PARSER.includes(w)) score += 3;

                if (velden.WAARDE.startsWith(w)) score += 4;
                else if (velden.WAARDE.includes(w)) score += 2;

                if (velden.NAAM.startsWith(w)) score += 2;
                else if (velden.NAAM.includes(w)) score += 1;

                // Nieuwe velden zonder specifieke score → gewoon baseline
                ["AFKORTING", "MC_1", "MC_2", "MC_3", "PRESENTATIETEKST"].forEach(v => {
                    if (velden[v].startsWith(w)) score += 2;
                    else if (velden[v].includes(w)) score += 1;
                });
            });

            return { ...item, score };
        }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
    }

    function filterKarakteristieken(searchQuery) {
        searchQuery = String(searchQuery).toLowerCase();

        const karakteristieken = getMatchingKarakteristieken(searchQuery).filter(i => i.score >= 4);

        const $lijst = $('#table_karakteristieken_body').empty();

        if (karakteristieken.length > 0) {
            karakteristieken.forEach((r, idx) => {
                const onClickValue = r.WAARDE === null || String(r.WAARDE) === "" || String(r.WAARDE) === "-" ? r.NAAM : r.WAARDE;

                const $row = $(`
                    <tr title="𝗣𝗮𝗿𝘀𝗲𝗿𝘁𝗲𝗿𝗺𝗲𝗻:\n${r.PARSERTERMEN.join("\n")}">
                        <td>${idx}</td>
                        <td>${r.PRIMAIRE_PARSER}</td>
                        <td>${r.NAAM}</td>
                        <td>${r.WAARDE}</td>
                        <td>${r.PAGERTEKST_BRW}</td>
                        <td>${r.PLAATS_IN_ALARMTEKST_BRW}</td>
                        <td>${r.PARSERTERMEN.join(", ")}</td>
                        <td>${r.score}</td>
                    </tr>
                `);

                let waarde = r.WAARDE;

                //if (String(r.TYPE).toLowerCase() === 'getal') waarde = parseInt(searchQuery.split(' ').pop());
                //if (String(r.TYPE).toLowerCase() === 'vrije tekst') waarde = searchQuery.replace(`-${r.PARSER_NAAM}`, '').replace(`-${r.PARSER_WAARDE}`, '').trim() || '';

                //$row.on('click', () => setTextToInput(`-${onClickValue}`, `${idx}`, `${String(r.TYPE).toLowerCase() === 'getal' || String(r.TYPE).toLowerCase() === 'vrije tekst'}`, 'karakteristiek'));
                $row.on('click', () => setTextToInput(`-${onClickValue}`, `${idx}`, false, 'karakteristiek'));
                $row.on('contextmenu', (e) => pasteValueToKladblok(e, `-${onClickValue} | ${r.NAAM}: ${waarde}`));

                $lijst.append($row);
            });
        } else {
            $lijst.append(`
            <tr>
                <td colspan="8" style="font-style: italic;">Geen resultaten gevonden</td>
            </tr>
        `);
        }


        currentKarakteristieken = karakteristieken;
    }

    function getMatchingKarakteristieken(searchQuery) {
        if (String(searchQuery).trim().length < 3) return [];
        const woorden = normalize(searchQuery).split(" ");

        if (!woorden[0]) return [];
        const filterWord = woorden[0];

        return karakteristieken.map(item => {
            let score = 0;

            const parser = normalize(item.PRIMAIRE_PARSER);
            const waarde = normalize(item.WAARDE || "");
            const naam = normalize(item.NAAM);

            if (item.PARSERTERMEN.includes(`-${filterWord}`)) score += 8;

            if (parser.startsWith(filterWord)) score += 6;
            else if (parser.includes(filterWord)) score += 3;

            if (waarde.startsWith(filterWord)) score += 4;
            else if (waarde.includes(filterWord)) score += 2;

            if (naam.startsWith(filterWord)) score += 2;
            else if (naam.includes(filterWord)) score += 1;

            return { ...item, score };
        }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
    }

    function resetTreffers() {
        console.debug(`Resetting locatie-treffers!`);

        $('#table_locaties_body').empty();
        locatieTreffers = [];
    }


    function filterLocaties(kladblokValue) {
        if (!straatnamenFuse && straatnamen.length > 0) {
            straatnamenFuse = new Fuse(straatnamen, {
                includeScore: true,
                threshold: 0.5,
                distance: 100,
                minMatchCharLength: 2,
                ignoreLocation: true,
            });
        }

        if (!plaatsnamenFuse && plaatsnamen.length > 0) {
            plaatsnamenFuse = new Fuse(plaatsnamen, {
                includeScore: true,
                threshold: 0.5,
                distance: 100,
                minMatchCharLength: 2,
                ignoreLocation: true,
            });
        }

        if (
            kladblokValue.length === 0 ||
            (kladblokValue.length > 0 && kladblokValue.charAt(0) !== "=")
        ) return resetTreffers();

        const searchQuery = String(kladblokValue).slice(1);

        if (kladblokValue.includes("/")) {
            const [plaatsnaam, straatnaam] = searchQuery.split("/");

            if (plaatsnamen.includes(plaatsnaam) && straatnamen.includes(straatnaam))
                return resetTreffers();
        }

        const oldValue = prevKladblokValue.current;
        prevKladblokValue.current = searchQuery;

        const nieuweChar = searchQuery.replace(oldValue, "").trim().slice(-1);
        const nieuweCharNmb = parseInt(nieuweChar);

        if (!isNaN(nieuweCharNmb) && locatieTreffers[nieuweCharNmb]) {
            const treffer = locatieTreffers[nieuweCharNmb];

            $('#kladblok_sendmsg').val(treffer.type === "plaatsnaam"
                ? `=${treffer.value}/`
                : `=${searchQuery.split("/")[0]}/${treffer.value}`);

            resetTreffers();
            return;
        }

        const $lijst = $('#table_locaties_body').empty();

        if (searchQuery.includes("/")) {
            const straatnaamQuery = searchQuery.split("/")[1];
            const results = straatnamenFuse.search(straatnaamQuery);

            console.log(straatnaamQuery, results);

            locatieTreffers = results.slice(0, 10).map((r) => ({ type: "straatnaam", value: r.item }));
            locatieTreffers.forEach((treffer, idx) => {
                $lijst.append(`
                 <tr className="bg-98.1">
                    <td>${idx}</td>
                    <td>${treffer.type.toUpperCase()}</td>
                    <td>${treffer.value}</td>
                  </tr>
            `.trim())
            });
        } else {
            // Plaatsnaam!
            const results = plaatsnamenFuse.search(searchQuery);
            locatieTreffers = results.slice(0, 10).map((r) => ({ type: "plaatsnaam", value: r.item }));
            locatieTreffers.forEach((treffer, idx) => {
                $lijst.append(`
                 <tr className="bg-98.1">
                    <td>${idx}</td>
                    <td>${treffer.type.toUpperCase()}</td>
                    <td>${treffer.value}</td>
                  </tr>
            `.trim())
            });
        }
    }

    function saveEditedDraft(id) {
        const idAsInt = parseInt(id);
        const $draftRegel = $(`.unsend-kladblok-msg#${id}`);
        if (!$draftRegel[0]) return toastr.error(`Geen draft-regel kunnen vinden met ID: ${id}`);

        const $input = $draftRegel.find('input[type=text]');

        if (!unsendMessages[idAsInt]) return toastr.error(`Er kon geen unsendMessage gevonden worden met ID: ${id}`);
        unsendMessages[idAsInt] = { ...unsendMessages[idAsInt], message: $input.val() }

        const $tekstP = $(`<p class="kladblok-draft-content" style="user-select:none;cursor:pointer;flex:1;">${$input.val()}</p>`);
        $tekstP.on('dblclick', () => onEditBtnClick(id));
        $input.replaceWith($tekstP);

        $draftRegel.find('button.save').remove();
        $('#kladblok_sendmsg').focus();

        isInEditMode = false;
        currentEditId = -1;
    }

    function cancelEditedDraft(id) {
        const idAsInt = parseInt(id);
        const $draftRegel = $(`.unsend-kladblok-msg#${id}`);
        if (!$draftRegel[0]) return toastr.error(`Geen draft-regel kunnen vinden met ID: ${id}`);
        if (!unsendMessages[idAsInt]) return toastr.error(`Er kon geen unsendMessage gevonden worden met ID: ${id}`);

        const $input = $draftRegel.find('input[type=text]');

        const $tekstP = $(`<p class="kladblok-draft-content" style="user-select:none;cursor:pointer;flex:1;">${unsendMessages[idAsInt]}</p>`);
        $tekstP.on('dblclick', () => onEditBtnClick(id));
        $input.replaceWith($tekstP);

        $draftRegel.find('button.save').remove();
        $('#kladblok_sendmsg').focus();

        isInEditMode = false;
        currentEditId = -1;
    }

    function onEditBtnClick(id) {
        const $draftRegel = $(`.unsend-kladblok-msg#${id}`);
        if (!$draftRegel[0]) return toastr.error(`Geen draft-regel kunnen vinden met ID: ${id}`);

        const $tekstP = $draftRegel.find('.kladblok-draft-content');

        const $input = $(`<input type="text" value="${$tekstP.text()}" style="flex:1;width:100%;" />`);
        const r_input = $input[0]

        $input.on('keydown', (e) => {
            if (String(e.key).toLowerCase() === 'enter') {
                saveEditedDraft(id);
            }

            if (String(e.key).toLowerCase() === 'escape') {
                cancelEditedDraft(id);
            }
        });

        $tekstP.replaceWith($input);

        const $saveButton = $(`<button type="button" class="save" style="margin-left:auto;cursor:pointer;">SAVE</button>`);
        $saveButton.on('click', () => saveEditedDraft(id));

        $draftRegel.find('button.delete').before($saveButton);

        $input.focus();

        const valLength = $input.val().length;
        r_input.setSelectionRange(valLength, valLength);
        isInEditMode = true;
        currentEditId = parseInt(id);
    }

    function onDeleteBtnClick(id) {
        const idAsInt = parseInt(id);
        if (!unsendMessages[idAsInt]) return toastr.error(`Geen concept bericht kunnen vinden!`);

        const $draftRegel = $(`.unsend-kladblok-msg#${id}`);
        $draftRegel.remove();
        unsendMessages[idAsInt] = null;

        $('#kladblok_sendmsg').focus();
    }

    function onCreateDraft(event, text, type) {
        if (event) event.preventDefault();

        const unsendIdx = unsendMessages.length;

        const $draftDiv = $(`
           <div id="${unsendIdx}" class="unsend-kladblok-msg" style="display:flex;column-gap:0.5rem;background-color:lightgray;border:1px solid gray;align-items:center;">
              <div style="width:100%;display:flex;align-items:center;column-gap:0.25rem;padding-left:0.5rem;">
                 <p style="font-weight:bold;">${getCurrentTime()}:</p>
              </div>
           </div>
        `);

        const $tekstP = $(`<p class="kladblok-draft-content" style="user-select:none;cursor:pointer;flex:1;">${text}</p>`);
        $tekstP.on('dblclick', () => onEditBtnClick(unsendIdx));

        $draftDiv.find('div').append($tekstP);

        const $draftDeleteButton = $(`<button type="button" title="Regel verwijderen" class="delete" style="margin-left:auto;cursor:pointer;">🗑️</button>`);
        $draftDeleteButton.on('click', () => onDeleteBtnClick(unsendIdx));
        $draftDiv.append($draftDeleteButton);

        $('#kladblok_from_bericht').append($draftDiv);
        unsendMessages.push({
            type,
            message: text
        });

        refreshAll();

        $('table.interactive').parent().scrollLeft(0);
    }

    function refreshAll(clearInput = true) {
        if (clearInput) $('#kladblok_sendmsg').val('');

        $('#kladblok_input_hint').val('');
        $('#kladblok_input_hint').hide();

        currentClassficatiesTabIndex = -1;
        currentKarakteristiekenTabIndex = -1;

        if ($(`[role=tabpanel][aria-labelledby='tab-classificaties']`).is(':visible')) filterClassificaties(String(''));
        if ($(`[role=tabpanel][aria-labelledby='tab-karakteristieken']`).is(':visible')) filterKarakteristieken(String(''));
    }

    function handleActies(acties, huidigeMelding, data) {
        console.debug(`handleActies:`, acties, huidigeMelding, data);
        const melding = meldingen.find(mld => mld.melding_id === huidigeMelding.melding_id);
        if (!melding) return console.error('Geen melding kunnen vinden voor handleActies!');

        for (const actie of acties) {
            const parts = String(actie).split(";");
            if (parts?.length === 0) continue;

            if (parts[0] === "titel_opschaling_b") {
                const waarde = String(parts[1]);

                let newTitel = String(melding.melding_titel);

                // Verwijder alle (OPS: xxx)
                const propMatches = [...newTitel.matchAll(/\(.*?\)/g)];
                if (propMatches?.length > 0) {
                    for (const [value] of propMatches) {
                        if (value.toUpperCase().includes("OPS:") || (value.toUpperCase().includes("KLEIN") || value.toUpperCase().includes("MIDDEL") || value.toUpperCase().includes("GROOT") || value.toUpperCase().includes("ZEER GROOT"))) newTitel = newTitel.replace(value, ""); // Verwijder de oude opschaling props..
                    }
                }

                newTitel = String(newTitel).trim(); // Verwijder alle mogelijke spaties aan de uiteindes
                newTitel += ` (OPS: ${waarde})`;

                const promptResponse = prompt("Weet je het zeker dat je de melding titel wilt wijzigen naar;", newTitel);
                if (promptResponse !== null && promptResponse !== "") {
                    const classificatie = getClassificatieFromTitel(promptResponse);
                    if (classificatie) {
                        const tsChannelName = getTSChannelName(melding, classificatie.PRESENTATIETEKST);
                        socket.emit("meldkamer:update_melding", melding.discipline, melding.priorit, melding.melding_locatie, promptResponse, melding.melding_id, melding.ts_kanaal_id, tsChannelName);
                    } else {
                        toastr.error("Er kon geen classificatie worden gevonden! Melding titel is niet gewijzigd!");
                    }
                }

                if (String(waarde).toUpperCase() == "GROOT" || String(waarde).toUpperCase() == "ZEER GROOT") {
                    $('.eenheid-in-kladblok').each((idx, elem) => {
                        const naam = $(elem).text().trim();
                        if (String(naam).toUpperCase().includes("SVD")) {
                            let sendTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Europe/Amsterdam' });

                            socket.emit("meldkamer:insert_new_chat", `@${naam} Incident #${melding?.melding_nummer} is opgeschaald naar ${waarde}`, meldkamer?.meldkamer_naam, sendTime);
                        }
                    });
                }
            } else if (parts[0] === "titel_opschaling_a") {
                const waarde = String(parts[1]);
                let newTitel = String(melding.melding_titel);

                const propMatches = [...newTitel.matchAll(/\(.*?\)/g)];
                if (propMatches?.length > 0) {
                    for (const [value] of propMatches) {
                        if (value.toUpperCase().includes("CODE")) newTitel = newTitel.replace(value, ""); // Verwijder de oude opschaling props..
                    }
                }

                newTitel = String(newTitel).trim(); // Verwijder alle mogelijke spaties aan de uiteindes
                newTitel += ` (${waarde})`;

                const promptResponse = prompt("Weet je het zeker dat je de melding titel wilt wijzigen naar;", newTitel);
                if (promptResponse !== null && promptResponse !== "") {
                    const classificatie = getClassificatieFromTitel(promptResponse);
                    if (classificatie) {
                        const tsChannelName = getTSChannelName(melding, classificatie.PRESENTATIETEKST);
                        socket.emit("meldkamer:update_melding", melding.discipline, melding.priorit, melding.melding_locatie, promptResponse, melding.melding_id, melding.ts_kanaal_id, tsChannelName);
                    } else {
                        toastr.error("Er kon geen classificatie worden gevonden! Melding titel is niet gewijzigd!");
                    }
                }

                if (parseInt(waarde.split(" ")[1], 10)) {
                    $('.eenheid-in-kladblok').each((idx, elem) => {
                        const naam = $(elem).text().trim();
                        if (String(naam).toUpperCase().includes("SVD")) {
                            let sendTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Europe/Amsterdam' });

                            socket.emit("meldkamer:insert_new_chat", `@${naam} Incident #${melding?.melding_nummer} is opgeschaald naar GHOR Code: ${parseInt(waarde.split(" ")[1], 10)}`, meldkamer?.meldkamer_naam, sendTime);
                        }
                    });
                }
            } else if (parts[0] === "titel_btgp") {
                const waarde = String(parts[1]);
                let newTitel = String(melding.melding_titel);

                if (waarde == "REMOVE") {
                    const propMatches = [...newTitel.matchAll(/\(.*?\)/g)];
                    if (propMatches?.length > 0) {
                        for (const [value] of propMatches) {
                            if (value.toUpperCase() == "(BTGP)") newTitel = newTitel.replace(value, ""); // Verwijder de oude BTGP prop..
                        }
                    }
                }

                newTitel = String(newTitel).trim(); // Verwijder alle mogelijke spaties aan de uiteindes
                if (waarde == "BTGP") newTitel += ` (${waarde})`;

                const promptResponse = prompt("Weet je het zeker dat je de melding titel wilt wijzigen naar;", newTitel);
                if (promptResponse !== null && promptResponse !== "") {
                    const classificatie = getClassificatieFromTitel(promptResponse);
                    if (classificatie) {
                        const tsChannelName = getTSChannelName(melding, classificatie.PRESENTATIETEKST);
                        socket.emit("meldkamer:update_melding", melding.discipline, melding.priorit, melding.melding_locatie, promptResponse, melding.melding_id, melding.ts_kanaal_id, tsChannelName);
                    } else {
                        toastr.error("Er kon geen classificatie worden gevonden! Melding titel is niet gewijzigd!");
                    }
                }
            } else if (parts[0] === "mk_chat") {
                const waarde = String(parts[1]);
                let newTitel = String(melding.melding_titel);

                let sendTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Europe/Amsterdam' });
                let mkTxt = waarde;

                if (mkTxt.includes("{INCI_NMR}")) mkTxt = mkTxt.replace("{INCI_NMR}", melding?.melding_nummer);

                // 42["meldkamer:insert_new_chat",".","TEST","16:39:35"]
                socket.emit("meldkamer:insert_new_chat", mkTxt, meldkamer?.meldkamer_naam, sendTime);
            } else if (parts[0] === "titel_prop") {
                const waarde = String(parts[1]);
                let newTitel = String(melding.melding_titel);

                if (newTitel.includes(`(${waarde})`)) return;

                newTitel = String(newTitel).trim(); // Verwijder alle mogelijke spaties aan de uiteindes
                newTitel += ` (${waarde})`;

                const promptResponse = prompt("Weet je het zeker dat je de melding titel wilt wijzigen naar;", newTitel);
                if (promptResponse !== null && promptResponse !== "") {
                    const classificatie = getClassificatieFromTitel(promptResponse);
                    if (classificatie) {
                        const tsChannelName = getTSChannelName(melding, classificatie.PRESENTATIETEKST);
                        socket.emit("meldkamer:update_melding", melding.discipline, melding.priorit, melding.melding_locatie, promptResponse, melding.melding_id, melding.ts_kanaal_id, tsChannelName);
                    } else {
                        toastr.error("Er kon geen classificatie worden gevonden! Melding titel is niet gewijzigd!");
                    }
                }
            } else if (parts[0] === "opschaling_dsi") {
                const waarde = String(parts[1]);
                let newTitel = String(melding.melding_titel);

                const propMatches = [...newTitel.matchAll(/\(.*?\)/g)];
                if (propMatches?.length > 0) {
                    for (const [value] of propMatches) {
                        if (value.toUpperCase() == "(RRT)" || value.toUpperCase() == "(VOL. DSI/QRF)" || value.toUpperCase() == "(UIM)") newTitel = newTitel.replace(value, ""); // Verwijder de oude DSI props..
                    }
                }

                newTitel = String(newTitel).trim(); // Verwijder alle mogelijke spaties aan de uiteindes
                newTitel += ` (${waarde})`;

                const promptResponse = prompt("Weet je het zeker dat je de melding titel wilt wijzigen naar;", newTitel);
                if (promptResponse !== null && promptResponse !== "") {
                    const classificatie = getClassificatieFromTitel(promptResponse);
                    if (classificatie) {
                        const tsChannelName = getTSChannelName(melding, classificatie.PRESENTATIETEKST);
                        socket.emit("meldkamer:update_melding", melding.discipline, melding.priorit, melding.melding_locatie, promptResponse, melding.melding_id, melding.ts_kanaal_id, tsChannelName);
                    } else {
                        toastr.error("Er kon geen classificatie worden gevonden! Melding titel is niet gewijzigd!");
                    }
                }

                let sendTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Europe/Amsterdam' });
                socket.emit("meldkamer:insert_new_chat", `Incident #${melding?.melding_nummer} inzet DSI: ${waarde}`, meldkamer?.meldkamer_naam, sendTime);
            } else if (parts[0] === "opschaling_grip") {
                const waarde = String(parts[1]);

                let newTitel = String(melding.melding_titel);

                // Verwijder alle (OPS: xxx)
                const propMatches = [...newTitel.matchAll(/\(.*?\)/g)];
                if (propMatches?.length > 0) {
                    for (const [value] of propMatches) {
                        if (value.toUpperCase().includes("GRIP")) newTitel = newTitel.replace(value, ""); // Verwijder de oude GRIP opschaling props..
                    }
                }

                newTitel = String(newTitel).trim(); // Verwijder alle mogelijke spaties aan de uiteindes
                newTitel += ` (GRIP ${waarde})`;

                const promptResponse = prompt("Weet je het zeker dat je de melding titel wilt wijzigen naar;", newTitel);
                if (promptResponse !== null && promptResponse !== "") {
                    const classificatie = getClassificatieFromTitel(promptResponse);
                    if (classificatie) {
                        const tsChannelName = getTSChannelName(melding, classificatie.PRESENTATIETEKST);
                        socket.emit("meldkamer:update_melding", melding.discipline, melding.priorit, melding.melding_locatie, promptResponse, melding.melding_id, melding.ts_kanaal_id, tsChannelName);
                    } else {
                        toastr.error("Er kon geen classificatie worden gevonden! Melding titel is niet gewijzigd!");
                    }
                }

                if (Number(waarde) > 0) {
                    $('.eenheid-in-kladblok').each((idx, elem) => {
                        const naam = $(elem).text().trim();
                        if (String(naam).toUpperCase().includes("SVD")) {
                            let sendTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Europe/Amsterdam' });

                            socket.emit("meldkamer:insert_new_chat", `@${naam} Incident #${melding?.melding_nummer} is opgeschaald naar GRIP: ${waarde}`, meldkamer?.meldkamer_naam, sendTime);
                        }
                    });
                }
            } else if (parts[0] === "prio_opschaling") {
                // 42["meldkamer:update_melding_prio",{"melding_id":"16928","nieuwe_prio":"prio1"}]
                const socketValue = parts[1] === "prio1" ? "-spoed (ingeschat als spoed-melding" : parts[1] === "prio2" ? "-nu (ingeschat als nu-melding" : "-later (ingeschat als later-melding";

                socket.emit('meldkamer:update_melding_prio', melding.melding_id, socketValue);
            }
        }
    }

    // Kladblok Simulator
    $('#kladblok_sendmsg').on('keydown', async (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();

        const searchQuery = String($('#kladblok_sendmsg').val()).trim();

        const huidigeMelding = meldingen.find(melding => melding.melding_id === huidigGeselecteerdeMelding.melding_id);
        if (!huidigeMelding) {
            toastr.error('Er is geen melding geselecteerd om in te kunnen typen!');
            refreshAll();
            return;
        }

        if (searchQuery === "") return;

        if (searchQuery === "/pager") {
            $('#p2000_locaties').empty();
            locaties.hectometerpalen.forEach(item => {
                const $option = $('<option></option>');
                $option.attr('value', item["code"]);
                $('#p2000_locaties').append($option);
            });
            locaties.postcodes.forEach(item => {
                const $option = $('<option></option>');
                $option.attr('value', item["code"]);
                $('#p2000_locaties').append($option);
            });

            ResetP2000Form();

            const huidigeMelding = meldingen.find(melding => melding.melding_id === huidigGeselecteerdeMelding.melding_id);
            const locatieRegex = /^=([\p{L}\p{N}'’\-]+)\/([\p{L}\p{N}'’\-\s]+)$/u;

            // Als we een melding kunnen vinden.. laadt bepaalde data alvast in, dat scheelt wss weer invoer moeite.
            if (huidigeMelding) {

                p2000_postcode = huidigeMelding.melding_locatie;
                $('#p2000_postcode').val(huidigeMelding.melding_locatie);

                const reverseKladblok = [...huidigeMelding.kladblok].reverse();

                // Probeer een locatie markering te vinden.
                const locatieRegel = reverseKladblok.find(kb => kb.kladblok_bericht.startsWith('=') && locatieRegex.test(kb.kladblok_bericht));
                if (locatieRegel) {
                    const locatieMatch = locatieRegel.kladblok_bericht.match(locatieRegex);
                    if (locatieMatch) {
                        p2000_straatnaam = locatieMatch[2];
                        $('#p2000_straatnaam').val(locatieMatch[2]);
                    }
                }

                const afkorting = huidigeMelding.melding_titel?.split(' | ')[0];
                const classificatie = classificaties.find(cls => String(`-${cls.AFKORTING}`) === String(afkorting).toLowerCase() || cls.PARSERTERMEN.includes(afkorting.toLowerCase())) || undefined;
                if (classificatie) {
                    p2000_classificatie = classificatie.PAGERTEKST_BRW;
                    $('#p2000_classificatie').val(classificatie.PAGERTEKST_BRW);
                }

                let karHits = [];

                for (const { kladblok_bericht } of huidigeMelding.kladblok) {
                    if (!kladblok_bericht?.startsWith('-')) continue;

                    const match = kladblok_bericht.match(/-[^|]+/g);
                    if (!match || !match[0]) continue;

                    const value = String(match[0]).trim().toLowerCase();

                    const karHit = karakteristieken.filter(kar => String(kar.PAGERTEKST_BRW).trim() !== "").find(kar => String(kar.PRIMAIRE_PARSER).toLowerCase() == value || kar.PARSERTERMEN.includes(value));
                    if (karHit) {
                        karHits = karHits.filter(kar => kar.NAAM !== karHit.NAAM);
                        karHits.push(karHit);
                    }
                }

                for (const karHit of karHits) {
                    p2000_props.push({
                        value: karHit.PAGERTEKST_BRW,
                        place: String(karHit.PLAATS_IN_ALARMTEKST_BRW).toLowerCase() === 'voor mc' ? 'VOOR' : 'NA'
                    });

                    const $div = $(`<div aria-labelledby="${karHit.PAGERTEKST_BRW}"><span>${karHit.PAGERTEKST_BRW}</span></div>`);
                    const $removeButton = $(`<button type="button">x</button>`);
                    $removeButton.on('click', e => removeP2000Prop(karHit.PAGERTEKST_BRW));

                    $div.append($removeButton);

                    $('#p2000_props_lijst').append($div);
                }

                updateP2000PagerFinal();
            }

            $('#p2000_modal2').addClass('is-active');

            updateP2000Eenheden();

            refreshAll();
            return;
        }

        const koppelCommandoMatch = searchQuery.match(/^\.kop\s+(.+)$/);
        if (koppelCommandoMatch) {
            const roepnummersMatch = koppelCommandoMatch[1].match(/(?:rt)?\d{2,6}(?:-\d{1,4})?/g);
            if (!roepnummersMatch || roepnummersMatch.length === 0) return;

            let meldingObj = structuredClone(huidigeMelding);
            meldingObj.gekoppelde_eenheden ??= [];

            roepnummersMatch.forEach(roepnummer => {

                const eenheid = eenheden.find(eenh => {
                    const politieMatch = eenh.eenheid_roepnummer.toUpperCase().trim() === roepnummer.toUpperCase();
                    const brwAmbuMatch = eenh.eenheid_roepnummer.toUpperCase().trim().includes(roepnummer.toUpperCase()) || eenh.eenheid_roepnummer.toUpperCase().trim().replaceAll('-', '').includes(roepnummer.toUpperCase());
                    return politieMatch || brwAmbuMatch;
                });

                if (!eenheid) return toastr.error(`De eenheid met roepnummer: ${JSON.stringify(roepnummer)} kon niet worden gevonden!`);

                let status = mapGetOnKoppel(eenheid.eenheid_afdeling);
                meldingObj.gekoppelde_eenheden.push({
                    eenheid_afdeling: eenheid.eenheid_afdeling,
                    eenheid_roepnummer: eenheid.eenheid_roepnummer,
                    eenheid_status: status
                });

                if (eenheid?.eenheid_melding) {
                    pendingKoppelingen[eenheid.eenheid_roepnummer] = {
                        roepnummer: eenheid.eenheid_roepnummer,
                        afdeling: eenheid.eenheid_afdeling,
                        aantal: eenheid.eenheid_m_aantal,
                        status: status,
                        melding: meldingObj
                    };
                    socket.emit("eenheid:ontkoppel", eenheid.eenheid_roepnummer, true)
                } else {
                    socket.emit("eenheid:melding_koppel", eenheid.eenheid_roepnummer, eenheid.eenheid_afdeling, huidigGeselecteerdeMelding.nummer, huidigGeselecteerdeMelding.melding_id, eenheid.eenheid_m_aantal, status, meldingObj);
                }
                generateMeldingen();
            });


            $('#kladblok_sendmsg').val('');
            return;
        }

        const prioCommandoMatch = searchQuery.match(/^\.prio\s+([1-3])$/);
        if (prioCommandoMatch) {
            const prioriteit = parseInt(prioCommandoMatch[1], 10);
            const socketValue = prioriteit === 1 ? "-spoed (ingeschat als spoed-melding" : prioriteit === 2 ? "-nu (ingeschat als nu-melding" : "-later (ingeschat als later-melding";

            socket.emit('meldkamer:update_melding_prio', huidigeMelding.melding_id, socketValue);

            $('#kladblok_sendmsg').val('');
            return;
        }

        if (searchQuery === ".mr") {
            $('#kladblok_sendmsg').val('');

            if (unsendMessages.filter(msg => msg !== null).length === 0) {
                refreshAll();
                return toastr.error("Geen concept berichten om te verzenden!");
            }

            $(".unsend-kladblok-msg").remove();

            for (const { type, message } of unsendMessages.filter(msg => msg !== null)) {
                let melding = meldingen.find(melding => melding.melding_id.toString() == huidigGeselecteerdeMelding.melding_id.toString())

                if (message === "/c1") {
                    socket.emit("meldkamer:cvier_update", huidigGeselecteerdeMelding.melding_id, meldkamer.meldkamer_naam, 0);
                    continue;
                }

                if (message === "/c4") {
                    socket.emit("meldkamer:cvier_update", huidigGeselecteerdeMelding.melding_id, meldkamer.meldkamer_naam, 1);
                    continue;
                }

                if (message === "/meteo") {
                    socket.emit("meldkamer:request_weather", huidigGeselecteerdeMelding.melding_id, meldkamer.meldkamer_naam);
                    continue;
                }

                if (message === "/sep") {
                    if (!melding) toastr.error(`Er is geen melding geselecteerd om een separaat te maken!`);
                    let meldingNummer = melding.melding_nummer
                    let titel = "SEP #" + meldingNummer
                    nieuweMeldingAangemaakt = true
                    socket.emit("meldkamer:create_melding", melding.discipline, melding.priorit, melding.melding_locatie, titel, meldkamer.meldkamer_naam, melding.kladblok);
                    continue;
                }

                if (message.startsWith("/loc")) {
                    const argument = String(message.replace("/loc", "").trim());

                    const isGeldigeLocatie = locaties.hectometerpalen.find(locatie => locatie["code"].toString().toUpperCase() === argument.toString().toUpperCase()) ||
                        locaties.postcodes.find(locatie => locatie["code"].toString() === argument.toString())

                    if (!isGeldigeLocatie) {
                        toastr.error(`Kon incident locatie niet updaten in verband met een ongeldige locatie!`);
                        continue;
                    }

                    const classificatie = getClassificatieFromTitel(melding.melding_titel);
                    if (classificatie) {
                        const tsChannelName = getTSChannelName({ ...melding, melding_locatie: String(argument).toUpperCase() }, classificatie.PRESENTATIETEKST);
                        socket.emit("meldkamer:update_melding_locatie", String(argument).toUpperCase(), huidigGeselecteerdeMelding.melding_id, melding.ts_kanaal_id, tsChannelName);
                    } else {
                        toastr.error("Er kon geen classificatie worden gevonden! Melding titel is niet gewijzigd!");
                    }

                    continue;
                }

                socket.emit("create_kladblok_tekst", huidigGeselecteerdeMelding.melding_id, getCurrentTimeShort(), meldkamer.meldkamer_naam, message);

                if (type === 'classificatie') {
                    const afkorting = message.split(' | ')[0];
                    const classificatie = classificaties.find(cls => String(`-${cls.AFKORTING}`) === String(afkorting).toLowerCase() || cls.PARSERTERMEN.includes(afkorting.toLowerCase())) || undefined;
                    if (!classificatie) continue;

                    const inciAfkorting = message.split(' | ')[0];
                    const baseTitle = `${inciAfkorting} | ${String(classificatie.PRESENTATIETEKST).toLowerCase().trim()}`;
                    let newTitle = baseTitle;

                    const oudeMelding = meldingen.find(mld => mld.melding_id === huidigGeselecteerdeMelding.melding_id);
                    if (oudeMelding) {
                        const propMatches = [...oudeMelding.melding_titel.matchAll(/\(.*?\)/g)];
                        if (propMatches.length > 0) newTitle += ` ${propMatches.map(p => p[0]).join(" ")}`;
                    }

                    const promptResponse = prompt("Weet je het zeker dat je de melding classificatie wilt aanpassen naar:", newTitle);
                    if (promptResponse !== null && promptResponse !== "") {
                        const tsChannelName = getTSChannelName(melding, classificatie.PRESENTATIETEKST);

                        // Wijzig teamspeak kanaal naam
                        //socket.emit("meldkamer:update_melding_naam", String(huidigGeselecteerdeMelding.melding_id), tsChannelName, melding.ts_kanaal_id, promptResponse);

                        // Update melding in GMS
                        socket.emit("meldkamer:update_melding", melding.discipline, melding.priorit, melding.melding_locatie, promptResponse, melding.melding_id, melding.ts_kanaal_id, tsChannelName);
                    }

                    if (classificatie.ACTIES?.length > 0) handleActies(classificatie.ACTIES, huidigGeselecteerdeMelding, classificatie);
                }

                if (type === "karakteristiek") {
                    const karakteristiek = karakteristieken.find(kar => {
                        const isInput = kar.WAARDE === null && kar.SOORT_PARSER == "Enkele parser";

                        const woorden = message.split(' ');
                        if (!woorden[0]) return undefined;

                        const zoekWoord = woorden[0];

                        if (isInput) {
                            // Iets anders bedenken..
                            return String(kar.PRIMAIRE_PARSER).toLowerCase() === zoekWoord;
                        } else {
                            return String(kar.PRIMAIRE_PARSER).toLowerCase() === zoekWoord.toLowerCase() || kar.PARSERTERMEN.includes(zoekWoord.toLowerCase());
                        }
                    }) || undefined;
                    if (!karakteristiek) continue;
                    if (karakteristiek.ACTIES?.length > 0) handleActies(karakteristiek.ACTIES, huidigGeselecteerdeMelding, karakteristiek);
                }

                await sleep(250);
            }

            unsendMessages = [];

            refreshAll(false);
            return;
        }

        const classificatie = searchQuery?.startsWith('-') ? classificaties.find(cls => String(`-${cls.AFKORTING}`) === searchQuery.toLowerCase() || cls.PARSERTERMEN.includes(searchQuery.toLowerCase())) : undefined;
        const karakteristiek = searchQuery?.startsWith('-') ? karakteristieken.find(kar => {
            const isInput = kar.WAARDE === null && kar.SOORT_PARSER == "Enkele parser";

            const woorden = normalize(searchQuery).split(' ');
            if (!woorden[0]) return undefined;

            const zoekWoord = woorden[0];

            if (isInput) {
                // Iets anders bedenken..
                return String(kar.PRIMAIRE_PARSER).toLowerCase() === zoekWoord;
            } else {
                return String(kar.PRIMAIRE_PARSER).toLowerCase() === searchQuery.toLowerCase() || kar.PARSERTERMEN.includes(searchQuery.toLowerCase());
            }
        }) : undefined;

        $('#kladblok_sendmsg').val('');

        let messageToSend = null;
        let type = 'bericht';

        if (classificatie) {
            messageToSend = `${searchQuery} | ${[classificatie.MC_1, classificatie.MC_2, classificatie.MC_3].filter(v => v !== '').join('/')}`;
            type = 'classificatie';
        } else if (karakteristiek) {
            let waarde = karakteristiek.WAARDE;

            if (String(karakteristiek.TYPE).toLowerCase() === 'getal') waarde = parseInt(searchQuery.split(' ').pop());
            // if (String(karakteristiek.TYPE).toLowerCase() === 'vrije tekst') waarde = searchQuery.split(' ').filter(v => !v.startsWith('-')).pop() || '';
            if (String(karakteristiek.TYPE).toLowerCase() === 'vrije tekst') waarde = searchQuery.replace(`-${karakteristiek.PARSER_NAAM}`, '').replace(`-${karakteristiek.PARSER_WAARDE}`, '').trim() || '';

            messageToSend = `${searchQuery} | ${karakteristiek.NAAM}: ${waarde}`;
            type = 'karakteristiek';
        } else {
            messageToSend = searchQuery;
        }

        //<i class="bi bi-cloud-upload" style="background-color:red;" title="Nog niet verzonden naar het GMS!"></i>
        // <i class="bi bi-pencil-fill"></i>

        onCreateDraft(null, messageToSend, type);
    });

    // Helper Functies
    function normalize(str) {
        return String(str)
            .toLowerCase()
            .normalize("NFD")                // splits accenten (é -> e +  ́ )
            .replace(/[\u0300-\u036f]/g, "") // verwijder accenten
            .replace(/[^a-z0-9\s]/g, " ")    // vervang leestekens door spatie
            .replace(/\s+/g, " ")            // dubbele spaties → enkel
            .trim();
    }

    function getCurrentTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    function getCurrentTimeShort() {
        return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Amsterdam' });
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function sortByFirstLetter(arr, customIndex = 0) {
        return arr.sort((a, b) => {
            const firstA = a.charAt(customIndex).toLowerCase();
            const firstB = b.charAt(customIndex).toLowerCase();
            if (firstA < firstB) return -1;
            if (firstA > firstB) return 1;
            return 0;
        });
    }

    function getC2000Afko() {
        if (p2000_regio === '17' || p2000_regio === '18') return 'BRT';
        else if (p2000_regio === '15' || p2000_regio === '16') return 'BDH';
        else if (p2000_regio === '13') return 'BAD';
        else if (p2000_regio === '09') return 'BMD';
        else return '???';
    }

    function getTSChannelName(melding, presentatietekst) {
        const inciNummerPart = `#${melding.melding_nummer} | `;
        const inciPostcodePart = ` | [${melding.melding_locatie}]`.toUpperCase();

        const charsTitel = 36 - (inciNummerPart.length + inciPostcodePart.length);
        console.log(charsTitel);
        const inciClassificatiePart = presentatietekst.length <= charsTitel ? presentatietekst : presentatietekst.substring(0, charsTitel - 2) + '..';

        const tsChannelName = [inciNummerPart, inciClassificatiePart, inciPostcodePart].join("");

        return String(tsChannelName).toLowerCase();
    }

    function getClassificatieFromTitel(titel) {
        const match = titel.match(/-(.*?)\s*\|/);
        if (!match) return null;

        const afkorting = String(match[1] ?? "").trim();

        const classificatie = classificaties.find(cls => String(`-${cls.AFKORTING}`) === `-${afkorting.toLowerCase()}` || cls.PARSERTERMEN.includes(`-${afkorting.toLowerCase()}`));
        return classificatie || null;
    }

});

(function () {
    'use strict';

    const css = GM_getResourceText("customCSS");
    GM_addStyle(css);

    //const win98css = GM_getResourceText("windows98");
    //GM_addStyle(win98css);

    GM_xmlhttpRequest({
        method: "GET",
        url: "https://unpkg.com/98.css",
        onload: (res) => {
            const scopedCss = res.responseText.replace(/(^|\})\s*([^{}]+)/g, (match, brace, selector) => {
                if (selector.trim().startsWith("@")) return match; // skip @rules
                return `${brace} .win98 ${selector}`;
            });

            const style = document.createElement("style");
            style.textContent = scopedCss;
            document.head.appendChild(style);
        }
    });

    const toastrCSS = GM_getResourceText("toastr_css");
    GM_addStyle(toastrCSS);

    const bsIconsCSS = GM_getResourceText("bsIcons");
    GM_addStyle(bsIconsCSS);

    console.log("✅ Externe CSS is geladen");
})();