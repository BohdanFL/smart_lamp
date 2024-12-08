const Mode = {
    MANUAL: 0,
    AUTOMATIC: 1,
    SCHEDULE: 2,
};

const schedules = [
    {
        days: ["Monday", "Wednesday", "Friday"],
        time_ranges: [
            {
                start_time: "08:00",
                end_time: "10:00",
            },
            {
                start_time: "12:00",
                end_time: "14:00",
            },
            {
                start_time: "16:00",
                end_time: "18:00",
            },
        ],
    },
    {
        days: ["Tuesday", "Thursday"],
        time_ranges: [
            {
                start_time: "06:30",
                end_time: "08:30",
            },
            {
                start_time: "11:00",
                end_time: "13:00",
            },
        ],
    },
    {
        days: ["Monday", "Friday", "Saturday"],
        time_ranges: [
            {
                start_time: "09:00",
                end_time: "11:00",
            },
            {
                start_time: "14:00",
                end_time: "16:00",
            },
            {
                start_time: "18:30",
                end_time: "20:00",
            },
        ],
    },
    {
        days: ["Wednesday"],
        time_ranges: [
            {
                start_time: "07:00",
                end_time: "09:00",
            },
            {
                start_time: "10:30",
                end_time: "12:30",
            },
        ],
    },
    {
        days: ["Sunday"],
        time_ranges: [
            {
                start_time: "09:00",
                end_time: "11:00",
            },
            {
                start_time: "12:00",
                end_time: "15:00",
            },
            {
                start_time: "17:00",
                end_time: "19:00",
            },
            {
                start_time: "21:00",
                end_time: "23:00",
            },
        ],
    },
    {
        days: ["Thursday", "Saturday"],
        time_ranges: [
            {
                start_time: "08:00",
                end_time: "10:00",
            },
        ],
    },
];

function updateLamp(lamp_id, powerState, brightness, mode, action) {
    fetch(`/lamps/${lamp_id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            power_state: powerState,
            brightness: brightness,
            mode: mode,
            action: action,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            console.log("Response from server:", data);
            // Можна виконати додаткові дії, наприклад, оновити UI
        })
        .catch((error) => console.error("Error:", error));
}

function getLampState(brightness) {
    const powerState = brightness === 0; // Увімкнення або вимкнення
    const action = powerState ? "turned on" : "turned off";
    return { powerState, action };
}

function createSchedule(lamp_id, schedule) {
    fetch(`/lamps/${lamp_id}/schedules`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(schedule),
    })
        .then((response) => response.json())
        .then((data) => {
            console.log("Response from server:", data);
            // Можна виконати додаткові дії, наприклад, оновити UI
        })
        .catch((error) => console.error("Error:", error));
}

document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("toggleButton");
    const progressCircle = document.getElementById("progressCircle");
    const thumb = document.getElementById("sliderThumb");
    const manualTab = document.getElementById("manualTab");
    const programmaticTab = document.getElementById("programmaticTab");
    const statisticTab = document.getElementById("statisticTab");
    const manualMode = document.getElementById("manualMode");
    const programmaticMode = document.getElementById("programmaticMode");
    const statisticMode = document.getElementById("statisticMode");

    const circumference = 2 * Math.PI * 90; // Довжина окружності
    let brightness = 0; // Початкова яскравість
    let dragging = false; // Чи тягне користувач повзунок
    let lastBrightness = 0; // Останнє значення яскравості
    let currentLampId = 1;

    // for (const schedule of schedules) {
    //     createSchedule(currentLampId, schedule);
    // }

    // Функція оновлення кольорів
    function updateColors() {
        const buttonColor = `rgb(${255 - brightness * 2.55}, ${
            255 - brightness * 2.55
        }, ${255 - brightness * 2.55})`; // Колір кнопки
        const backgroundColor = `rgb(${brightness * 2.55}, ${
            brightness * 2.55
        }, ${brightness * 2.55})`; // Колір фону
        button.style.backgroundColor = buttonColor;
        document.body.style.backgroundColor = backgroundColor;

        // Текст на кнопці завжди контрастний до кольору кнопки
        if (brightness > 50) {
            button.style.color = "rgb(255, 255, 255)"; // Текст білий
        } else {
            button.style.color = "rgb(0, 0, 0)"; // Текст чорний
        }
        manualTab.style.color = button.style.backgroundColor;
        programmaticTab.style.color = button.style.backgroundColor;
        statisticTab.style.color = button.style.backgroundColor;
    }

    // Функція оновлення тексту кнопки
    function updateButtonText() {
        if (brightness === 0) {
            button.textContent = "ON";
        } else if (brightness === 100) {
            button.textContent = "OFF";
        } else {
            button.textContent = `${brightness}%`;
        }
    }

    // Функція оновлення прогресу
    function updateProgress(value) {
        const offset = circumference - (value / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;

        // Обчислення нового положення ручки
        const angle = (value / 100) * 360;
        const radian = (angle - 90) * (Math.PI / 180);
        const x = 100 + 90 * Math.cos(radian);
        const y = 100 + 90 * Math.sin(radian);
        thumb.style.left = `${x}px`;
        thumb.style.top = `${y}px`;
    }

    // Обробники подій для ручки
    thumb.addEventListener("mousedown", () => {
        dragging = true;
    });

    document.addEventListener("mousemove", (event) => {
        if (dragging) {
            const rect = progressCircle.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Обчислення кута між центром та поточною позицією курсора
            const angle = Math.atan2(
                event.clientY - centerY,
                event.clientX - centerX
            );
            let newBrightness = ((angle + Math.PI / 2) / (2 * Math.PI)) * 100;

            // Перетворення в допустимий діапазон
            if (newBrightness < 0) newBrightness += 100;
            if (newBrightness > 100) newBrightness -= 100;

            // Заборона миттєвого переходу між 0% і 100%
            if (Math.abs(newBrightness - lastBrightness) > 50) {
                return; // Ігнорувати некоректний рух
            }

            lastBrightness = newBrightness; // Оновлення останньої яскравості
            brightness = Math.round(newBrightness);
            updateColors();
            updateButtonText();
            updateProgress(brightness);
        }
    });

    document.addEventListener("mouseup", () => {
        dragging = false;

        // Надсилаємо оновлений стан на сервер
        // const { powerState, action } = getLampState(brightness);
        // updateLamp(currentLampId, powerState, brightness, Mode.MANUAL, action);
    });

    // Обробник події для кнопки
    button.addEventListener("click", () => {
        if (brightness === 0) {
            // Якщо кнопка в режимі "OFF", переключаємо на "ON" і встановлюємо яскравість на 100
            brightness = 100;
        } else {
            // Якщо кнопка в режимі "ON", переключаємо на "OFF" і скидаємо яскравість на 0
            brightness = 0;
        }
        updateColors(); // Оновлюємо кольори кнопки та фону
        updateButtonText(); // Оновлюємо текст кнопки
        updateProgress(brightness); // Оновлюємо прогрес-бар та положення повзунка

        // Надсилаємо оновлений стан на сервер
        const { powerState, action } = getLampState(brightness);
        updateLamp(currentLampId, powerState, brightness, Mode.MANUAL, action);
    });

    // Перемикання між режимами
    manualTab.addEventListener("click", () => {
        manualTab.classList.add("active");
        programmaticTab.classList.remove("active");
        manualMode.style.display = "block";
        programmaticMode.style.display = "none";
    });

    programmaticTab.addEventListener("click", () => {
        programmaticTab.classList.add("active");
        manualTab.classList.remove("active");
        manualMode.style.display = "none";
        programmaticMode.style.display = "block";
    });

    statisticTab.addEventListener("click", () => {
        statisticTab.classList.add("active");
        manualTab.classList.remove("active");
        manualMode.style.display = "none";
        statisticMode.style.display = "block";
    });

    // Початковий стан
    updateColors();
    updateButtonText();
    updateProgress(brightness);
});
