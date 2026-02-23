(function () {
    "use strict";

    const TOTAL_ROUNDS = 4;
    const WHEEL_RADIUS = 150;
    const WHEEL_CENTER = 150;

    const screens = {
        start: document.getElementById("screen-start"),
        game: document.getElementById("screen-game"),
        result: document.getElementById("screen-result"),
        name: document.getElementById("screen-name"),
        pickScore: document.getElementById("screen-pick-score"),
        leaderboard: document.getElementById("screen-leaderboard"),
    };

    const els = {
        btnStart: document.getElementById("btn-start"),
        roundLabel: document.getElementById("round-label"),
        totalScoreLabel: document.getElementById("total-score-label"),
        targetColor: document.getElementById("target-color"),
        canvas: document.getElementById("color-wheel"),
        pickerCursor: document.getElementById("picker-cursor"),
        btnConfirm: document.getElementById("btn-confirm"),
        resultTarget: document.getElementById("result-target"),
        resultPicked: document.getElementById("result-picked"),
        resultAccuracy: document.getElementById("result-accuracy"),
        btnNext: document.getElementById("btn-next"),
        finalScore: document.getElementById("final-score"),
        nicknameInput: document.getElementById("nickname-input"),
        btnSave: document.getElementById("btn-save"),
        scoreList: document.getElementById("score-list"),
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
    };

    function showScreen(name) {
        Object.values(screens).forEach((s) => s.classList.remove("active"));
        screens[name].classList.add("active");
    }

    // --- Color wheel rendering ---

    function drawColorWheel() {
        const ctx = els.canvas.getContext("2d");
        const cx = WHEEL_CENTER;
        const cy = WHEEL_CENTER;
        const r = WHEEL_RADIUS;
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

    // --- Random target color generation ---

    function generateTarget() {
        state.targetHue = Math.floor(Math.random() * 360);
        state.targetSat = 30 + Math.floor(Math.random() * 70);
    }

    // --- Accuracy calculation ---

    function calcAccuracy(targetH, targetS, pickedH, pickedS) {
        let hueDiff = Math.abs(targetH - pickedH);
        if (hueDiff > 180) hueDiff = 360 - hueDiff;

        const satDiff = Math.abs(targetS - pickedS);

        const hueScore = Math.max(0, 100 - (hueDiff / 180) * 100);
        const satScore = Math.max(0, 100 - satDiff);

        return Math.round(hueScore * 0.7 + satScore * 0.3);
    }

    // --- Pointer handling on the color wheel ---

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

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;
        return { x, y };
    }

    function handleWheelInput(e) {
        e.preventDefault();
        const { x, y } = getWheelPosition(e);
        const dx = x - WHEEL_CENTER;
        const dy = y - WHEEL_CENTER;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > WHEEL_RADIUS) return;

        const angle = Math.atan2(dy, dx);
        state.pickedHue = ((angle * 180) / Math.PI + 360) % 360;
        state.pickedSat = (dist / WHEEL_RADIUS) * 100;

        const rect = els.canvas.getBoundingClientRect();
        const cssX = x / (els.canvas.width / rect.width);
        const cssY = y / (els.canvas.height / rect.height);

        els.pickerCursor.style.left = cssX + "px";
        els.pickerCursor.style.top = cssY + "px";
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
        els.roundLabel.textContent = `Раунд ${state.round} / ${TOTAL_ROUNDS}`;
        els.totalScoreLabel.textContent = `Очки: ${state.totalScore}`;

        drawColorWheel();
        showScreen("game");
    }

    function confirmPick() {
        const accuracy = calcAccuracy(
            state.targetHue,
            state.targetSat,
            state.pickedHue,
            state.pickedSat
        );
        state.totalScore += accuracy;

        els.resultTarget.style.background = hslString(state.targetHue, state.targetSat);
        els.resultPicked.style.background = hslString(state.pickedHue, state.pickedSat);
        els.resultAccuracy.textContent = `${accuracy} / 100`;

        if (state.round >= TOTAL_ROUNDS) {
            els.btnNext.textContent = "Результат";
        } else {
            els.btnNext.textContent = "Далее";
        }
        showScreen("result");
    }

    function afterResult() {
        if (state.round >= TOTAL_ROUNDS) {
            showNameScreen();
        } else {
            nextRound();
        }
    }

    function showNameScreen() {
        els.finalScore.textContent = `${state.totalScore} / ${TOTAL_ROUNDS * 100}`;

        const tg = window.Telegram && window.Telegram.WebApp;
        if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
            const user = tg.initDataUnsafe.user;
            els.nicknameInput.value = user.username || user.first_name || "";
        }

        els.btnSave.disabled = !els.nicknameInput.value.trim();
        showScreen("name");
    }

    async function saveScore() {
        const nickname = els.nicknameInput.value.trim();
        if (!nickname) return;
        state.savedNickname = nickname;

        els.btnSave.disabled = true;
        els.btnSave.textContent = "Проверка...";

        try {
            const res = await fetch(`/api/scores/${encodeURIComponent(nickname)}`);
            const data = await res.json();

            if (data.scores && data.scores.length > 0) {
                els.btnSave.textContent = "Сохранить результат";
                els.btnSave.disabled = false;
                showPickScoreScreen(data.scores);
                return;
            }

            await fetch("/api/score", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname, score: state.totalScore }),
            });
        } catch (err) {
            console.error("Failed to save score:", err);
        }

        els.btnSave.textContent = "Сохранить результат";
        els.btnSave.disabled = false;
        showLeaderboard();
    }

    function showPickScoreScreen(existingScores) {
        els.scoreList.innerHTML = "";

        const newOption = createScoreOption(state.totalScore, "Новый результат", true);
        els.scoreList.appendChild(newOption);

        existingScores.forEach((entry, i) => {
            const label = `Прошлый результат #${i + 1}`;
            const option = createScoreOption(entry.score, label, false);
            els.scoreList.appendChild(option);
        });

        showScreen("pickScore");
    }

    function createScoreOption(score, label, isNew) {
        const div = document.createElement("div");
        div.className = "score-option" + (isNew ? " is-new" : "");
        div.innerHTML = `
            <div>
                <div class="score-label">${escapeHtml(label)}</div>
                <div class="score-value">${score} / ${TOTAL_ROUNDS * 100}</div>
            </div>
        `;
        div.addEventListener("click", () => pickScore(score));
        return div;
    }

    async function pickScore(chosenScore) {
        const nickname = state.savedNickname;
        try {
            await fetch("/api/score", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname, score: chosenScore }),
            });
            state.totalScore = chosenScore;
        } catch (err) {
            console.error("Failed to replace score:", err);
        }
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
            if (
                entry.nickname === state.savedNickname &&
                entry.score === state.totalScore
            ) {
                tr.classList.add("highlight");
            }
            tr.innerHTML = `
                <td>${entry.rank}</td>
                <td>${escapeHtml(entry.nickname)}</td>
                <td>${entry.score}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Event listeners ---

    els.btnStart.addEventListener("click", startGame);
    els.btnConfirm.addEventListener("click", confirmPick);
    els.btnNext.addEventListener("click", afterResult);
    els.btnSave.addEventListener("click", saveScore);
    els.btnRestart.addEventListener("click", startGame);

    els.nicknameInput.addEventListener("input", () => {
        els.btnSave.disabled = !els.nicknameInput.value.trim();
    });

    // Prevent page scroll on touch, but allow scrolling inside scrollable areas
    document.addEventListener("touchmove", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        let node = e.target;
        while (node && node !== document.body) {
            const style = window.getComputedStyle(node);
            const overflowY = style.overflowY;
            if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
                return;
            }
            node = node.parentElement;
        }
        e.preventDefault();
    }, { passive: false });

    document.addEventListener("contextmenu", (e) => e.preventDefault());

    // Telegram WebApp integration
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg) {
        tg.ready();
        tg.expand();
    }
})();
