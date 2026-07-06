// ==UserScript==
// @name         Hordes.io edits + Random Mod
// @version      3.3
// @author       Tuna & rndms
// @description  Hordes.io custom client with Random Mod suite integrated
// @match        https://hordes.io/play*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hordes.io
// @grant        unsafeWindow
// @grant        GM_addStyle
// @license      MIT
// @run-at       document-start
// @priority     999
// @updateURL    https://raw.githubusercontent.com/notrndms/random-mod/main/random_mod.user.js
// @downloadURL  https://raw.githubusercontent.com/notrndms/random-mod/main/random_mod.user.js
// ==/UserScript==

let clientUrl = "https://raw.githubusercontent.com/e120391sd/rmp/refs/heads/main/client.js";

document.write('<!DOCTYPE html><html><head></head><body></body></html>');
unsafeWindow._script = "";

(async() => {
    try {
        let html = await fetch("https://hordes.io/play").then(i => i.text());
        let element = html.match(/<script.*?client\.js.*?><\/script>/)[0];
        let url = element.match(/src="(.*?)"/)[1];
        let client = await fetch(clientUrl).then(i => i.text());

        unsafeWindow._script = client;

        // Dynamic injection of both the custom client and the Random Mod logic
        html = html.replace(element, `<script>eval(_script)</script><script>(${runRandomMod.toString()})();</script>`);

        document.open();
        document.write(html);
        document.close();

        unsafeWindow.document.dispatchEvent(new Event("DOMContentLoaded", {
          bubbles: true,
          cancelable: false
        }));
    } catch (e) {
        console.error(e);
    }
})();

// =========================================================================
// RANDOM MOD SUITE ENGINE
// =========================================================================
function runRandomMod() {
    'use strict';

    // ==========================================
    // 0. STATE MANAGEMENT & DATA STORAGE
    // ==========================================

    const SETTINGS_KEY = 'rndms_mod_settings_v9';
    var settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {
        fullscreen: true,
        blackBorders: true,
        ccIndicator: true,
        classColors: true,
        yellChat: true,
        killMsgFormat: true,
        ownBuffsOnly: false
    };

    if (settings.killMsgFormat === undefined) settings.killMsgFormat = true;
    if (settings.ownBuffsOnly === undefined) settings.ownBuffsOnly = false;

    // Cooldown Timer Data
    var timerData = JSON.parse(localStorage.getItem('h_timers_v65')) || [
        { id: 101, key: 'c', dur: 45, color: '#ffffff', x: 100, y: 150, size: 22, enabled: true }
    ];
    var
