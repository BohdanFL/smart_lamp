const Mode = {
    MANUAL: 0,
    AUTOMATIC: 1,
    SCHEDULE: 2,
};
let currentLampId = 1;
let brightness = 0;

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

async function getLampDataFromServer() {
    try {
        const response = await fetch("/jsonrequest");
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const data = await response.json();
        console.log("Response from server:", data);
        return data;
    } catch (error) {
        console.error("Error:", error);
    }
}

async function getStatsData() {
    try {
        const response = await fetch("/stats");
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const data = await response.json();
        console.log("Response from server:", data);
        return data;
    } catch (error) {
        console.error("Error:", error);
    }
}

function addStatsToDB(lamp_id, action, brightness) {
    fetch(`/stats/${lamp_id}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            action,
            brightness,
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
    const powerState = brightness !== 0; // Увімкнення або вимкнення
    const action = powerState ? "turn_on" : "turn_off";
    return { powerState, action };
}

document.addEventListener("DOMContentLoaded", async () => {
    const button = document.getElementById("toggleButton");
    const progressCircle = document.getElementById("progressCircle");
    const thumb = document.getElementById("sliderThumb");
    const manualTab = document.getElementById("manualTab");
    const programmaticTab = document.getElementById("programmaticTab");
    const statisticTab = document.getElementById("statisticTab");
    const manualMode = document.getElementById("manualMode");
    const programmaticMode = document.getElementById("programmaticMode");
    const statisticMode = document.getElementById("statisticMode");
    const monthLabel = document.querySelector(".month-selector label");
    const dayLabel = document.querySelector(".day-selector label");
    const chartContainers = document.querySelectorAll(".chart-container"); // Вибір усіх контейнерів графіків
    const monthDropdown = document.getElementById("monthDropdown");
    const dayDropdown = document.getElementById("dayDropdown");

    const circumference = 2 * Math.PI * 90; // Довжина окружності
    brightness = (await getLampDataFromServer()).brightness || 0; // Початкова яскравість
    let dragging = false; // Чи тягне користувач повзунок
    let lastBrightness = brightness; // Останнє значення яскравості

    const today = new Date();
    const currentMonth = today.getMonth() + 1; // Місяці починаються з 0
    const currentDay = today.getDate();

    // Встановити значення для випадаючих списків
    monthDropdown.value = currentMonth; // Наприклад, якщо value у варіантах відповідає числам (1-12)
    dayDropdown.value = currentDay;

    // Завантажити графік за поточний день і місяць
    function loadChart(month, day) {
        console.log(`Завантаження графіка для місяця ${month} і дня ${day}`);
        // Тут реалізуйте вашу логіку для завантаження графіка
    }

    // Викликати функцію для завантаження графіка
    loadChart(currentMonth, currentDay);

    // Додайте обробники для зміни значень (опціонально)
    monthDropdown.addEventListener("change", () => {
        loadChart(monthDropdown.value, dayDropdown.value);
    });

    dayDropdown.addEventListener("change", () => {
        loadChart(monthDropdown.value, dayDropdown.value);
    });

    // Функція для зміни кольору тексту підкреслення
    function updateTabStyles() {
        const textColor =
            brightness <= 50 ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)";

        manualTab.style.color = textColor;
        programmaticTab.style.color = textColor;
        statisticTab.style.color = textColor;

        manualTab.style.borderBottomColor = textColor;
        programmaticTab.style.borderBottomColor = textColor;
        statisticTab.style.borderBottomColor = textColor;
    }
    const lightResponseLabel = document.querySelector(
        "label[for=lightResponseSwitch]"
    );

    // Оновлюємо кольори, коли відбувається будь-яке оновлення
    function updateColors() {
        const buttonColor = `rgb(${255 - brightness * 2.55}, ${
            255 - brightness * 2.55
        }, ${255 - brightness * 2.55})`;
        const backgroundColor = `rgb(${brightness * 2.55}, ${
            brightness * 2.55
        }, ${brightness * 2.55})`;
        button.style.backgroundColor = buttonColor;
        document.body.style.backgroundColor = backgroundColor;

        // Оновлюємо кольори тексту вкладок
        if (brightness < 50) {
            button.style.color = "rgb(0,0,0)";
            manualTab.classList.add("white");
            programmaticTab.classList.add("white");
            statisticTab.classList.add("white");
            manualTab.classList.remove("black");
            programmaticTab.classList.remove("black");
            statisticTab.classList.remove("black");

            // lightResponseLabel.style.color = "white";
            monthLabel.style.color = "rgb(255,255,255)";
            dayLabel.style.color = "rgb(255,255,255)";
            [dayDropdown, monthDropdown].forEach((dropdown) => {
                dropdown.style.color = "white";
                dropdown.style.background = "black";
            });
        } else {
            button.style.color = "rgb(255,255,255)";
            manualTab.classList.add("black");
            programmaticTab.classList.add("black");
            statisticTab.classList.add("black");
            manualTab.classList.remove("white");
            programmaticTab.classList.remove("white");
            statisticTab.classList.remove("white");

            // lightResponseLabel.style.color = "black";
            monthLabel.style.color = "rgb(0,0,0)";
            dayLabel.style.color = "rgb(0,0,0)";
            [dayDropdown, monthDropdown].forEach((dropdown) => {
                dropdown.style.color = "black";
                dropdown.style.background = "white";
            });
        }

        // Оновлюємо кольори контейнерів графіків
        const containerColor =
            brightness <= 50
                ? `rgb(0, 0, 0)` // Темний відтінок
                : `rgb(255, 255, 255)`; // Світлий відтінок

        chartContainers.forEach((container) => {
            container.style.backgroundColor = containerColor;
        });
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

    // Функція для розрахунку кута та яскравості
    function calculateBrightness(event, isTouch = false) {
        const rect = progressCircle.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const clientX = isTouch ? event.touches[0].clientX : event.clientX;
        const clientY = isTouch ? event.touches[0].clientY : event.clientY;

        const angle = Math.atan2(clientY - centerY, clientX - centerX);
        let newBrightness = ((angle + Math.PI / 2) / (2 * Math.PI)) * 100;

        if (newBrightness < 0) newBrightness += 100;
        if (newBrightness > 100) newBrightness -= 100;

        if (Math.abs(newBrightness - lastBrightness) > 50) {
            return;
        }

        lastBrightness = newBrightness;
        brightness = Math.round(newBrightness);
        updateColors();
        updateButtonText();
        updateProgress(brightness);
    }

    // Обробник для старту перетягування
    function startDragging(event) {
        dragging = true;
    }

    // Обробник для завершення перетягування
    function stopDragging(event) {
        if (dragging) {
            // Надсилаємо оновлений стан на сервер
            const { powerState, action } = getLampState(brightness);
            updateLamp(
                currentLampId,
                powerState,
                brightness,
                Mode.MANUAL,
                action
            );
            addStatsToDB(currentLampId, action, brightness);
        }
        dragging = false;
    }

    // Обробник для руху повзунка
    function handleMove(event) {
        if (dragging) {
            calculateBrightness(event, event.type.startsWith("touch"));
        }
    }

    // Додаємо універсальні події
    thumb.addEventListener("mousedown", startDragging);
    thumb.addEventListener("touchstart", startDragging);

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("touchmove", handleMove);

    document.addEventListener("mouseup", stopDragging);
    document.addEventListener("touchend", stopDragging);

    // Обробник події для кнопки
    button.addEventListener("click", () => {
        if (brightness === 0) {
            // Якщо кнопка в режимі "OFF", переключаємо на "ON" і встановлюємо останню яскравість
            brightness = lastUserBrightness;
        } else {
            // Якщо кнопка в режимі "ON", переключаємо на "OFF" і скидаємо яскравість на 0
            lastUserBrightness = brightness; // Зберігаємо поточну яскравість
            brightness = 0;
        }
        updateColors(); // Оновлюємо кольори кнопки та фону
        updateButtonText(); // Оновлюємо текст кнопки
        updateProgress(brightness); // Оновлюємо прогрес-бар та положення повзунка

        // Надсилаємо оновлений стан на сервер
        const { powerState, action } = getLampState(brightness);
        updateLamp(currentLampId, powerState, brightness, Mode.MANUAL, action);
        addStatsToDB(currentLampId, action, brightness);
    });

    // Функція для скидання активного стану у всіх вкладках
    function resetActiveTabs() {
        manualTab.classList.remove("active");
        programmaticTab.classList.remove("active");
        statisticTab.classList.remove("active");
    }

    // Перемикання між режимами
    manualTab.addEventListener("click", () => {
        resetActiveTabs(); // Скидаємо активний стан
        manualTab.classList.add("active"); // Додаємо активний стан на Manual
        manualMode.style.display = "flex"; // Показуємо контент Manual
        programmaticMode.style.display = "none"; // Ховаємо інші
        statisticMode.style.display = "none";
        updateColors();
    });

    programmaticTab.addEventListener("click", () => {
        resetActiveTabs(); // Скидаємо активний стан
        programmaticTab.classList.add("active"); // Додаємо активний стан на Programmatic
        manualMode.style.display = "none"; // Ховаємо інші
        programmaticMode.style.display = "flex"; // Показуємо контент Programmatic
        statisticMode.style.display = "none";
        updateColors();
    });

    statisticTab.addEventListener("click", async () => {
        resetActiveTabs(); // Скидаємо активний стан
        statisticTab.classList.add("active"); // Додаємо активний стан на Statistic
        manualMode.style.display = "none"; // Ховаємо інші
        programmaticMode.style.display = "none";
        statisticMode.style.display = "flex"; // Показуємо контент Statistic
        updateColors();

        populateMonthDropdown(); // Створюємо меню місяців
        await createChart(); // Відображаємо місячний графік за замовчуванням
        populateDayDropdown(); // Заповнюємо меню днів
        await createDailyChart(); // Відображаємо графік дня за замовчуванням
    });

    // Початковий стан
    updateColors();
    updateButtonText();
    updateProgress(brightness);
});

let energyChartInstance; // Змінна для зберігання інстансу графіка

async function createChart(selectedMonth = null) {
    try {
        const data = await getStatsData();

        const currentDate = new Date();
        const currentMonth =
            selectedMonth ||
            `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
                .toString()
                .padStart(2, "0")}`;

        // Фільтруємо дані за обраним місяцем
        const filteredData = data.filter((entry) => {
            const entryMonth = `${entry.time.year}-${entry.time.month
                .toString()
                .padStart(2, "0")}`;
            return entryMonth === currentMonth;
        });

        // Обчислення часу увімкнення лампочки по днях
        const timePerDay = {}; // Об'єкт для збереження часу включення по дням
        let lastActionTime = null; // Змінна для збереження часу останнього ввімкнення

        filteredData.forEach((entry) => {
            const dayKey = `${entry.time.year}-${entry.time.month
                .toString()
                .padStart(2, "0")}-${entry.time.day
                .toString()
                .padStart(2, "0")}`;

            if (!timePerDay[dayKey]) {
                timePerDay[dayKey] = 0; // Ініціалізація для дня, якщо його ще немає
            }

            if (entry.action === "turn_on") {
                lastActionTime = new Date(
                    entry.time.year,
                    entry.time.month - 1,
                    entry.time.day,
                    entry.time.hour,
                    entry.time.minute
                );
            }

            if (entry.action === "turn_off" && lastActionTime) {
                const turnOffTime = new Date(
                    entry.time.year,
                    entry.time.month - 1,
                    entry.time.day,
                    entry.time.hour,
                    entry.time.minute
                );
                const durationInMinutes =
                    (turnOffTime - lastActionTime) / (1000 * 60 * 0.06 * 1000); // Тривалість у хвилинах
                timePerDay[dayKey] += durationInMinutes; // Додаємо тривалість до відповідного дня
                lastActionTime = null; // Скидаємо час останнього ввімкнення
            }
        });

        // Формування даних для графіка
        const labels = Object.keys(timePerDay).sort(); // Сортуємо за датами
        const timeData = labels.map((label) => timePerDay[label]);

        // Обчислення середнього часу по місяцю
        const totalTime = timeData.reduce((acc, time) => acc + time, 0);
        const averageTime = totalTime / timeData.length; // Середній час в хвилинах

        // Массив для лінії середнього часу
        const averageData = new Array(timeData.length).fill(averageTime); // Створюємо масив з однаковим значенням середнього часу

        const ctx = document.getElementById("energyChart").getContext("2d");

        // Перевірка та знищення попереднього графіка
        if (energyChartInstance) {
            energyChartInstance.destroy();
        }

        // Створення нового графіка
        energyChartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: `Energy consumption (${currentMonth})`,
                        data: timeData,
                        borderColor: "rgba(75, 192, 192, 1)",
                        backgroundColor: "rgba(75, 192, 192, 0.2)",
                        borderWidth: 2,
                    },
                    {
                        label: "Average Duration",
                        data: averageData,
                        borderColor: "rgba(255, 99, 132, 1)",
                        backgroundColor: "rgba(255, 99, 132, 0.2)",
                        borderWidth: 2,
                        pointRadius: 0,
                        borderDash: [5, 5], // пунктирна лінія
                    },
                ],
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "top",
                        labels: { font: { size: 14 } },
                    },
                },
                scales: {
                    x: { title: { display: true, text: "Date" } },
                    y: {
                        title: { display: true, text: "Energy (mW*h)" },
                        beginAtZero: true,
                    },
                },
            },
        });
    } catch (error) {
        console.error("Error while loading JSON:", error);
    }
}

// Функція для заповнення випадаючого меню
function populateMonthDropdown() {
    const monthDropdown = document.getElementById("monthDropdown");
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Оновіть меню місяців
    monthDropdown.innerHTML = ""; // Очищення попередніх значень
    for (let i = 0; i < 12; i++) {
        let month = currentMonth - i; // Місяць з поточного місяця в зворотному порядку
        let year = currentYear;

        if (month <= 0) {
            month += 12; // Оновлюємо місяці в звороті року
            year -= 1;
        }

        const normalizedMonth = month.toString().padStart(2, "0");
        const optionValue = `${year}-${normalizedMonth}`;
        const optionText = `${normalizedMonth}/${year}`;

        const option = document.createElement("option");
        if (month === currentMonth) option.selected = true;
        option.value = optionValue;
        option.textContent = optionText;

        monthDropdown.appendChild(option);
    }
}

let dailyEnergyChartInstance; // Інстанс для денного графіка

async function createDailyChart(selectedDate = null) {
    try {
        const data = await getStatsData();

        const currentDate =
            selectedDate || new Date().toISOString().split("T")[0]; // Формат YYYY-MM-DD

        // Фільтруємо дані за обраною датою
        const filteredData = data.filter((entry) => {
            const entryDate = `${entry.time.year}-${entry.time.month
                .toString()
                .padStart(2, "0")}-${entry.time.day
                .toString()
                .padStart(2, "0")}`;
            return entryDate === currentDate;
        });

        // Ініціалізуємо масив для 24 годин, який буде містити суму часу включення лампи для кожної години
        const timeOnPerHour = Array(24).fill(0); // Ініціалізуємо масив для кожної години

        let lastActionTime = null; // Останній час увімкнення лампи

        // Розрахунок часу включення лампи по годинах
        filteredData.forEach((entry) => {
            const hour = entry.time.hour;

            if (entry.action === "turn_on") {
                lastActionTime = new Date(
                    entry.time.year,
                    entry.time.month - 1,
                    entry.time.day,
                    entry.time.hour,
                    entry.time.minute
                );
            }

            if (entry.action === "turn_off" && lastActionTime) {
                const turnOffTime = new Date(
                    entry.time.year,
                    entry.time.month - 1,
                    entry.time.day,
                    entry.time.hour,
                    entry.time.minute
                );

                // Обчислення тривалості в годинах
                const durationInMinutes =
                    (turnOffTime - lastActionTime) / (1000 * 60 * 0.06 * 1000); // тривалість у хвилинах
                const startHour = lastActionTime.getHours();
                const endHour = turnOffTime.getHours();

                // Розбиваємо час на години
                if (startHour === endHour) {
                    // Якщо включення та вимкнення були в межах однієї години
                    timeOnPerHour[startHour] += durationInMinutes / 60; // додаємо тривалість до цієї години
                } else {
                    // Якщо включення та вимкнення були в різних годинах
                    // Додаємо частини тривалості для кожної години
                    // Перша година
                    const firstHourMinutes = 60 - lastActionTime.getMinutes();
                    timeOnPerHour[startHour] += firstHourMinutes / 60;

                    // Проміжні години
                    for (let i = startHour + 1; i < endHour; i++) {
                        timeOnPerHour[i] += 1; // ціла година
                    }

                    // Остання година
                    timeOnPerHour[endHour] += turnOffTime.getMinutes() / 60;
                }

                lastActionTime = null; // скидаємо останній час увімкнення
            }
        });

        // Формування даних для графіка
        const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`); // Масив для годин
        const ctx = document
            .getElementById("dailyEnergyChart")
            .getContext("2d");

        // Перевірка та знищення попереднього графіка
        if (dailyEnergyChartInstance) {
            dailyEnergyChartInstance.destroy();
        }

        // Створення нового графіка
        dailyEnergyChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: `Energy consumation (${currentDate})`,
                        data: timeOnPerHour,
                        backgroundColor: "rgba(153, 102, 255, 0.5)",
                        borderColor: "rgba(153, 102, 255, 1)",
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "top",
                        labels: { font: { size: 14 } },
                    },
                },
                scales: {
                    x: { title: { display: true, text: "Time (hours)" } },
                    y: {
                        title: { display: true, text: "Energy (mW*h)" },
                        beginAtZero: true,
                    },
                },
            },
        });
    } catch (error) {
        console.error("Error while loading JSON:", error);
    }
}

function populateDayDropdown(selectedMonth = null) {
    const dayDropdown = document.getElementById("dayDropdown");
    const currentDate = new Date();
    // const currentDate = selectedDate || new Date().toISOString().split("T")[0]; // Формат YYYY-MM-DD
    const currentMonth =
        selectedMonth ||
        `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
            .toString()
            .padStart(2, "0")}`;

    // Очищення попередніх значень
    dayDropdown.innerHTML = "";

    // Фільтруємо доступні дати
    const daysInMonth = new Date(
        currentMonth.split("-")[0],
        currentMonth.split("-")[1],
        0
    ).getDate(); // Кількість днів у місяці

    for (let day = 1; day <= daysInMonth; day++) {
        const normalizedDay = day.toString().padStart(2, "0");
        const optionValue = `${currentMonth}-${normalizedDay}`;
        const optionText = `${normalizedDay}/${currentMonth.split("-")[1]}/${
            currentMonth.split("-")[0]
        }`;

        const option = document.createElement("option");
        if (day === currentDate.getDate()) option.selected = true;
        option.value = optionValue;
        option.textContent = optionText;

        dayDropdown.appendChild(option);
    }
}

// Обробник зміни місяця
document
    .getElementById("monthDropdown")
    .addEventListener("change", async (event) => {
        const selectedMonth = event.target.value;
        await createChart(selectedMonth);
        populateDayDropdown(selectedMonth);
    });

// Обробник зміни дня
document
    .getElementById("dayDropdown")
    .addEventListener("change", async (event) => {
        await createDailyChart(event.target.value); // Створення графіка для обраного дня
    });
