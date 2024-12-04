# from crypt import methods
from flask import Flask, redirect, url_for, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from requests import session
from sqlalchemy import Column, null
app = Flask(__name__)
# config is the name of data base table
# Configuring SQLALCHEMY parameters
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///configDB.sqlite3'
app.config['SQLALCHEMY_TRACK_MODAFICATIONS'] = False

db = SQLAlchemy(app)
# configure a database module


class configDB(db.Model):
    # Columns are information types and rows are the unique data
    # every row will have a unique "value" and this id is an integer (db.Integer) and activate that adressing feature (primary_key=True)
    id = db.Column(db.Integer, primary_key=True)
    Remote = db.Column(db.String(50))

    def __INIT__(self, Remote):
        self.Remote = Remote

# In order to find the page below it should have a root
# "/" This is the path we are going to use to reach the page below

# Define a home page


@app.route("/", methods=["GET", "POST"])
def home():
    # Check if record with id=1 exists, and create it if not
    if configDB.query.filter_by(id=1).first() is None:
        default_value = configDB(id=1, Remote="Initial Value")
        db.session.add(default_value)
        db.session.commit()
        print("Default record created with id=1")

    if request.method == "POST":
        value = request.form["obtained"]
        newValue = configDB.query.filter_by(id=1).first()
        if newValue:
            newValue.Remote = value
            print("After")
            print("Remote Value: ", newValue.Remote)
            print("Id: ", newValue.id)
            db.session.commit()
            return render_template("index.html", value=newValue.Remote)
        else:
            print("No record found with id=1")
            return render_template("index.html", value="No data found")

    else:
        memValue = configDB.query.filter_by(id=1).first()
        if memValue:
            print(memValue.Remote)
            return render_template("index.html", value=memValue.Remote)
        else:
            print("No record found with id=1")
            return render_template("index.html", value="No data found")


@app.route("/jsonrequest")
def jsonrequest():
    # Read data from the data space from a specific id and store the read row "id" and "remote" columns in
    newValue = configDB.query.filter_by(id=1).first()
    return jsonify({"ID": newValue.id, "Value": newValue.Remote})


@app.route("/test")
def test():
    return render_template("test.html")


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="192.168.0.2")
