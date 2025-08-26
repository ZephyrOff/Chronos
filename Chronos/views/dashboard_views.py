from flask import Blueprint, render_template
from datetime import datetime, timedelta
from models.app import db, Task, Project
from core.auth import auth_required
import json

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/api/container/dashboard')
@auth_required()
def dashboard():
    today = datetime.now().date()
    # Calculate start of the current week (Monday)
    start_of_week = today - timedelta(days=today.weekday())
    end_of_week = start_of_week + timedelta(days=6)

    # --- Weekly Stats ---
    tasks_started_this_week = Task.query.filter(
        Task.created_at >= start_of_week,
        Task.created_at <= end_of_week
    ).count()

    tasks_completed_this_week = Task.query.filter(
        Task.status == 'Terminé',
        Task.updated_at >= start_of_week,
        Task.updated_at <= end_of_week
    ).count()

    tasks_in_progress_this_week = Task.query.filter(
        Task.status == 'En cours',
        Task.updated_at >= start_of_week,
        Task.updated_at <= end_of_week
    ).count()

    # --- Overall Stats ---
    total_tasks = Task.query.count()
    total_projects = Project.query.count()

    tasks_by_status = db.session.query(Task.status, db.func.count(Task.id)).group_by(Task.status).all()
    tasks_by_priority = db.session.query(Task.priority, db.func.count(Task.id)).group_by(Task.priority).all()

    # --- Upcoming Deadlines (next 7 days) ---
    upcoming_deadlines = Task.query.filter(
        Task.deadline >= today,
        Task.deadline <= today + timedelta(days=7),
        Task.status != 'Terminé'
    ).order_by(Task.deadline).all()

    # --- Overdue Tasks ---
    overdue_tasks = Task.query.filter(
        Task.deadline < today,
        Task.status != 'Terminé'
    ).all()

    context = {
        'start_of_week': start_of_week,
        'end_of_week': end_of_week,
        'tasks_started_this_week': tasks_started_this_week,
        'tasks_completed_this_week': tasks_completed_this_week,
        'tasks_in_progress_this_week': tasks_in_progress_this_week,
        'total_tasks': total_tasks,
        'total_projects': total_projects,
        'tasks_by_status_json': json.dumps(dict(tasks_by_status)),
        'tasks_by_priority_json': json.dumps(dict(tasks_by_priority)),
        'upcoming_deadlines': upcoming_deadlines,
        'overdue_tasks': overdue_tasks,
        'upcoming_deadlines_json': [t.to_dict() for t in upcoming_deadlines],
        'overdue_tasks_json': [t.to_dict() for t in overdue_tasks],
    }

    return render_template('container/dashboard.html', **context)
