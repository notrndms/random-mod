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
// @downloadURL  https://raw.githubusercontent.com/notrndm/random-mod/main/random_mod.user.js
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
    var timerConfig = JSON.parse(localStorage.getItem('h_cfg_v65')) || { isLocked: false };

    var intervals = {};
    var syncNativeBuffsState = false;

    function saveSettings() {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    function saveTimerData() {
        localStorage.setItem('h_timers_v65', JSON.stringify(timerData));
        localStorage.setItem('h_cfg_v65', JSON.stringify(timerConfig));
    }

    // ==========================================
    // 1. ALLOCATE MASTER HUD STYLE SHEETS
    // ==========================================
    var uiStyle = document.createElement('style');
    var borderStyleRule = document.createElement('style');
    var ccStyleRule = document.createElement('style');
    var classColorsStyleRule = document.createElement('style');
    var yellChatStyleRule = document.createElement('style');

    // Central layout style sheet
    var s = '#mod-menu-container { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 360px; background-color: #000000 !important; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); border: 2px solid #ffffff !important; border-radius: 6px; box-shadow: 0px 0px 15px rgba(255, 255, 255, 0.2); color: #ffffff !important; font-family: "Montserrat", sans-serif, Arial; z-index: 999999; padding: 15px; display: none; user-select: none; } ';
    s += '.mod-menu-title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ffffff; padding-bottom: 5px; } ';
    s += '.mod-section-header { font-size: 11px; font-weight: bold; color: #ffffff; text-transform: uppercase; margin: 12px 0 8px 0; border-bottom: 1px dashed #4b5563; padding-bottom: 2px; letter-spacing: 0.5px; } ';
    s += '.mod-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; } ';
    s += '.mod-label { font-size: 12px; } ';
    s += '.mod-btn { background-color: rgba(17, 24, 39, 0.7); border: 1px solid #ffffff; color: #ffffff; padding: 4px 8px; font-size: 11px; font-weight: bold; border-radius: 4px; cursor: pointer; width: 90px; text-align: center; transition: all 0.2s ease; } ';
    s += '.mod-btn.enabled { background-color: #ffffff !important; color: #000000 !important; box-shadow: 0 0 8px rgba(255, 255, 255, 0.6); } ';
    s += '.mod-btn:hover { opacity: 0.9; transform: scale(1.03); } ';
    s += '.mod-footer { font-size: 9px; color: #6b7280; text-align: center; margin-top: 12px; } ';
    s += '.h-timer-box { position: fixed; background: #000000 !important; backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); border: 1px solid #ffffff; padding: 6px 10px; color: #ffffff; font-family: monospace; font-weight: bold; z-index: 999998 !important; user-select: none; border-radius: 6px; text-align: center; min-width: 75px; text-shadow: 1px 1px #000; box-shadow: 0 0 6px rgba(255, 255, 255, 0.2); } ';
    s += '.unlocked { cursor: move !important; } .locked { cursor: default !important; } ';
    s += '.timer-config-block { background: rgba(17, 24, 39, 0.5); border: 1px solid #374151; border-radius: 6px; padding: 10px; margin-bottom: 8px; } ';
    s += '.timer-ctrl-row { display: flex; gap: 8px; align-items: center; font-size: 12px; justify-content: space-between; margin-bottom: 8px; } ';
    s += '.timer-mini-input { background: #000000 !important; color: #ffffff !important; border: 1px solid #ffffff !important; padding: 4px 6px !important; border-radius: 4px; text-align: center; font-family: monospace; font-size: 14px !important; width: 42px !important; font-weight: bold; } ';
    s += '.timer-mini-input:focus { border-color: #ffffff !important; outline: none; } ';
    s += '.timer-input-container { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; font-size: 12px; } ';
    s += '.timer-input-label { color: #d1d5db; font-weight: bold; } ';
    s += '.timer-large-box { background: #000000 !important; color: #ffffff !important; border: 1px solid #ffffff !important; padding: 4px 8px !important; border-radius: 4px; text-align: center; font-family: monospace; font-size: 14px !important; width: 65px !important; font-weight: bold; } ';
    s += '.timer-large-box:focus { border-color: #ffffff !important; outline: none; } ';
    s += '.timer-toggle-btn { background: rgba(31, 41, 55, 0.6); color: #ef4444; border: 1px solid #ef4444; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; transition: all 0.15s ease; width: 50px; text-align: center; } ';
    s += '.timer-toggle-btn.active { background: #ffffff; color: #000000; border-color: #ffffff; box-shadow: 0 0 6px rgba(255, 255, 255, 0.4); } ';
    s += '.timer-del-btn { background: #ef4444; color: #ffffff; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; } ';
    s += '.timer-add-btn { background-color: rgba(17, 24, 39, 0.6); border: 1px solid #ffffff; color: #ffffff; padding: 6px; font-size: 11px; font-weight: bold; border-radius: 4px; cursor: pointer; width: 100%; text-align: center; margin-top: 4px; } ';
    s += '.timer-add-btn:hover { background-color: #ffffff; color: #000000; } ';

    uiStyle.textContent = s;
    document.head.appendChild(uiStyle);

    // Black borders style sheet
    var bStr = '#skillbar { background-color: black !important; background: black !important; border-color: black !important; } ';
    bStr += '.border.slot.white, .border.slot.purp, .border.slot.grey, .border.slot.blue, .border.slot.green { border-color: black !important; box-shadow: none !important; }';
    borderStyleRule.textContent = bStr;
    document.head.appendChild(borderStyleRule);

    // Crowd control indicators style sheet
    var ccStr = '.bars.svelte-g292qg:has([src*="/14."]), .bars.svelte-g292qg:has([src*="/34."]) { box-shadow: 0px 0px 0px 3px #FFFF00; } ';
    ccStr += '.bars.svelte-g292qg:has([src*="/49."]), .bars.svelte-g292qg:has([src*="/50."]) { box-shadow: 0px 0px 0px 3px #FFA500; } ';
    ccStr += '.bars.svelte-g292qg:has([src*="deepFrozen"]), .bars.svelte-g292qg:has([src*="stunBuff"]), .bars.svelte-g292qg:has([src*="/37."]) { box-shadow: 0px 0px 0px 3px #FF0000; }';
    ccStyleRule.textContent = ccStr;
    document.head.appendChild(ccStyleRule);

    // Class colors health bar style sheet
    var clStr = '.grid.svelte-g292qg:has(.bgc0) .bghealth { background: linear-gradient(0deg,#C7966F 0%,#A37B5B 49%,#C7966F 50%) } ';
    clStr += '.grid.svelte-g292qg:has(.bgc1) .bghealth { background: linear-gradient(0deg,#21A9E1 0%,#1B8AB8 49%,#21A9E1 50%) } ';
    clStr += '.grid.svelte-g292qg:has(.bgc2) .bghealth { background: linear-gradient(0deg,#98CE64 0%,#6F964D 49%,#98CE64 50%) } ';
    clStr += '.grid.svelte-g292qg:has(.bgc3) .bghealth { background: linear-gradient(0deg,#1C51FF 0%,#1742D1 49%,#1C51FF 50%) } ';
    clStr += '.grid.svelte-g292qg:has(.bgc4) .bghealth { background: linear-gradient(0deg,#A35AC2 0%,#874AA0 49%,#A35AC2 50%) }';
    classColorsStyleRule.textContent = clStr;
    document.head.appendChild(classColorsStyleRule);

    yellChatStyleRule.textContent = '.textyell { color: #FFCB9D; } .btn.textyell { color: #FFCB9D; }';
    document.head.appendChild(yellChatStyleRule);

    // ==========================================
    // 2. CREATE PANEL HTML LAYOUT
    // ==========================================
    var menu = document.createElement('div');
    menu.id = 'mod-menu-container';

    var h = '<div class="mod-menu-title">Random Mods</div>';
    h += '<div class="mod-section-header">General Utilities</div>';
    h += '<div class="mod-row"><span class="mod-label">Auto Fullscreen</span><button id="btn-fullscreen" class="mod-btn">DISABLED</button></div>';
    h += '<div class="mod-row"><span class="mod-label">Black Borders</span><button id="btn-borders" class="mod-btn">DISABLED</button></div>';

    h += '<div class="mod-section-header">Interface & Combat HUD</div>';
    h += '<div class="mod-row"><span class="mod-label">CC Indicator</span><button id="btn-cc" class="mod-btn">DISABLED</button></div>';
    h += '<div class="mod-row"><span class="mod-label">Class Colors</span><button id="btn-classcolors" class="mod-btn">DISABLED</button></div>';
    h += '<div class="mod-row"><span class="mod-label">Yell Chat</span><button id="btn-yell" class="mod-btn">DISABLED</button></div>';
    h += '<div class="mod-row"><span class="mod-label">Kill Msg Format</span><button id="btn-killmsg" class="mod-btn">DISABLED</button></div>';
    h += '<div class="mod-row"><span class="mod-label">Own Buffs Only</span><button id="btn-ownbuffs" class="mod-btn">DISABLED</button></div>';

    h += '<div class="mod-section-header">Skill Cooldown Timers</div>';
    h += '<div class="mod-row"><span class="mod-label">Lock Positions</span><button id="btn-lock-timers" class="mod-btn">DISABLED</button></div>';
    h += id="timers-config-list" style="margin-top: 6px; padding-right: 2px;"></div>';
    h += '<button id="btn-add-timer" class="timer-add-btn">+ Add New Timer</button>';
    h += '<div class="mod-footer">Press SHIFT + N to hide menu</div>';

    menu.innerHTML = h;
    document.body.appendChild(menu);

    var timerLayer = document.createElement('div');
    document.body.appendChild(timerLayer);

    // ==========================================
    // 3. UI RENDERING & LINKING ENGINE
    // ==========================================
    function refreshAllButtons() {
        updateButtonDOM('btn-fullscreen', settings.fullscreen);
        updateButtonDOM('btn-borders', settings.blackBorders);
        updateButtonDOM('btn-cc', settings.ccIndicator);
        updateButtonDOM('btn-classcolors', settings.classColors);
        updateButtonDOM('btn-yell', settings.yellChat);
        updateButtonDOM('btn-killmsg', settings.killMsgFormat);
        updateButtonDOM('btn-ownbuffs', settings.ownBuffsOnly);
        updateButtonDOM('btn-lock-timers', timerConfig.isLocked);

        borderStyleRule.disabled = !settings.blackBorders;
        ccStyleRule.disabled = !settings.ccIndicator;
        classColorsStyleRule.disabled = !settings.classColors;
        yellChatStyleRule.disabled = !settings.yellChat;

        renderTimerSettingsRows();
    }

    function updateButtonDOM(id, enabled) {
        var btn = document.getElementById(id);
        if (!btn) return;
        if (enabled) {
            btn.textContent = 'ENABLED';
            btn.classList.add('enabled');
        } else {
            btn.textContent = 'DISABLED';
            btn.classList.remove('enabled');
        }
    }

    function checkAndSyncBuffs() {
        const nativeState = localStorage.getItem("buffsHideIrrelevant") === "true";
        if (nativeState !== settings.ownBuffsOnly) {
            syncNativeBuffsState = true;
            const settingsPanel = [...document.querySelectorAll(".window-pos")].find(el => {
                const title = el.querySelector(".title");
                return title && title.textContent.toLowerCase().startsWith("settings");
            });

            if (settingsPanel) {
                executeNativeBuffClick(settingsPanel);
            } else {
                const cog = document.querySelector("#syscog");
                if (cog) cog.click();
            }
        }
    }

    function executeNativeBuffClick(settingsPanel) {
        try {
            const container = settingsPanel.children[0].children[1].children[0];
            container.children[0].children[0].click();
            container.children[1].children[1].children[61].click();
            const cog = document.querySelector("#syscog");
            if (cog) cog.click();
        } catch (err) {
            console.error("Buff Toggler Error: Game UI structure changed.", err);
        }
        syncNativeBuffsState = false;
    }

    function renderTimerSettingsRows() {
        var container = document.getElementById('timers-config-list');
        if (!container) return;
        container.innerHTML = '';

        timerData.forEach(function(t, i) {
            if (t.enabled === undefined) t.enabled = true;

            var block = document.createElement('div');
            block.className = 'timer-config-block';

            var ctrlRow = document.createElement('div');
            ctrlRow.className = 'timer-ctrl-row';

            var keySpan = document.createElement('span');
            keySpan.style.fontWeight = 'bold';
            keySpan.textContent = 'Key: ';
            var keyInput = document.createElement('input');
            keyInput.type = 'text';
            keyInput.className = 'timer-mini-input';
            keyInput.value = t.key;
            keyInput.maxLength = 2;
            keyInput.onchange = function(e) { timerData[i].key = e.target.value.toLowerCase(); saveTimerData(); drawTimersHUD(); };
            keySpan.appendChild(keyInput);
            ctrlRow.appendChild(keySpan);

            var toggleBtn = document.createElement('button');
            toggleBtn.className = 'timer-toggle-btn' + (t.enabled ? ' active' : '');
            toggleBtn.textContent = t.enabled ? 'ON' : 'OFF';
            toggleBtn.onclick = function() {
                timerData[i].enabled = !timerData[i].enabled;
                if (!timerData[i].enabled && intervals[t.id]) {
                    clearInterval(intervals[t.id].pid);
                    delete intervals[t.id];
                }
                saveTimerData(); drawTimersHUD(); renderTimerSettingsRows();
            };
            ctrlRow.appendChild(toggleBtn);

            var colorSpan = document.createElement('span');
            colorSpan.style.fontWeight = 'bold';
            colorSpan.textContent = 'Color: ';
            var colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.style.width = '24px';
            colorInput.style.height = '20px';
            colorInput.style.border = 'none';
            colorInput.style.background = 'none';
            colorInput.style.cursor = 'pointer';
            colorInput.style.verticalAlign = 'middle';
            colorInput.value = t.color;
            colorInput.onchange = function(e) { timerData[i].color = e.target.value; saveTimerData(); drawTimersHUD(); };
            colorSpan.appendChild(colorInput);
            ctrlRow.appendChild(colorSpan);

            var delBtn = document.createElement('button');
            delBtn.className = 'timer-del-btn';
            delBtn.textContent = 'X';
            delBtn.onclick = function() {
                if (intervals[t.id]) { clearInterval(intervals[t.id].pid); delete intervals[t.id]; }
                timerData.splice(i, 1); saveTimerData(); drawTimersHUD(); renderTimerSettingsRows();
            };
            ctrlRow.appendChild(delBtn);
            block.appendChild(ctrlRow);

            var durContainer = document.createElement('div');
            durContainer.className = 'timer-input-container';
            var durLabel = document.createElement('span');
            durLabel.className = 'timer-input-label';
            durLabel.textContent = 'Cooldown (Seconds):';
            var durInput = document.createElement('input');
            durInput.type = 'number';
            durInput.className = 'timer-large-box';
            durInput.min = '1';
            durInput.max = '999';
            durInput.value = t.dur;
            durInput.oninput = function(e) {
                var currentVal = parseInt(e.target.value, 10);
                if (isNaN(currentVal) || currentVal < 1) currentVal = 1;
                timerData[i].dur = currentVal;
                drawTimersHUD();
            };
            durInput.onchange = function() { saveTimerData(); };
            durContainer.appendChild(durLabel);
            durContainer.appendChild(durInput);
            block.appendChild(durContainer);

            var sizeContainer = document.createElement('div');
            sizeContainer.className = 'timer-input-container';
            var sizeLabel = document.createElement('span');
            sizeLabel.className = 'timer-input-label';
            sizeLabel.textContent = 'Display Size (Pixels):';
            var sizeInput = document.createElement('input');
            sizeInput.type = 'number';
            sizeInput.className = 'timer-large-box';
            sizeInput.min = '8';
            sizeInput.max = '100';
            sizeInput.value = t.size;
            sizeInput.oninput = function(e) {
                var currentVal = parseInt(e.target.value, 10);
                if (isNaN(currentVal) || currentVal < 8) currentVal = 8;
                timerData[i].size = currentVal;
                drawTimersHUD();
            };
            sizeInput.onchange = function() { saveTimerData(); };
            sizeContainer.appendChild(sizeLabel);
            sizeContainer.appendChild(sizeInput);
            block.appendChild(sizeContainer);

            container.appendChild(block);
        });
    }

    // Toggle menu visibility with Shift + N
    window.addEventListener('keydown', function(e) {
        if (['INPUT', 'TEXTAREA'].indexOf(document.activeElement.tagName) !== -1) return;
        var inputsPressed = e.key.toLowerCase();
        if (e.shiftKey && inputsPressed === 'n') {
            var currentDisplay = menu.style.display;
            menu.style.display = currentDisplay === 'block' ? 'none' : 'block';
            refreshAllButtons();
        }
    });

    // Control Utility Listeners
    document.getElementById('btn-fullscreen').addEventListener('click', function() {
        settings.fullscreen = !settings.fullscreen; saveSettings(); refreshAllButtons();
    });
    document.getElementById('btn-borders').addEventListener('click', function() {
        settings.blackBorders = !settings.blackBorders; saveSettings(); refreshAllButtons();
    });
    document.getElementById('btn-cc').addEventListener('click', function() {
        settings.ccIndicator = !settings.ccIndicator; saveSettings(); refreshAllButtons();
    });
    document.getElementById('btn-classcolors').addEventListener('click', function() {
        settings.classColors = !settings.classColors; saveSettings(); refreshAllButtons();
    });
    document.getElementById('btn-yell').addEventListener('click', function() {
        settings.yellChat = !settings.yellChat; saveSettings(); refreshAllButtons();
    });
    document.getElementById('btn-killmsg').addEventListener('click', function() {
        settings.killMsgFormat = !settings.killMsgFormat; saveSettings(); refreshAllButtons();
    });
    document.getElementById('btn-ownbuffs').addEventListener('click', function() {
        settings.ownBuffsOnly = !settings.ownBuffsOnly; saveSettings(); refreshAllButtons(); checkAndSyncBuffs();
    });

    document.getElementById('btn-lock-timers').addEventListener('click', function() {
        timerConfig.isLocked = !timerConfig.isLocked; saveTimerData(); refreshAllButtons(); drawTimersHUD();
    });
    document.getElementById('btn-add-timer').addEventListener('click', function() {
        timerData.push({ id: Date.now(), key: 'f', dur: 10, color: '#ffffff', x: 250, y: 250, size: 22, enabled: true });
        saveTimerData(); drawTimersHUD(); renderTimerSettingsRows();
    });

    // ==========================================
    // 4. FLOATING HUD TIMER ENGINE
    // ==========================================
    function drawTimersHUD() {
        timerLayer.innerHTML = '';
        timerData.forEach(function(t) {
            if (t.enabled === undefined) t.enabled = true;
            if (!t.enabled) return;

            var el = document.createElement('div');
            el.className = 'h-timer-box ' + (timerConfig.isLocked ? 'locked' : 'unlocked');
            el.id = 'timer-' + t.id;
            el.style.left = t.x + 'px';
            el.style.top = t.y + 'px';
            el.style.fontSize = t.size + 'px';
            el.style.color = t.color;
            el.style.borderColor = t.color;

            if (intervals[t.id]) {
                el.style.color = '#ff4444';
                el.style.borderColor = '#ff4444';
                el.innerText = t.key.toUpperCase() + ': ' + intervals[t.id].timeLeft + 's';
            } else {
                el.innerText = t.key.toUpperCase() + ': READY';
            }

            el.onmousedown = function(e) {
                if (timerConfig.isLocked) return;
                var sX = e.clientX - el.offsetLeft;
                var sY = e.clientY - el.offsetTop;
                var move = function(m) {
                    t.x = m.clientX - sX;
                    t.y = m.clientY - sY;
                    el.style.left = t.x + 'px';
                    el.style.top = t.y + 'px';
                };
                var stop = function() {
                    document.removeEventListener('mousemove', move);
                    document.removeEventListener('mouseup', stop);
                    saveTimerData();
                };
                document.addEventListener('mousemove', move);
                document.addEventListener('mouseup', stop);
            };
            timerLayer.appendChild(el);
        });
    }

    function executeTimerCountdown(t) {
        var el = document.getElementById('timer-' + t.id);
        if (!el) return;

        if (intervals[t.id]) {
            clearInterval(intervals[t.id].pid);
        }

        var left = t.dur;
        var originalColor = t.color;
        el.style.color = '#ff4444';
        el.style.borderColor = '#ff4444';
        el.innerText = t.key.toUpperCase() + ': ' + left + 's';

        var pid = setInterval(function() {
            left--;
            if (left <= 0) {
                clearInterval(intervals[t.id].pid);
                delete intervals[t.id];
                if (document.getElementById('timer-' + t.id)) {
                    el.style.color = originalColor;
                    el.style.borderColor = originalColor;
                    el.innerText = t.key.toUpperCase() + ': READY';
                }
            } else {
                intervals[t.id].timeLeft = left;
                if (document.getElementById('timer-' + t.id)) {
                    el.innerText = t.key.toUpperCase() + ': ' + left + 's';
                }
            }
        }, 1000);

        intervals[t.id] = { pid: pid, timeLeft: left };
    }

    window.addEventListener('keydown', function(e) {
        if (['INPUT', 'TEXTAREA'].indexOf(document.activeElement.tagName) !== -1) return;
        var inputsPressed = e.key.toLowerCase();
        timerData.forEach(function(t) {
            if (t.enabled && inputsPressed === t.key.toLowerCase()) {
                executeTimerCountdown(t);
            }
        });
    }, true);

    // ==========================================
    // 5. PVP KILL LOG FORMAT FEATURE
    // ==========================================
    function applyKillMessageFormat() {
        if (!settings.killMsgFormat) return;

        let cb = document.getElementById('chat') || document.querySelector('.chat, [class*="chat-container"]');
        if (!cb) return;

        let walker = document.createTreeWalker(cb, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            if (node.nodeValue.includes(' killed ')) {
                node.nodeValue = node.nodeValue.replace(/ killed /g, ' > ');
            }
        }
    }

    // ==========================================
    // 6. CORE SYSTEM UTILITIES BLOCKS
    // ==========================================
    function isFullscreen() {
        return document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    }
    function openFullscreen(elem) {
        if (elem.requestFullscreen) elem.requestFullscreen();
        else if (elem.mozRequestFullScreen) elem.mozRequestFullScreen();
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        else if (elem.msVisualFullscreen) elem.msVisualFullscreen();
    }
    window.addEventListener('click', function() {
        if (settings.fullscreen && !isFullscreen()) {
            openFullscreen(document.documentElement);
        }
    });

    var colorsToRemove = ['white', 'purp', 'grey', 'blue', 'green'];
    var targetColor = 'black';

    function applyBlackout() {
        if (!settings.blackBorders) return;
        var slots = document.querySelectorAll('.border.slot');
        slots.forEach(function(slot) {
            var changed = false;
            colorsToRemove.forEach(function(color) {
                if (slot.classList.contains(color)) {
                    slot.classList.remove(color);
                    changed = true;
                }
            });
            if (changed && !slot.classList.contains(targetColor)) {
                slot.classList.add(targetColor);
            }
        });
    }

    // ==========================================
    // 7. MUTATION OBSERVER ENGINE
    // ==========================================
    var globalObserver = new MutationObserver(function() {
        applyBlackout();
        applyKillMessageFormat();

        if (syncNativeBuffsState) {
            const settingsPanel = [...document.querySelectorAll(".window-pos")].find(el => {
                const title = el.querySelector(".title");
                return title && title.textContent.toLowerCase().startsWith("settings");
            });
            if (settingsPanel) {
                executeNativeBuffClick(settingsPanel);
            }
        }
    });

    globalObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });

    setTimeout(checkAndSyncBuffs, 500);

    refreshAllButtons();
    applyBlackout();
    applyKillMessageFormat();
    drawTimersHUD();
}
