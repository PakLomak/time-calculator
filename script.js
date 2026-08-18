const runStartInput = document.getElementById("runStart");
const runEndInput = document.getElementById("runEnd");
const videoFpsInput = document.getElementById("videoFps");

const runTimeOutput = document.getElementById("runTime");
const modNoteOutput = document.getElementById("modNote");
const errorOutput = document.getElementById("error");

const resetButton = document.getElementById("resetButton");
const copyButton = document.getElementById("copyButton");

const historyList = document.getElementById("historyList");
const clearHistoryButton = document.getElementById("clearHistoryButton");

const HISTORY_KEY = "runTimeCalculatorHistory";
const MAX_HISTORY = 10;

let lastCalculation = null;


function parseTime(value) {

    value = value.trim();

    if (!value) {
        return null;
    }

    if (/[a-zа-я]/i.test(value)) {

        const normalized = value
            .toLowerCase()
            .replace(/,/g, ".")
            .replace(/\s+/g, " ")
            .trim();

        const hourMatch =
            normalized.match(/(\d+(?:\.\d+)?)\s*(?:h|ч)/);

        const minuteMatch =
            normalized.match(/(\d+(?:\.\d+)?)\s*(?:m(?!s)|мин)/);

        const secondMatch =
            normalized.match(/(\d+(?:\.\d+)?)\s*(?:s|сек)/);

        const millisecondMatch =
            normalized.match(/(\d+(?:\.\d+)?)\s*(?:ms|мс)/);

        const hours = hourMatch ? Number(hourMatch[1]) : 0;
        const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
        const seconds = secondMatch ? Number(secondMatch[1]) : 0;
        const milliseconds = millisecondMatch
            ? Number(millisecondMatch[1])
            : 0;

        if (
            !Number.isFinite(hours) ||
            !Number.isFinite(minutes) ||
            !Number.isFinite(seconds) ||
            !Number.isFinite(milliseconds) ||
            hours < 0 ||
            minutes < 0 ||
            seconds < 0 ||
            milliseconds < 0 ||
            minutes >= 60 ||
            seconds >= 60 ||
            milliseconds >= 1000
        ) {
            return null;
        }

        return Math.round(
            hours * 3600000 +
            minutes * 60000 +
            seconds * 1000 +
            milliseconds
        );
    }

    if (/^\d+(?:\.\d+)?$/.test(value)) {
        const seconds = Number(value);

        return Number.isFinite(seconds)
            ? Math.round(seconds * 1000)
            : null;
    }

    const parts = value.split(":");

    if (parts.length !== 2 && parts.length !== 3) {
        return null;
    }

    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (parts.length === 2) {
        minutes = Number(parts[0]);
        seconds = Number(parts[1]);
    } else {
        hours = Number(parts[0]);
        minutes = Number(parts[1]);
        seconds = Number(parts[2]);
    }

    if (
        !Number.isFinite(hours) ||
        !Number.isFinite(minutes) ||
        !Number.isFinite(seconds) ||
        hours < 0 ||
        minutes < 0 ||
        seconds < 0 ||
        minutes >= 60 ||
        seconds >= 60
    ) {
        return null;
    }

    return Math.round(
        hours * 3600000 +
        minutes * 60000 +
        seconds * 1000
    );
}


function formatTime(milliseconds) {

    milliseconds = Math.round(milliseconds);

    const hours = Math.floor(milliseconds / 3600000);
    milliseconds %= 3600000;

    const minutes = Math.floor(milliseconds / 60000);
    milliseconds %= 60000;

    const seconds = Math.floor(milliseconds / 1000);
    milliseconds %= 1000;

    return (
        hours +
        ":" +
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0") +
        "." +
        String(milliseconds).padStart(3, "0")
    );
}


function formatModNoteTime(milliseconds) {

    const totalSeconds = milliseconds / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
        return seconds.toFixed(3);
    }

    return (
        minutes +
        ":" +
        String(Math.floor(seconds)).padStart(2, "0") +
        "." +
        String(
            Math.round((seconds % 1) * 1000)
        ).padStart(3, "0")
    );
}


function normalizeTimeInput(input) {

    const milliseconds = parseTime(input.value);

    if (milliseconds === null) {
        return false;
    }

    input.value = formatTime(milliseconds);

    return true;
}


function getHistory() {

    try {
        const history = JSON.parse(
            localStorage.getItem(HISTORY_KEY)
        );

        return Array.isArray(history)
            ? history.slice(0, MAX_HISTORY)
            : [];
    } catch {
        return [];
    }
}


function saveHistory(history) {

    localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(history.slice(0, MAX_HISTORY))
    );
}


function addToHistory(calculation) {

    const history = getHistory();

    // Не создаём новую запись, если расчёт полностью совпадает
    // с предыдущим.
    const previous = history[0];

    if (
        previous &&
        previous.start === calculation.start &&
        previous.end === calculation.end &&
        previous.fps === calculation.fps
    ) {
        return;
    }

    history.unshift(calculation);
    saveHistory(history);
    renderHistory();
}


function renderHistory() {

    const history = getHistory();

    if (history.length === 0) {
        historyList.innerHTML =
            '<div class="history-empty">Здесь появятся результаты</div>';

        return;
    }

    historyList.innerHTML = history.map((item, index) => {

        return `
            <div class="history-item" data-index="${index}">
                <div class="history-number">#${index + 1}</div>
                <div class="history-time">${formatTime(item.duration)}</div>
                <div class="history-details">
                    Start: ${formatModNoteTime(item.start)}
                    · End: ${formatModNoteTime(item.end)}
                    · FPS: ${item.fps}
                </div>

                <button
                    class="history-delete"
                    data-delete="${index}"
                    title="Удалить"
                >×</button>
            </div>
        `;

    }).join("");
}


function loadHistoryItem(index) {

    const history = getHistory();
    const item = history[index];

    if (!item) {
        return;
    }

    runStartInput.value = formatTime(item.start);
    runEndInput.value = formatTime(item.end);
    videoFpsInput.value = item.fps;

    calculate();
}


function calculate() {

    errorOutput.textContent = "";

    const runStart = parseTime(runStartInput.value);
    const runEnd = parseTime(runEndInput.value);
    const videoFps = videoFpsInput.value.trim();

    if (runStart === null || runEnd === null) {
        return;
    }

    if (runEnd < runStart) {
        errorOutput.textContent =
            "Конец забега раньше его начала.";
        return;
    }

    if (videoFps === "" || Number(videoFps) <= 0) {
        errorOutput.textContent =
            "Укажи корректный Frame Rate.";
        return;
    }

    const runTime = runEnd - runStart;

    runTimeOutput.textContent = formatTime(runTime);

    modNoteOutput.textContent =
        `Mod Note: Start Time: ${formatModNoteTime(runStart)}, ` +
        `End Time: ${formatModNoteTime(runEnd)}, ` +
        `Frame Rate: ${videoFps}, ` +
        `Time: ${formatModNoteTime(runTime)}`;

    lastCalculation = {
        start: runStart,
        end: runEnd,
        fps: videoFps,
        duration: runTime
    };
}


function saveCurrentResult() {

    if (!lastCalculation) {
        return;
    }

    addToHistory(lastCalculation);
}


[runStartInput, runEndInput].forEach(input => {

    input.addEventListener("input", calculate);

    input.addEventListener("change", () => {
        normalizeTimeInput(input);
        calculate();
        saveCurrentResult();
    });

    input.addEventListener("blur", () => {
        normalizeTimeInput(input);
        calculate();
    });
});


videoFpsInput.addEventListener("input", calculate);

videoFpsInput.addEventListener("change", () => {
    calculate();
    saveCurrentResult();
});


copyButton.addEventListener("click", async () => {

    try {

        await navigator.clipboard.writeText(
            modNoteOutput.textContent
        );

    } catch (error) {

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(modNoteOutput);
        selection.removeAllRanges();
        selection.addRange(range);

        document.execCommand("copy");
        selection.removeAllRanges();
    }

    saveCurrentResult();

    copyButton.textContent = "Скопировано!";

    setTimeout(() => {
        copyButton.textContent = "Копировать Mod Note";
    }, 1200);
});


resetButton.addEventListener("click", () => {

    runStartInput.value = "0:00:00.000";
    runEndInput.value = "0:00:00.000";
    videoFpsInput.value = "60";

    lastCalculation = null;
    calculate();
});


clearHistoryButton.addEventListener("click", () => {

    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
});


historyList.addEventListener("click", event => {

    const deleteButton =
        event.target.closest("[data-delete]");

    if (deleteButton) {

        const index = Number(
            deleteButton.dataset.delete
        );

        const history = getHistory();

        history.splice(index, 1);
        saveHistory(history);
        renderHistory();

        return;
    }

    const item =
        event.target.closest(".history-item");

    if (!item) {
        return;
    }

    loadHistoryItem(
        Number(item.dataset.index)
    );
});


calculate();
renderHistory();
