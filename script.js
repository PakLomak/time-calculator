/* ==========================================================
   ЭЛЕМЕНТЫ
   ========================================================== */

const videoStartInput = document.getElementById("videoStart");
const runStartInput = document.getElementById("runStart");
const runEndInput = document.getElementById("runEnd");
const videoEndInput = document.getElementById("videoEnd");
const videoFpsInput = document.getElementById("videoFps");

const beforeRunOutput = document.getElementById("beforeRun");
const runTimeOutput = document.getElementById("runTime");
const afterRunOutput = document.getElementById("afterRun");
const videoTimeOutput = document.getElementById("videoTime");

const modNoteOutput = document.getElementById("modNote");
const errorOutput = document.getElementById("error");

const resetButton = document.getElementById("resetButton");
const copyButton = document.getElementById("copyButton");


/* ==========================================================
   ПРЕОБРАЗОВАНИЕ ВРЕМЕНИ В МИЛЛИСЕКУНДЫ
   ========================================================== */

function parseTime(value) {

    value = value.trim();

    if (!value) {
        return null;
    }


    /* ------------------------------------------------------
       ФОРМАТ С ЕДИНИЦАМИ

       7m
       7m 3s
       7m 3s 250ms
       1h 7m 3s 250ms

       Также поддерживаются:

       7мин
       3сек
       250мс
       1ч 7мин 3сек 250мс
       ------------------------------------------------------ */

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


        const hours = hourMatch
            ? Number(hourMatch[1])
            : 0;

        const minutes = minuteMatch
            ? Number(minuteMatch[1])
            : 0;

        const seconds = secondMatch
            ? Number(secondMatch[1])
            : 0;

        const milliseconds = millisecondMatch
            ? Number(millisecondMatch[1])
            : 0;


        if (
            !Number.isFinite(hours) ||
            !Number.isFinite(minutes) ||
            !Number.isFinite(seconds) ||
            !Number.isFinite(milliseconds)
        ) {
            return null;
        }


        if (
            hours < 0 ||
            minutes < 0 ||
            seconds < 0 ||
            milliseconds < 0
        ) {
            return null;
        }


        if (
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


    /* ------------------------------------------------------
       ПРОСТОЕ ЧИСЛО

       7       → 7 секунд
       7.5     → 7.5 секунд
       21.937  → 21.937 секунд
       ------------------------------------------------------ */

    if (/^\d+(?:\.\d+)?$/.test(value)) {

        const seconds = Number(value);

        if (!Number.isFinite(seconds)) {
            return null;
        }

        return Math.round(seconds * 1000);
    }


    /* ------------------------------------------------------
       ФОРМАТ С ДВОЕТОЧИЯМИ

       7:30
       7:3
       7:3.25

       → минуты : секунды


       1:7:30
       1:7:3.25

       → часы : минуты : секунды
       ------------------------------------------------------ */

    const parts = value.split(":");


    if (
        parts.length !== 2 &&
        parts.length !== 3
    ) {
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
        !Number.isFinite(seconds)
    ) {
        return null;
    }


    if (
        hours < 0 ||
        minutes < 0 ||
        seconds < 0
    ) {
        return null;
    }


    if (
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


/* ==========================================================
   МИЛЛИСЕКУНДЫ → ВРЕМЯ
   ========================================================== */

function formatTime(milliseconds) {

    milliseconds = Math.round(milliseconds);


    const hours =
        Math.floor(milliseconds / 3600000);

    milliseconds %= 3600000;


    const minutes =
        Math.floor(milliseconds / 60000);

    milliseconds %= 60000;


    const seconds =
        Math.floor(milliseconds / 1000);

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


/* ==========================================================
   НОРМАЛИЗАЦИЯ ПОЛЯ
   ========================================================== */

function normalizeTimeInput(input) {

    const milliseconds =
        parseTime(input.value);


    if (milliseconds === null) {
        return false;
    }


    input.value =
        formatTime(milliseconds);


    return true;
}


/* ==========================================================
   ОБНОВЛЕНИЕ MOD NOTE
   ========================================================== */

function updateModNote(
    startTime,
    endTime,
    videoFps,
    videoTime
) {

    modNoteOutput.value =
        `Mod Note: Start Time: ${startTime}, End Time: ${endTime}, Frame Rate: ${videoFps}, Time: ${videoTime}`;
}


/* ==========================================================
   РАСЧЁТ
   ========================================================== */

function calculate() {

    errorOutput.textContent = "";


    const videoStart =
        parseTime(videoStartInput.value);

    const runStart =
        parseTime(runStartInput.value);

    const runEnd =
        parseTime(runEndInput.value);

    const videoEnd =
        parseTime(videoEndInput.value);


    const videoFps =
        videoFpsInput.value.trim();


    /* ------------------------------------------------------
       ЕСЛИ ПОЛЕ ЕЩЁ РЕДАКТИРУЕТСЯ

       Ничего не ломаем и не показываем ошибку.
       ------------------------------------------------------ */

    if (
        videoStart === null ||
        runStart === null ||
        runEnd === null ||
        videoEnd === null
    ) {
        return;
    }


    /* ------------------------------------------------------
       ПРОВЕРКА ПОРЯДКА
       ------------------------------------------------------ */

    if (runStart < videoStart) {

        errorOutput.textContent =
            "Начало забега раньше начала видео.";

        return;
    }


    if (runEnd < runStart) {

        errorOutput.textContent =
            "Конец забега раньше его начала.";

        return;
    }


    if (videoEnd < runEnd) {

        errorOutput.textContent =
            "Конец видео раньше конца забега.";

        return;
    }


    /* ------------------------------------------------------
       ПРОВЕРКА FPS
       ------------------------------------------------------ */

    if (
        videoFps === "" ||
        Number(videoFps) <= 0
    ) {

        errorOutput.textContent =
            "Укажи корректный Frame Rate.";

        return;
    }


    /* ------------------------------------------------------
       РАСЧЁТЫ
       ------------------------------------------------------ */

    const beforeRun =
        runStart - videoStart;

    const runTime =
        runEnd - runStart;

    const afterRun =
        videoEnd - runEnd;

    const videoTime =
        videoEnd - videoStart;


    /* ------------------------------------------------------
       ФОРМАТИРОВАНИЕ
       ------------------------------------------------------ */

    const formattedBeforeRun =
        formatTime(beforeRun);

    const formattedRunTime =
        formatTime(runTime);

    const formattedAfterRun =
        formatTime(afterRun);

    const formattedVideoTime =
        formatTime(videoTime);


    /* ------------------------------------------------------
       ВЫВОД
       ------------------------------------------------------ */

    beforeRunOutput.textContent =
        formattedBeforeRun;

    runTimeOutput.textContent =
        formattedRunTime;

    afterRunOutput.textContent =
        formattedAfterRun;

    videoTimeOutput.textContent =
        formattedVideoTime;


    /* ------------------------------------------------------
       MOD NOTE
       ------------------------------------------------------ */

    updateModNote(
        formatTime(runStart),
        formatTime(runEnd),
        videoFps,
        formattedRunTime
    );
}


/* ==========================================================
   ПОЛЯ ВРЕМЕНИ
   ========================================================== */

const timeInputs = [
    videoStartInput,
    runStartInput,
    runEndInput,
    videoEndInput
];


timeInputs.forEach(input => {

    /* Пересчитываем во время ввода */
    input.addEventListener(
        "input",
        calculate
    );


    /* Приводим к стандартному виду */
    input.addEventListener(
        "change",
        () => {

            normalizeTimeInput(input);
            calculate();
        }
    );


    /* Приводим к стандартному виду после выхода */
    input.addEventListener(
        "blur",
        () => {

            normalizeTimeInput(input);
            calculate();
        }
    );
});


/* ==========================================================
   FRAME RATE
   ========================================================== */

videoFpsInput.addEventListener(
    "input",
    calculate
);

videoFpsInput.addEventListener(
    "change",
    calculate
);


/* ==========================================================
   КОПИРОВАНИЕ MOD NOTE
   ========================================================== */

copyButton.addEventListener(
    "click",
    async () => {

        try {

            await navigator.clipboard.writeText(
                modNoteOutput.value
            );

            copyButton.textContent =
                "Скопировано!";


            setTimeout(
                () => {

                    copyButton.textContent =
                        "Копировать";

                },
                1200
            );

        } catch (error) {

            modNoteOutput.select();

            document.execCommand("copy");

            copyButton.textContent =
                "Скопировано!";


            setTimeout(
                () => {

                    copyButton.textContent =
                        "Копировать";

                },
                1200
            );
        }
    }
);


/* ==========================================================
   СБРОС
   ========================================================== */

resetButton.addEventListener(
    "click",
    () => {

        videoStartInput.value =
            "0:00:00.000";

        runStartInput.value =
            "0:00:00.000";

        runEndInput.value =
            "0:00:00.000";

        videoEndInput.value =
            "0:00:00.000";

        videoFpsInput.value =
            "60";


        calculate();
    }
);


/* ==========================================================
   ПЕРВОНАЧАЛЬНЫЙ РАСЧЁТ
   ========================================================== */

calculate();
