(function () {
    "use strict";

    const TOTAL_ROUNDS = 4;

    const screens = {
        telegramOnly: document.getElementById("screen-telegram-only"),
        cards: document.getElementById("screen-cards"),
        pickScore: document.getElementById("screen-pick-score"),
        leaderboard: document.getElementById("screen-leaderboard"),
    };

    const els = {
        cardStack: document.getElementById("card-stack"),
        cardFront: document.getElementById("card-front"),
        cardGame: document.getElementById("card-game"),
        cardResult: document.getElementById("card-result"),
        cardBack1: document.querySelector(".card-back-1"),
        cardBack2: document.querySelector(".card-back-2"),
        cardBack3: document.querySelector(".card-back-3"),
        roundBadge: document.getElementById("round-badge"),
        totalScoreLabel: document.getElementById("total-score-label"),
        targetColor: document.getElementById("target-color"),
        canvas: document.getElementById("color-wheel"),
        pickerCursor: document.getElementById("picker-cursor"),
        btnConfirm: document.getElementById("btn-confirm"),
        resultTarget: document.getElementById("result-target"),
        resultPicked: document.getElementById("result-picked"),
        resultAccuracy: document.getElementById("result-accuracy"),
        resultPercentile: document.getElementById("result-percentile"),
        btnNext: document.getElementById("btn-next"),
        scoreList: document.getElementById("score-list"),
        btnPickSave: document.getElementById("btn-pick-save"),
        leaderboardBody: document.getElementById("leaderboard-body"),
        btnRestart: document.getElementById("btn-restart"),
    };

    let state = {
        round: 0,
        totalScore: 0,
        targetHue: 0,
        targetSat: 0,
        pickedHue: null,
        pickedSat: null,
        savedNickname: "",
        selectedScoreId: null,
        roundScores: [],
    };

    function showScreen(name) {
        Object.values(screens).forEach((s) => s.classList.remove("active"));
        screens[name].classList.add("active");
    }

    function showCardContent(which) {
        els.cardGame.style.display = which === "game" ? "flex" : "none";
        els.cardResult.style.display = which === "result" ? "flex" : "none";
    }

    function updateBackCards() {
        const remaining = TOTAL_ROUNDS - state.round;
        els.cardBack1.classList.toggle("hide", remaining < 1);
        els.cardBack2.classList.toggle("hide", remaining < 2);
        els.cardBack3.classList.toggle("hide", remaining < 3);
    }

    // --- Color wheel rendering ---

    function getWheelSize() {
        const container = els.canvas.parentElement;
        const size = Math.min(container.clientWidth, container.clientHeight);
        return size;
    }

    function drawColorWheel() {
        const cssSize = getWheelSize();
        if (cssSize <= 0) return;
        const dpr = window.devicePixelRatio || 1;
        const size = Math.floor(cssSize * dpr);
        const r = Math.floor(size / 2);

        els.canvas.width = r * 2;
        els.canvas.height = r * 2;

        const ctx = els.canvas.getContext("2d");
        const imageData = ctx.createImageData(r * 2, r * 2);

        for (let y = 0; y < r * 2; y++) {
            for (let x = 0; x < r * 2; x++) {
                const dx = x - r;
                const dy = y - r;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > r) continue;

                const angle = Math.atan2(dy, dx);
                const hue = ((angle * 180) / Math.PI + 360) % 360;
                const sat = (dist / r) * 100;

                const [cr, cg, cb] = hslToRgb(hue, sat, 50);
                const idx = (y * r * 2 + x) * 4;
                imageData.data[idx] = cr;
                imageData.data[idx + 1] = cg;
                imageData.data[idx + 2] = cb;
                imageData.data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    function hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let r, g, b;
        if (h < 60) [r, g, b] = [c, x, 0];
        else if (h < 120) [r, g, b] = [x, c, 0];
        else if (h < 180) [r, g, b] = [0, c, x];
        else if (h < 240) [r, g, b] = [0, x, c];
        else if (h < 300) [r, g, b] = [x, 0, c];
        else [r, g, b] = [c, 0, x];
        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255),
        ];
    }

    function hslString(h, s) {
        return `hsl(${h}, ${s}%, 50%)`;
    }

    function generateTarget() {
        state.targetHue = Math.floor(Math.random() * 360);
        state.targetSat = 30 + Math.floor(Math.random() * 70);
    }

    function calcAccuracy(targetH, targetS, pickedH, pickedS) {
        let hueDiff = Math.abs(targetH - pickedH);
        if (hueDiff > 180) hueDiff = 360 - hueDiff;
        const satDiff = Math.abs(targetS - pickedS);
        const hueScore = Math.max(0, 100 - (hueDiff / 180) * 100);
        const satScore = Math.max(0, 100 - satDiff);
        return Math.round(hueScore * 0.7 + satScore * 0.3);
    }

    // --- Pointer handling ---

    function getWheelPosition(e) {
        const rect = els.canvas.getBoundingClientRect();
        const scaleX = els.canvas.width / rect.width;
        const scaleY = els.canvas.height / rect.height;
        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    }

    function handleWheelInput(e) {
        e.preventDefault();
        const { x, y } = getWheelPosition(e);
        const r = els.canvas.width / 2;
        const dx = x - r;
        const dy = y - r;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > r) return;

        state.pickedHue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
        state.pickedSat = (dist / r) * 100;

        const rect = els.canvas.getBoundingClientRect();
        els.pickerCursor.style.left = x / (els.canvas.width / rect.width) + "px";
        els.pickerCursor.style.top = y / (els.canvas.height / rect.height) + "px";
        els.pickerCursor.style.background = hslString(state.pickedHue, state.pickedSat);
        els.pickerCursor.classList.remove("hidden");
        els.btnConfirm.disabled = false;
    }

    els.canvas.addEventListener("pointerdown", handleWheelInput);
    els.canvas.addEventListener("pointermove", (e) => {
        if (e.buttons > 0) handleWheelInput(e);
    });

    // --- Game flow ---

    function startGame() {
        state.round = 0;
        state.totalScore = 0;
        state.roundScores = [];
        els.cardBack1.classList.remove("hide");
        els.cardBack2.classList.remove("hide");
        els.cardBack3.classList.remove("hide");
        nextRound();
    }

    function nextRound() {
        state.round++;
        state.pickedHue = null;
        state.pickedSat = null;
        els.pickerCursor.classList.add("hidden");
        els.btnConfirm.disabled = true;

        generateTarget();
        els.targetColor.style.background = hslString(state.targetHue, state.targetSat);
        els.roundBadge.textContent = `${state.round} / ${TOTAL_ROUNDS}`;
        els.totalScoreLabel.textContent = state.totalScore;

        updateBackCards();
        showCardContent("game");
        els.btnConfirm.style.display = "";
        els.btnNext.style.display = "none";

        els.cardFront.classList.remove("fly-away");
        els.cardFront.style.transform = "";
        els.cardFront.style.opacity = "";

        showScreen("cards");
        requestAnimationFrame(() => drawColorWheel());
    }

    async function confirmPick() {
        const accuracy = calcAccuracy(
            state.targetHue, state.targetSat,
            state.pickedHue, state.pickedSat
        );
        state.totalScore += accuracy;
        state.roundScores.push(accuracy);

        els.resultTarget.style.background = hslString(state.targetHue, state.targetSat);
        els.resultPicked.style.background = hslString(state.pickedHue, state.pickedSat);
        els.resultAccuracy.textContent = `${accuracy} / 100`;
        els.resultPercentile.textContent = "";
        els.totalScoreLabel.textContent = state.totalScore;

        els.btnNext.textContent = state.round >= TOTAL_ROUNDS ? "Результат" : "Далее";
        els.btnConfirm.style.display = "none";
        els.btnNext.style.display = "";

        showCardContent("result");

        try {
            const res = await fetch(`/api/percentile/${accuracy}`);
            const data = await res.json();
            els.resultPercentile.textContent = `Лучше чем ${data.percentile}% игроков`;
        } catch (err) {
            console.error("Failed to load percentile:", err);
        }
    }

    function afterResult() {
        els.cardFront.classList.remove("fade-in");
        void els.cardFront.offsetWidth;
        els.cardFront.classList.add("fly-away");

        els.cardFront.addEventListener("transitionend", function onEnd(e) {
            if (e.target !== els.cardFront) return;
            els.cardFront.removeEventListener("transitionend", onEnd);

            if (state.round >= TOTAL_ROUNDS) {
                screens.cards.classList.remove("active");
                finishGame();
            } else {
                els.cardFront.classList.remove("fly-away");
                nextRound();
            }
        });
    }

    // --- Post-game ---

    function getNickname() {
        const tg = window.Telegram && window.Telegram.WebApp;
        if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
            const user = tg.initDataUnsafe.user;
            return user.username || user.first_name || "Player";
        }
        return "Player";
    }

    async function finishGame() {
        const nickname = getNickname();
        state.savedNickname = nickname;

        try {
            const existing = await fetch(`/api/scores/${encodeURIComponent(nickname)}`);
            const existingData = await existing.json();

            const saveRes = await fetch("/api/score", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nickname,
                    score: state.totalScore,
                    is_active: !existingData.scores.length,
                }),
            });
            const saveData = await saveRes.json();

            if (existingData.scores.length > 0) {
                showPickScoreScreen(existingData.scores, saveData.id);
                return;
            }
        } catch (err) {
            console.error("Failed to save score:", err);
        }
        showLeaderboard();
    }

    function showPickScoreScreen(existingScores, newId) {
        els.scoreList.innerHTML = "";
        state.selectedScoreId = null;
        els.btnPickSave.disabled = true;

        const allScores = [
            { id: newId, score: state.totalScore, label: "Новый результат", isNew: true },
            ...existingScores.map((e) => ({
                id: e.id,
                score: e.score,
                label: e.is_active ? "Текущий в рейтинге" : "Прошлый результат",
                isNew: false,
            })),
        ];

        allScores.sort((a, b) => b.score - a.score);

        let bestId = allScores[0].id;
        allScores.forEach((entry) => {
            const option = createScoreOption(entry.id, entry.score, entry.label, entry.isNew);
            if (entry.id === bestId) selectScoreOption(option, entry.id);
            els.scoreList.appendChild(option);
        });

        showScreen("pickScore");
    }

    function createScoreOption(id, score, label, isNew) {
        const div = document.createElement("div");
        div.className = "score-option" + (isNew ? " is-new" : "");
        div.dataset.scoreId = id;
        div.innerHTML = `<div>
            <div class="score-label">${escapeHtml(label)}</div>
            <div class="score-value">${score} / ${TOTAL_ROUNDS * 100}</div>
        </div>`;
        div.addEventListener("click", () => selectScoreOption(div, id));
        return div;
    }

    function selectScoreOption(element, scoreId) {
        els.scoreList.querySelectorAll(".score-option").forEach((el) => el.classList.remove("selected"));
        element.classList.add("selected");
        state.selectedScoreId = scoreId;
        els.btnPickSave.disabled = false;
    }

    async function confirmPickedScore() {
        if (state.selectedScoreId === null) return;
        els.btnPickSave.disabled = true;
        els.btnPickSave.textContent = "Сохранение...";
        try {
            await fetch("/api/score/activate", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname: state.savedNickname, score_id: state.selectedScoreId }),
            });
            const selectedEl = els.scoreList.querySelector(`.score-option[data-score-id="${state.selectedScoreId}"]`);
            if (selectedEl) state.totalScore = parseInt(selectedEl.querySelector(".score-value").textContent, 10);
        } catch (err) {
            console.error("Failed to activate score:", err);
        }
        els.btnPickSave.textContent = "Сохранить";
        els.btnPickSave.disabled = false;
        showLeaderboard();
    }

    async function showLeaderboard() {
        try {
            const res = await fetch("/api/leaderboard");
            const data = await res.json();
            renderLeaderboard(data.entries);
        } catch (err) {
            console.error("Failed to load leaderboard:", err);
        }
        showScreen("leaderboard");
    }

    function renderLeaderboard(entries) {
        const tbody = els.leaderboardBody;
        tbody.innerHTML = "";
        entries.forEach((entry) => {
            const tr = document.createElement("tr");
            if (entry.nickname === state.savedNickname && entry.score === state.totalScore) {
                tr.classList.add("highlight");
            }
            tr.innerHTML = `<td>${entry.rank}</td><td>${escapeHtml(entry.nickname)}</td><td>${entry.score}</td>`;
            tbody.appendChild(tr);
        });
    }

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Event listeners ---

    els.btnConfirm.addEventListener("click", confirmPick);
    els.btnNext.addEventListener("click", afterResult);
    els.btnPickSave.addEventListener("click", confirmPickedScore);
    els.btnRestart.addEventListener("click", startGame);

    document.addEventListener("touchmove", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        let node = e.target;
        while (node && node !== document.body) {
            const style = window.getComputedStyle(node);
            if ((style.overflowY === "auto" || style.overflowY === "scroll") && node.scrollHeight > node.clientHeight) return;
            node = node.parentElement;
        }
        e.preventDefault();
    }, { passive: false });

    document.addEventListener("contextmenu", (e) => e.preventDefault());

    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg) {
        tg.ready();
        tg.expand();
        tg.requestFullscreen && tg.requestFullscreen();
    }

    startGame();
})();
