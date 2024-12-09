// JavaScript для додавання запису та видалення
document.addEventListener("DOMContentLoaded", function () {
    const addButton = document.getElementById("addButton");
    const cancelButton = document.querySelector(".cancelBtn");
    const scheduleList = document.getElementById("scheduleList");
    const addPanel = document.querySelector(".addPanel");
    const addButtonPanel = document.getElementById("addButtonPanel");
    const checkboxGroup = document.querySelector(".checkbox-group");
    const startTime = document.getElementById("startTime");
    const endTime = document.getElementById("endTime");
    const blockNameInput = document.getElementById("blockName");
    const checkboxes = checkboxGroup.querySelectorAll('input[type="checkbox"]');

    // Placeholder data for test
    blockNameInput.value = "Winter Time";
    checkboxes.forEach((checkbox) => {
        checkbox.checked = true;
    });
    startTime.value = "16:00";
    endTime.value = "20:00";

    // Функція для додавання запису
    addButton.addEventListener("click", () => {
        const selectedDays = [];

        checkboxes.forEach((checkbox) => {
            if (checkbox.checked) {
                selectedDays.push(
                    checkbox.nextElementSibling.getAttribute("data-day")
                );
            }
        });

        // Перевірка на порожні поля
        if (
            selectedDays.length === 0 ||
            startTime.value === "" ||
            endTime.value === "" ||
            blockNameInput.value === ""
        ) {
            alert(
                "Будь ласка, заповніть усі поля та виберіть хоча б один день."
            );
            return;
        }

        // Формування назви запису
        const blockName = blockNameInput.value;
        const timePeriod = `З: ${startTime.value} По: ${endTime.value}`;
        const days = selectedDays.join(", ").toUpperCase();
        // Створення нового елементу запису
        const newListItem = document.createElement("li");
        newListItem.innerHTML = `
            <h3>${blockName}</h3>
            <p>${days} | ${timePeriod}</p>
            <button class="deleteBtn">Delete</button>
        `;

        // Додавання кнопки видалення
        const deleteBtn = newListItem.querySelector(".deleteBtn");
        deleteBtn.addEventListener("click", function () {
            newListItem.remove();
        });

        // Додавання запису в список
        scheduleList.appendChild(newListItem);

        // Очищення полів після додавання
        // blockNameInput.value = "";
        // startTime.value = "";
        // endTime.value = "";
        // checkboxes.forEach((checkbox) => {
        //     checkbox.checked = false;
        // });

        // Placeholder data for test
        blockNameInput.value = "Winter Time";
        checkboxes.forEach((checkbox) => {
            checkbox.checked = true;
        });
        startTime.value = "16:00";
        endTime.value = "20:00";

        // Закриття панелі
        addPanel.style.display = "none";
        addButtonPanel.style.display = "block"; // Показуємо кнопку Add знову
    });

    // Кнопка для скасування
    cancelButton.addEventListener("click", () => {
        addPanel.style.display = "none"; // Сховати панель
        addButtonPanel.style.display = "block"; // Показати кнопку Add
    });

    // Кнопка "Add"
    addButtonPanel.addEventListener("click", () => {
        addPanel.style.display = "block"; // Відкриваємо панель
        addButtonPanel.style.display = "none"; // Сховати кнопку Add
    });
});
