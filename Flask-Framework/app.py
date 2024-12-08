# from crypt import methods
from flask import Flask, redirect, url_for, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from requests import session
from sqlalchemy import Column, null
from datetime import datetime, time
from enum import Enum


class LampMode(Enum):
    MANUAL = 0
    AUTOMATIC = 1
    SCHEDULE = 2


CURRENT_LAMP_ID = 1

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///lamps.sqlite3'
app.config['SQLALCHEMY_TRACK_MODAFICATIONS'] = False

db = SQLAlchemy(app)


# Модель конфігурації лампочок
class LampConfig(db.Model):
    __tablename__ = 'lamp_config'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    power_state = db.Column(db.Boolean, default=False, nullable=False)
    brightness = db.Column(db.Integer, nullable=True)
    mode = db.Column(db.Integer, nullable=True)

    # Зв'язок із таблицею статистики і розкладу
    stats = db.relationship('LampStats', backref='lamp', lazy=True)
    schedules = db.relationship('LampSchedules', backref='lamp', lazy=True)

    def __repr__(self):
        return f"<LampConfig State: {'On' if self.power_state else 'Off'}, Brightness: {self.brightness}, Mode: {self.mode}>"


# Модель статистики
class LampStats(db.Model):
    __tablename__ = 'lamp_stats'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    lamp_id = db.Column(db.Integer, db.ForeignKey(
        'lamp_config.id'), nullable=False)  # Зовнішній ключ
    time = db.Column(db.DateTime, default=datetime.now, nullable=False)
    brightness = db.Column(db.Integer, nullable=True)
    # Тип дії (on/off/brightness change)
    action = db.Column(db.String(50), nullable=False)

    def __repr__(self):
        return f"<LampStats LampID: {self.lamp_id}, Action: {self.action}, Time: {self.time}>"


# Модель розкладу
class LampSchedules(db.Model):
    __tablename__ = 'lamp_schedules'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    lamp_id = db.Column(db.Integer, db.ForeignKey(
        'lamp_config.id'), nullable=False)
    name = db.Column(db.String, nullable=False)
    # Зв'язок із днями розкладу
    days = db.relationship('ScheduleDay', backref='schedule',
                           cascade='all, delete-orphan', lazy=True)
    # Зв'язок із діапазонами часу
    time_ranges = db.relationship(
        'TimeRange', backref='schedule', cascade='all, delete-orphan', lazy=True)

    def __repr__(self):
        return f"<LampSchedules ID: {self.id}, LampID: {self.lamp_id}, Name: {self.name}, Days: {self.days}, TimeRanges: {self.time_ranges}>"


# Модель днів розкладу
class ScheduleDay(db.Model):
    __tablename__ = 'schedule_days'

    id = db.Column(db.Integer, primary_key=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey(
        'lamp_schedules.id'), nullable=False)
    # Наприклад: 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sun', 'Sat'
    day_of_week = db.Column(db.String, nullable=False)


# Модель діапазонів часу
class TimeRange(db.Model):
    __tablename__ = 'time_ranges'

    id = db.Column(db.Integer, primary_key=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey(
        'lamp_schedules.id'), nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)


# Додавання нового розкладу
@app.route('/lamps/<int:lamp_id>/schedules', methods=['POST'])
def create_schedule(lamp_id):
    lamp = db.session.get(LampConfig, lamp_id)
    data = request.json

    # Створення нового розкладу
    schedule = LampSchedules(lamp_id=lamp_id, name="Schedule")
    db.session.add(schedule)

    # Додавання днів
    for day_of_week in data.get('days', []):
        schedule_day = ScheduleDay(schedule=schedule, day_of_week=day_of_week)
        db.session.add(schedule_day)

    # Додавання діапазонів часу
    for time_range in data.get('time_ranges', []):
        try:
            start_time = time.fromisoformat(time_range['start_time'])
            end_time = time.fromisoformat(time_range['end_time'])
        except (ValueError, KeyError):
            return jsonify({'error': 'Invalid time format. Use HH:MM'}), 400

        time_range_entry = TimeRange(
            schedule=schedule, start_time=start_time, end_time=end_time)
        db.session.add(time_range_entry)

    db.session.commit()
    return jsonify({'message': 'Schedule created successfully'}), 201


# Отримання розкладу за айді
@app.route('/lamps/<int:lamp_id>/schedules', methods=['GET'])
def get_schedules(lamp_id):
    lamp = db.session.get(LampConfig, lamp_id)
    schedules = LampSchedules.query.filter_by(lamp_id=lamp.id).all()

    result = []
    for schedule in schedules:
        days = [day.day_of_week for day in schedule.days]
        time_ranges = [
            {
                'start_time': tr.start_time.strftime('%H:%M'),
                'end_time': tr.end_time.strftime('%H:%M')
            } for tr in schedule.time_ranges
        ]
        result.append({
            'schedule_id': schedule.id,
            'days': days,
            'time_ranges': time_ranges
        })

    return jsonify(result)


# Видалення розкладу за айді
@app.route('/schedules/<int:schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    schedule = db.session.get(LampSchedules, schedule_id)
    db.session.delete(schedule)
    db.session.commit()
    return jsonify({'message': 'Schedule deleted successfully'}), 200


@app.route("/lamps/<int:lamp_id>", methods=["PUT"])
def update_lamp(lamp_id):
    data = request.get_json()  # Отримати JSON-запит
    lamp = db.session.get(LampConfig, lamp_id)

    if not lamp:
        return jsonify({"error": "Lamp not found"}), 404

    # Оновлення стану лампочки
    lamp.power_state = data.get("power_state", lamp.power_state)
    lamp.brightness = data.get("brightness", lamp.brightness)
    lamp.mode = data.get("mode", lamp.mode)

    # Збереження змін у базі даних
    db.session.commit()

    return jsonify({"message": "Lamp updated successfully", "lamp": {
        "id": lamp.id,
        "power_state": lamp.power_state,
        "brightness": lamp.brightness,
        "mode": lamp.mode
    }})


# Отримання статистики
@app.route("/stats", methods=["GET"])
def get_stats():
    stats = LampStats.query.all()

    return jsonify([{
        "id": stat.id,
        "lamp_id": stat.lamp_id,
        "time": {
                    "year": stat.time.year,
                    "month": stat.time.month,
                    "day": stat.time.day,
                    "hour": stat.time.hour,
                    "minute": stat.time.minute
                    },
        "action": stat.action,
        "brightness": stat.brightness,
    } for stat in stats])


# Додавання статистики
@app.route("/stats/<int:lamp_id>", methods=["POST"])
def update_stats(lamp_id):
    lamp = db.session.get(LampConfig, lamp_id)
    data = request.get_json()

    action = data.get("action", "updated")
    stat = LampStats(lamp_id=lamp.id, action=action,
                     brightness=lamp.brightness)
    db.session.add(stat)
    db.session.commit()

    return jsonify({'message': 'Stats created successfully'}), 200


@app.route("/")
def home():
    # Check if record exists, and create it if not
    if db.session.get(LampConfig, CURRENT_LAMP_ID) is None:
        new_lamp = LampConfig(power_state=False, mode=0, brightness=50)
        db.session.add(new_lamp)
        db.session.commit()

        print("Default record created: ", new_lamp)
    else:
        # Отримати лампочку з ID
        lamp = db.session.get(LampConfig, CURRENT_LAMP_ID)
        print(lamp)
        for stat in lamp.stats:
            print(stat)
    return render_template("index.html")


@app.route("/jsonrequest")
def jsonrequest():
    # Read data from the data space from a specific id and store the read row "id" and "remote" columns in
    lamp = db.session.get(LampConfig, CURRENT_LAMP_ID)
    return jsonify({"ID": lamp.id, "MODE": lamp.mode, "POWER_STATE": lamp.power_state, "BRIGHTNESS": lamp.brightness})


# Сторінка для невалідних URL
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="localhost", debug=True)
