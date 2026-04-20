
const UNIT_S = 1000;
const UNIT_M = 60000;
const UNIT_H = 3600000;
const UNIT_D = 86400000;

let currentModifier = "plusMinus";

function pad(num) {
    return String(num).padStart(2, "0");
}

function parseTimestamp(input) {
    const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?\s*(AM|PM)$/i;
    const match = input.trim().match(regex);

    if (!match) return null;

    let [, month, day, year, hour, minute, second, millisecond = "0", ampm] = match;

    month = parseInt(month, 10);
    day = parseInt(day, 10);
    year = parseInt(year, 10);
    hour = parseInt(hour, 10);
    minute = parseInt(minute, 10);
    second = parseInt(second, 10);
    millisecond = parseInt(millisecond.padEnd(3, "0"), 10);

    if (year < 100) year += 2000;

    ampm = ampm.toUpperCase();
    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;

    const date = new Date(year, month - 1, day, hour, minute, second, millisecond);
    return isNaN(date.getTime()) ? null : date;
}

function normalizeToMinute(dateObj) {
    const d = new Date(dateObj.getTime());
    d.setSeconds(0, 0);
    return d;
}

function formatSplunkDate(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return "";

    const m = pad(dateObj.getMonth() + 1);
    const d = pad(dateObj.getDate());
    const y = dateObj.getFullYear();
    const h = pad(dateObj.getHours());
    const min = pad(dateObj.getMinutes());

    return `${m}/${d}/${y}:${h}:${min}:00`;
}

function setModifier(mod) {
    currentModifier = mod;

    document.querySelectorAll(".modifier-btn").forEach((btn) => {
        btn.classList.remove("active");
    });

    const idMap = {
        before: "modBefore",
        after: "modAfter",
        plusMinus: "modPlusMinus"
    };

    const selectedBtn = document.getElementById(idMap[mod]);
    if (selectedBtn) {
        selectedBtn.classList.add("active");
    }
    calculateRange();
}

function getOffsetMs(value, unit) {
    if (unit === "s") return value * UNIT_S;
    if (unit === "m") return value * UNIT_M;
    if (unit === "h") return value * UNIT_H;
    if (unit === "d") return value * UNIT_D;
    return 0;
}

function mainConvert() {
    const input = document.getElementById("tsInput").value.trim();
    const parsedDate = parseTimestamp(input);

    if (!parsedDate) {
        alert("Invalid format. Please use a format like 4/19/26 11:19:21.304 PM");
        return;
    }

    document.getElementById("rangeControls").classList.add("show");
    calculateRange();
}

function calculateRange() {
    const input = document.getElementById("tsInput").value.trim();
    const parsedDate = parseTimestamp(input);

    if (!parsedDate) {
        alert("Invalid format. Please use a format like 4/19/26 11:19:21.304 PM");
        return;
    }

    const baseDate = normalizeToMinute(parsedDate);
    const offsetValue = parseFloat(document.getElementById("offsetValue").value);

    if (isNaN(offsetValue) || offsetValue < 0) {
        alert("Please enter a valid positive number for the offset.");
        return;
    }

    const unit = document.getElementById("offsetUnit").value;
    const offsetMs = getOffsetMs(offsetValue, unit);

    let earliestDate;
    let latestDate;

    if (currentModifier === "before") {
        earliestDate = shiftDate(baseDate, offsetValue, unit, -1);
        latestDate = new Date(baseDate);
    } else if (currentModifier === "after") {
        earliestDate = new Date(baseDate);
        latestDate = shiftDate(baseDate, offsetValue, unit, 1);
    } else {
        earliestDate = shiftDate(baseDate, offsetValue, unit, -1);
        latestDate = shiftDate(baseDate, offsetValue, unit, 1);
    }

    const query = `earliest=${formatSplunkDate(earliestDate)} latest=${formatSplunkDate(latestDate)}`;

    document.getElementById("result-container").style.display = "block";
    document.getElementById("result").innerText = query;

    document.getElementById("result").innerText = query;
    autoFitResultText();
}

async function copyToClipboard() {
    const text = document.getElementById("result").innerText;
    const btn = document.getElementById("copyBtn");

    try {
        await navigator.clipboard.writeText(text);
        btn.innerText = "Copied!";
        btn.classList.add("success");

        setTimeout(() => {
            btn.innerText = "Copy";
            btn.classList.remove("success");
        }, 2000);
    } catch (err) {
        console.error("Copy failed:", err);
    }
}

function shiftDate(baseDate, value, unit, direction) {
    const d = new Date(baseDate);

    if (unit === "m") {
        d.setMinutes(d.getMinutes() + direction * value);
    } else if (unit === "h") {
        d.setHours(d.getHours() + direction * value);
    } else if (unit === "d") {
        d.setDate(d.getDate() + direction * value);
    }

    return d;
}

function autoFitResultText() {
  const resultEl = document.getElementById("result");
  resultEl.style.fontSize = "1rem";

  while (
    resultEl.scrollWidth > resultEl.clientWidth &&
    parseFloat(getComputedStyle(resultEl).fontSize) > 10
  ) {
    const currentSize = parseFloat(getComputedStyle(resultEl).fontSize);
    resultEl.style.fontSize = (currentSize - 0.5) + "px";
  }
}