function updateLamp(powerState, brightness, mode, action) {
    fetch("/update_lamp", {
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
        const newPowerState = brightness === 0; // Увімкнення або вимкнення
        const newAction = newPowerState ? "turned on" : "turned off";
        updateLamp(newPowerState, brightness, 0, newAction);
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
