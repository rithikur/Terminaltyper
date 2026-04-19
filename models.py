from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class TypingResult(db.Model):
    __tablename__ = 'typing_results'

    id          = db.Column(db.Integer, primary_key=True)
    wpm         = db.Column(db.Float, nullable=False)
    raw_wpm     = db.Column(db.Float, nullable=False, default=0)
    accuracy    = db.Column(db.Float, nullable=False)
    consistency = db.Column(db.Float, nullable=False, default=100)
    mode        = db.Column(db.String(50), nullable=False)   # standard | game | code
    duration    = db.Column(db.Integer, nullable=False)      # seconds
    timestamp   = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':          self.id,
            'wpm':         round(self.wpm, 1),
            'raw_wpm':     round(self.raw_wpm or 0, 1),
            'accuracy':    round(self.accuracy, 1),
            'consistency': round(self.consistency or 100, 1),
            'mode':        self.mode,
            'duration':    self.duration,
            'timestamp':   self.timestamp.strftime('%Y-%m-%d %H:%M'),
        }


class UserPreference(db.Model):
    __tablename__ = 'user_preferences'

    id    = db.Column(db.Integer, primary_key=True)
    key   = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.String(255), nullable=False)

    @classmethod
    def get(cls, key, default=None):
        pref = cls.query.filter_by(key=key).first()
        return pref.value if pref else default

    @classmethod
    def set(cls, key, value):
        pref = cls.query.filter_by(key=key).first()
        if pref:
            pref.value = value
        else:
            pref = cls(key=key, value=value)
            db.session.add(pref)
        db.session.commit()
