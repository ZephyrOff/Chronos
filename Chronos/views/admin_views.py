from flask import Blueprint, render_template, request, redirect, url_for, flash
from models.user import User
from models.app import db
from core.auth import auth_required
import __main__

admin_bp = Blueprint('admin_bp', __name__, template_folder='templates')

@admin_bp.route('/admin')
@auth_required(required_roles=['admin'])
def admin_panel():
    users = User.query.all()
    banned_ips = []
    if hasattr(__main__, 'backend') and hasattr(__main__.backend, 'protect'):
        banned_ips = __main__.backend.protect.get_banned_ips()
    return render_template('admin/user_management.html', users=users, banned_ips=banned_ips)

@admin_bp.route('/admin/add_user', methods=['POST'])
@auth_required(required_roles=['admin'])
def add_user():
    username = request.form.get('username')
    password = request.form.get('password')
    role = request.form.get('role')

    if not username or not password or not role:
        flash('All fields are required!', 'danger')
        return redirect(url_for('admin_bp.admin_panel'))

    new_user = User(username=username, role=role)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    flash('User added successfully!', 'success')
    return redirect(url_for('admin_bp.admin_panel'))

@admin_bp.route('/admin/edit_user/<int:user_id>', methods=['POST'])
@auth_required(required_roles=['admin'])
def edit_user(user_id):
    user = User.query.get_or_404(user_id)
    username = request.form.get('username')
    role = request.form.get('role')

    if not username or not role:
        flash('Username and role are required!', 'danger')
        return redirect(url_for('admin_bp.admin_panel'))

    user.username = username
    user.role = role
    db.session.commit()
    flash('User updated successfully!', 'success')
    return redirect(url_for('admin_bp.admin_panel'))

@admin_bp.route('/admin/delete_user/<int:user_id>')
@auth_required(required_roles=['admin'])
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    flash('User deleted successfully!', 'success')
    return redirect(url_for('admin_bp.admin_panel'))

@admin_bp.route('/admin/unban_ip', methods=['POST'])
@auth_required(required_roles=['admin'])
def unban_ip():
    import __main__
    ip_to_unban = request.form.get('ip_address')
    if not ip_to_unban:
        flash('IP address is required!', 'danger')
        return redirect(url_for('admin_bp.admin_panel'))

    if hasattr(__main__, 'backend') and hasattr(__main__.backend, 'protect'):
        if __main__.backend.protect.unban_ip(ip_to_unban):
            flash(f'IP {ip_to_unban} has been unbanned successfully!', 'success')
        else:
            flash(f'IP {ip_to_unban} was not found in the ban list.', 'info')
    else:
        flash('Auto-protection system is not enabled or available.', 'warning')

    return redirect(url_for('admin_bp.admin_panel'))
