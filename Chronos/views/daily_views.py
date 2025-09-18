from flask import Blueprint, render_template, request, jsonify
from datetime import datetime, date, timedelta

from models.app import db, DailyReport, Task, Project
from views.utils import get_calendar_dates_data, construct_context

daily_bp = Blueprint('daily', __name__)

@daily_bp.route('/daily')
def daily_report():
    context = construct_context()
    return render_template('daily.html', **context)

@daily_bp.route("/api/daily-report", methods=["GET", "POST"])
def api_daily_report():
    if request.method == "GET":
        today = date.today()
        report = DailyReport.query.filter_by(user_id=1, report_date=today).first()
        return jsonify({"content": report.content if report else ""})

    if request.method == "POST":
        data = request.get_json()
        content = data.get("content", "")
        report_date_str = data.get("date")
        
        if report_date_str:
            try:
                report_date = datetime.strptime(report_date_str, "%Y-%m-%d").date()
            except ValueError:
                return jsonify({"error": "Invalid date format"}), 400
        else:
            report_date = date.today()

        report = DailyReport.query.filter_by(user_id=1, report_date=report_date).first()
        if report:
            report.content = content
        else:
            report = DailyReport(user_id=1, report_date=report_date, content=content)
            db.session.add(report)

        db.session.commit()
        return jsonify({"status": "saved"})

@daily_bp.route("/daily/date")
def get_daily_date():
    date_str = request.args.get("date")
    if not date_str:
        return "Date manquante", 400
    report_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    daily = db.session.query(DailyReport).filter_by(report_date=report_date).first()
    return daily.content if daily else ""

@daily_bp.route("/daily/search")
def search_daily():
    q = request.args.get("q", "")
    if len(q) < 2:
        return jsonify([])

    results = db.session.query(DailyReport).filter(DailyReport.content.ilike(f"%{q}%")).order_by(DailyReport.report_date.desc()).limit(10).all()
    return jsonify([{"date": d.report_date.isoformat(), "preview": d.content[:100]} for d in results])

@daily_bp.route('/daily/available-dates')
def available_dates():
    dates = db.session.query(DailyReport.report_date).all()
    dates_only = [d[0] for d in dates]
    return jsonify([d.strftime('%Y-%m-%d') for d in dates_only])

@daily_bp.route('/get_urgent_tasks_html')
def get_urgent_tasks_html():
    today = date.today()
    two_days_from_now = today + timedelta(days=2)

    # Tâches et projets prioritaires
    priority_urgent_tasks = Task.query.filter(Task.status != "Terminé", Task.priority=='04 - Urgent').all()
    priority_urgent_projects = Project.query.filter(Project.status != "Terminé", Project.priority=='04 - Urgent').all()

    # Tâches et projets avec échéance proche
    deadline_tasks = Task.query.filter(
        Task.status != "Terminé",
        (Task.deadline <= today) | ((Task.deadline > today) & (Task.deadline <= two_days_from_now))
    ).all()

    deadline_projects = Project.query.filter(
        Project.status != "Terminé",
        (Project.deadline <= today) | ((Project.deadline > today) & (Project.deadline <= two_days_from_now))
    ).all()

    # Combine all items
    all_items = priority_urgent_tasks + priority_urgent_projects + deadline_tasks + deadline_projects

    # --- Filtrer les tâches dont le parent ou le projet est déjà dans la liste ---
    projects_in_list = {p.id for p in all_items if isinstance(p, Project)}
    tasks_in_list = {t.id for t in all_items if isinstance(t, Task)}

    filtered_items = []
    for item in all_items:
        if isinstance(item, Task):
            # ignorer la task si son parent ou son projet est déjà présent
            parent_id = item.parent_id
            project_id = item.project_id
            if parent_id in tasks_in_list or project_id in projects_in_list:
                continue
        filtered_items.append(item)

    # Tri par deadline
    urgent_items = sorted(filtered_items, key=lambda x: x.deadline.date() if x.deadline else date.max)

    # Limite à 5
    urgent_items = urgent_items[:5]

    return render_template('partials/urgent_tasks_list.html', urgent_tasks=urgent_items)


@daily_bp.route('/api/calendar_dates')
def get_calendar_dates():
    return jsonify(get_calendar_dates_data())

@daily_bp.route('/api/tasks_for_date/<string:date_str>')
def tasks_for_date(date_str):
    selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()

    tasks = Task.query.filter(
        (db.func.date(Task.start_date) == selected_date) | (db.func.date(Task.deadline) == selected_date)
    ).all()

    projects = Project.query.filter(
        (db.func.date(Project.start_date) == selected_date) | (db.func.date(Project.deadline) == selected_date)
    ).all()

    items = sorted(tasks + projects, key=lambda x: x.name)

    return render_template('daily_tasks.html', items=items, selected_date=selected_date.strftime('%Y-%m-%d'))