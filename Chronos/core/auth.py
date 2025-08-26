import __main__
import jwt
from functools import wraps
from flask import request, redirect, url_for, current_app
from models.user import User

import hashlib
import secrets
import uuid
import time
import datetime


def get_token():
    return hashlib.sha512(secrets.token_bytes(48)).hexdigest()


def generate_token(user_id, role):
    if not hasattr(__main__, 'auth_cache'):
        __main__.auth_cache = {}

    sub = str(uuid.uuid4())

    iat = int(time.time())
    iss = "Chronos"

    not_before_time = datetime.datetime.utcnow()
    expiration_time = not_before_time + datetime.timedelta(minutes=3600)

    token = get_token()

    payload = {
        'sub': sub,
        "iat": iat,
        'exp': expiration_time,
        'nbf': not_before_time,
        'iss': iss,
        "token": token,
    }

    __main__.auth_cache[token] = {"user_id": user_id, "role": role}


    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')


def verify_token():
    if not hasattr(__main__, 'auth_cache'):
        __main__.auth_cache = {}

    token = request.cookies.get('chronos_key')
    if not token:
        return None

    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])

        if payload['token'] not in __main__.auth_cache:
            return None

        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_user_id():
    payload = verify_token()
    if payload:
        return __main__.auth_cache[payload['token']]['user_id']

    else:
        return None


def get_username():
    user_id = get_user_id()
    if user_id:
        user = User.query.filter_by(id=user_id).first()
        if user:
            return user.username

    return None


def get_role():
    user_id = get_user_id()
    if user_id:
        user = User.query.filter_by(id=user_id).first()
        if user:
            return user.role

    return None



def auth_required(required_roles=None):
    if not hasattr(__main__, 'auth_cache'):
        __main__.auth_cache = {}

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not __main__.backend.auth_required:
                return f(*args, **kwargs)

            payload = verify_token()
            if not payload:
                return redirect(url_for('auth_bp.login'))

            if required_roles:
                user_role = __main__.auth_cache[payload.get('token')]['role']

                if user_role not in required_roles:
                    return redirect(url_for('auth_bp.login'))

            return f(*args, **kwargs)
        return decorated_function
    return decorator
