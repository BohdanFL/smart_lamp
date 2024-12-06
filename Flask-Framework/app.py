# from crypt import methods
from flask import Flask, redirect, url_for, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from requests import session
from sqlalchemy import Column, null
from datetime import datetime

CURRENT_LAMP_ID = 1

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///lamps.sqlite3'
app.config['SQLALCHEMY_TRACK_MODAFICATIONS'] = False

db = SQLAlchemy(app)

# Таблиця для конфігурації лампочок


class lampConfig(db.Model):
    __tablename__ = 'lamp_config'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    power_state = db.Column(db.Boolean, default=False, nullable=False)
    brightness = db.Column(db.Integer, nullable=True)
    mode = db.Column(db.Integer, nullable=True)

    # Зв'язок із таблицею статистики
    stats = db.relationship('lampStats', backref='lamp', lazy=True)
    schedules = db.relationship('lampSchedule', backref='lamp', lazy=True)

    def __repr__(self):
        return f"<LampConfig State: {'On' if self.power_state else 'Off'}, Brightness: {self.brightness}, Mode: {self.mode}>"


# Таблиця для статистики
class lampStats(db.Model):
    __tablename__ = 'lamp_stats'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    lamp_id = db.Column(db.Integer, db.ForeignKey(
        'lamp_config.id'), nullable=False)  # Зовнішній ключ
    timestamp = db.Column(db.DateTime, default=datetime.now, nullable=False)
    # Тип дії (on/off/brightness change)
    action = db.Column(db.String(50), nullable=False)

    def __repr__(self):
        return f"<LampStats LampID: {self.lamp_id}, Action: {self.action}, Timestamp: {self.timestamp}>"


class lampSchedule(db.Model):
    __tablename__ = 'lamp_schedule'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(50), nullable=False)
    lamp_id = db.Column(db.Integer, db.ForeignKey(
        'lamp_config.id'), nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)

    def __repr__(self):
        return f"<LampSchedule LampID: {self.lamp_id}, Start: {self.start_time}, End: {self.end_time}>"

# Додавання нового розкладу


@app.route("/add_schedule", methods=["POST"])
def add_schedule():
    pass


@app.route("/stats")
def get_stats():
    stats = lampStats.query.all()

    return jsonify([{
        "id": stat.id,
        "lamp_id": stat.lamp_id,
        "timestamp": stat.timestamp,
        "action": stat.action
    } for stat in stats])


# Отримання розкладу за айді
@app.route("/get_schedules/<int:lamp_id>", methods=["GET"])
def get_schedules(lamp_id):
    schedules = lampSchedule.query.filter_by(lamp_id=lamp_id).all()

    return jsonify([{
        "id": schedule.id,
        "start_time": schedule.start_time.strftime('%H:%M:%S'),
        "end_time": schedule.end_time.strftime('%H:%M:%S'),
        "action": schedule.action
    } for schedule in schedules])


# Видалення розкладу за айді
@app.route("/delete_schedule/<int:schedule_id>", methods=["DELETE"])
def delete_schedule(schedule_id):
    try:
        # Знаходимо розклад за ID
        schedule = lampSchedule.query.get(schedule_id)

        # Перевіряємо, чи існує такий запис
        if not schedule:
            return jsonify({"message": "Schedule not found"}), 404

        # Видаляємо запис
        db.session.delete(schedule)
        db.session.commit()

        return jsonify({"message": f"Schedule with ID {schedule_id} deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()  # У разі помилки відкат транзакції
        return jsonify({"message": f"Error occurred: {str(e)}"}), 500


@app.route("/update_lamp", methods=["PUT"])
def update_lamp():
    data = request.get_json()  # Отримати JSON-запит
    lamp = db.session.get(lampConfig, CURRENT_LAMP_ID)

    if not lamp:
        return jsonify({"error": "Lamp not found"}), 404

    # Оновлення стану лампочки
    lamp.power_state = data.get("power_state", lamp.power_state)
    lamp.brightness = data.get("brightness", lamp.brightness)
    lamp.mode = data.get("mode", lamp.mode)

    # Збереження змін у базі даних
    db.session.commit()

    # Додавання статистики
    action = data.get("action", "updated")
    new_stat = lampStats(lamp_id=lamp.id, action=action)
    db.session.add(new_stat)
    db.session.commit()

    return jsonify({"message": "Lamp updated successfully", "lamp": {
        "id": lamp.id,
        "power_state": lamp.power_state,
        "brightness": lamp.brightness,
        "mode": lamp.mode
    }})

# In order to find the page below it should have a root
# "/" This is the path we are going to use to reach the page below

# Define a home page


@app.route("/", methods=["GET", "POST"])
def home():
    # Check if record exists, and create it if not
    if db.session.get(lampConfig, CURRENT_LAMP_ID) is None:
        new_lamp = lampConfig(power_state=False, mode=0, brightness=50)
        db.session.add(new_lamp)
        db.session.commit()

        new_stat = lampStats(lamp_id=new_lamp.id, action="turned on")
        db.session.add(new_stat)
        db.session.commit()

        print("Default record created: ", new_lamp)
        print(new_stat)
    else:
        # Отримати лампочку з ID
        lamp = db.session.get(lampConfig, CURRENT_LAMP_ID)
        print(lamp)
        for stat in lamp.stats:
            print(stat)
    return render_template("index.html")


@app.route("/jsonrequest")
def jsonrequest():
    # Read data from the data space from a specific id and store the read row "id" and "remote" columns in
    lamp = lampConfig.query.get(lampConfig, CURRENT_LAMP_ID)
    return jsonify({"ID": lamp.id, "MODE": lamp.mode, "POWER_STATE": lamp.power_state, "BRIGHTNESS": lamp.brightness})


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="localhost")
