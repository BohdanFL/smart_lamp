async function loadSchedulesFromServer(lamp_id = 1) {
    try {
        const response = await fetch(`/lamps/${lamp_id}/schedules`);
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

async function createScheduleOnServer(lamp_id, name, days, time_ranges) {
    try {
        const response = await fetch(`/lamps/${lamp_id}/schedules`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name,
                days,
                time_ranges,
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to create schedule");
        }
        const data = await response.json();
        return data.schedule_id; // Унікальний ID з бази даних
    } catch (error) {
        console.error("Error creating schedule on server:", error);
        throw error;
    }
}

function deleteSchedule(element) {
    const schedule_id = element.getAttribute("data-id");

    if (!schedule_id) {
        console.error("ID not found for schedule element");
        return;
    }

    deleteScheduleOnServer(schedule_id).then(() => {
        element.remove();
    });
}

async function deleteScheduleOnServer(schedule_id) {
    await fetch(`/schedules/${schedule_id}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
    })
        .then((response) => response.json())
        .then((data) => {
            console.log("Response from server:", data);
        })
        .catch((error) => console.error("Error:", error));
}

function createSchedule(
    schedule_id,
    scheduleName,
    time_ranges,
    selectedDays
) {
    // Формування назви запису
    const blockName = scheduleName;
//    const timePeriod = `З: ${startTime} По: ${endTime}`;

    let timePeriod = [];

    for (i = 0; i < time_ranges.length; i++){
        timePeriod.push(  `З: ${time_ranges[i].startTime} По: ${time_ranges[i].endTime}`);
    }

    const days = selectedDays.join(", ").toUpperCase();
    // Створення нового елементу запису
    const newListItem = document.createElement("li");
    newListItem.setAttribute("data-id", schedule_id);
    newListItem.innerHTML = `
            <h3>${blockName}</h3>
            <p>${days} | ${timePeriod}</p>
            <button class="deleteBtn">Delete</button>
        `;

    // Додавання кнопки видалення
    const deleteBtn = newListItem.querySelector(".deleteBtn");
    deleteBtn.addEventListener("click", () => {
        deleteSchedule(newListItem);
    });

    // Додавання запису в список
    scheduleList.appendChild(newListItem);
}

// JavaScript для додавання запису та видалення
document.addEventListener("DOMContentLoaded", async function () {
    const addButton = document.getElementById("addButton");
    const cancelButton = document.querySelector(".cancelBtn");
    const scheduleList = document.getElementById("scheduleList");
    const addPanel = document.querySelector(".addPanel");
    const addButtonPanel = document.getElementById("addButtonPanel");
    const checkboxGroup = document.querySelector(".checkbox-group");
//    const startTime = document.getElementById("startTime0");
//    const endTime = document.getElementById("endTime0");
    const blockNameInput = document.getElementById("blockName");
    const checkboxes = checkboxGroup.querySelectorAll('input[type="checkbox"]');

    //Timeranges reading
    let time_ranges = []




        // Load Schedules From DB in UI
        const schedulesData = await loadSchedulesFromServer(1);
        console.log("schedulesData" + schedulesData)
        schedulesData.forEach((schedule) => {
            const { schedule_id, name, days, time_ranges } = schedule;

            createSchedule(
                schedule_id,
                name,
                time_ranges,
                days
            );
        });

        for(i = 0; i <= timerangesCount; i++){

        elStart = document.getElementById(`startTime${i}`)
        elEnd = document.getElementById(`endTime${i}`)

        timerangeObj = {}


        console.log(i)
        console.log(`endTime${i}`)
        console.log(elEnd)

        timerangeObj.startTime = elStart.value
        timerangeObj.endTime = elEnd.value

        console.log(timerangeObj.startTime)
        console.log(timerangeObj.endTime)

        time_ranges.push(timerangeObj)
    }

    console.log(time_ranges)




        //Time checking (FROM time must be less than TO)
        for(i = 0; i < time_ranges.length; i++){
            if(time_ranges[i].startTime > time_ranges[i].endTime ){
                 alert(
                "Час З має бути меншим ніж час ПІСЛЯ"
            );
            return;
            }

            if(time_ranges[i].startTime === "" ||  time_ranges[i].endTime === "" ){
                 alert(
                "Будь ласка, заповніть усі часові проміжки."
            );
            return;
            }
        }


        // Перевірка на порожні поля
        if (
            selectedDays.length === 0 ||
            blockNameInput.value === ""
        ) {
            alert(
                "Будь ласка, заповніть усі поля та виберіть хоча б один день."
            );
            return;
        }

        // Функція для додавання запису
        addButton.addEventListener("click", async () => {
            const selectedDays = [];

            checkboxes.forEach((checkbox) => {
                if (checkbox.checked) {
                    selectedDays.push(
                        checkbox.nextElementSibling.getAttribute("data-day")
                    );
                }
            });


        const schedule_id = await createScheduleOnServer(
            1,
            blockNameInput.value,
            selectedDays,
            [{ start_time: startTime.value, end_time: endTime.value }]
        );

        createSchedule(
            schedule_id,
            blockNameInput.value,
            time_ranges,
            selectedDays
        );

        //TODO
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


var timerangesCount = 0;
const addTimerangeBtn = document.getElementById("addTimerangeBtn")
const timerangeForm = document.getElementById("timerange-form")

addTimerangeBtn.addEventListener("click", async () => {

    timerangesCount++

    const element = document.createElement('div')
    element.innerHTML = `
     <div class="form-group">
        <label for="startTime${timerangesCount}">З:</label>
        <input type="time" id="startTime${timerangesCount}" class="input" />
    </div>

    <div class="form-group">
        <label for="endTime${timerangesCount}">По:</label>
        <input type="time" id="endTime${timerangesCount}" class="input" />
    </div>
    `;

    timerangeForm.appendChild(element);

})






