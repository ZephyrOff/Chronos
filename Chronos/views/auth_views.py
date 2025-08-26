from flask import Blueprint, request, jsonify, make_response, render_template, redirect, url_for
from models.user import User
from models.app import db
from core.auth import generate_token, auth_required, verify_token

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        user = User.query.filter_by(username=username).first()

        if user and user.check_password(password):
            token = generate_token(user.id, user.role)
            response = make_response(jsonify({'message': 'Logged in'}))
            response.set_cookie('chronos_key', token)
            return response

        return jsonify({'message': 'Invalid credentials'}), 401
    return render_template('login.html')

@auth_bp.route('/logout')
def logout():
    response = make_response(redirect(url_for('auth_bp.login')))
    response.delete_cookie('chronos_key')
    return response

@auth_bp.route('/change-password', methods=['POST'])
@auth_required()
def change_password():
    token = request.cookies.get('chronos_key')
    payload = verify_token(token)
    user_id = payload.get('user_id')

    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404

    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if not user.check_password(current_password):
        return jsonify({'success': False, 'message': 'Mot de passe actuel incorrect.'}), 400

    user.set_password(new_password)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Mot de passe changé avec succès.'}), 200
