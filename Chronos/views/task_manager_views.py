from flask import Blueprint, render_template, request, redirect, url_for, jsonify, session
from datetime import datetime, date, timedelta
from sqlalchemy import or_

from models.app import db, Project, Task, Template, Tag, ProjectAttribute, TaskAttribute, TemplateAttribute
from views.utils import construct_context, check_parent_completion, handle_recurrence, copy_task_to_template, create_task_from_template
from core.auth import auth_required
from jinja_custom.app import JinjaScriptRunner

task_manager_bp = Blueprint('task_manager', __name__)

@task_manager_bp.route('/')
@auth_required()
def index():
    context = construct_context()
    return render_template('index.html', **context)

@task_manager_bp.route('/api/container/<page>')
def api_render(page):
    context = construct_context()

    if page=='content_task':
        return render_template('container/content_task.html', **context)
    elif page=='daily':
        return render_template('container/daily.html', **context)
    
    ##PAGE 404 A FAIRE
    return render_template('index.html', **context)

@task_manager_bp.route('/toggle_future_tasks', methods=['POST'])
def toggle_future_tasks():
    data = request.get_json()
    session['show_future'] = data.get('show_future', False)
    context = construct_context()
    return render_template('task_manager/tasks_tbody.html', **context)

@task_manager_bp.route('/get_tasks_tbody_html')
def get_tasks_tbody_html():
    context = construct_context()
    return render_template('task_manager/tasks_tbody.html', **context)

@task_manager_bp.route('/task/<int:task_id>')
def task_detail(task_id):
    task = Task.query.get_or_404(task_id)
    return redirect(url_for('task_manager.index'))

@task_manager_bp.route('/add', methods=['POST'])
def add_task():
    name = request.form['name']
    parent_id = request.form.get('parent_id') or None
    new_task = Task(name=name, parent_id=parent_id)
    
    # Handle new features from the modal
    new_task.status = request.form['status']
    new_task.priority = request.form['priority']
    new_task.progress = float(request.form['progress'])
    new_task.remark = request.form['remark']
    new_task.icon = request.form.get("icon", "").strip()
    new_task.description = request.form['description']
    new_task.script = request.form.get('script')
    start_date_str = request.form.get('start_date')
    start_time_str = request.form.get('start_time')
    if start_date_str:
        start_date_obj = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        if start_time_str:
            start_time_obj = datetime.strptime(start_time_str, '%H:%M').time()
            new_task.start_date = datetime.combine(start_date_obj, start_time_obj)
        else:
            new_task.start_date = datetime.combine(start_date_obj, datetime.min.time())
    else:
        new_task.start_date = None
    new_task.recurrence_rule = request.form.get('recurrence_rule')
    new_task.recurrence_day = int(request.form['recurrence_day']) if request.form.get('recurrence_day') else None
    new_task.recurrence_template = request.form.get('recurrence_template')
    project_id = request.form.get('project_id')
    if project_id:
        new_task.project_id = int(project_id)

    deadline_str = request.form.get('deadline')
    deadline_time_str = request.form.get('deadline_time')
    if deadline_str:
        deadline_date_obj = datetime.strptime(deadline_str, '%Y-%m-%d').date()
        if deadline_time_str:
            deadline_time_obj = datetime.strptime(deadline_time_str, '%H:%M').time()
            new_task.deadline = datetime.combine(deadline_date_obj, deadline_time_obj)
        else:
            new_task.deadline = datetime.combine(deadline_date_obj, datetime.min.time())
    else:
        new_task.deadline = None

    db.session.add(new_task)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify(success=False, error=str(e)), 500

    # Handle Tags for new task
    tag_names = [name.strip() for name in request.form.get('tags', '').split(',') if name.strip()]
    for tag_name in tag_names:
        tag = Tag.query.filter_by(name=tag_name).first()
        if not tag:
            tag = Tag(name=tag_name)
            db.session.add(tag)
        new_task.tags.append(tag)

    # Handle Attributes for new task
    attr_idx = 0
    while f'attr_name_{attr_idx}' in request.form:
        attr_name = request.form[f'attr_name_{attr_idx}']
        attr_value = request.form[f'attr_value_{attr_idx}']
        if attr_name:
            attr = TaskAttribute(name=attr_name, value=attr_value, task_id=new_task.id)
            db.session.add(attr)
        attr_idx += 1

    db.session.commit()
    return jsonify(success=True)

@task_manager_bp.route('/update/<int:task_id>', methods=['POST'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    task.name = request.form['name']
    task.status = request.form['status']
    task.priority = request.form['priority']
    if not task.children:
        task.progress = float(request.form['progress'])
    task.remark = request.form['remark']
    task.icon = request.form.get("icon", "").strip()
    task.description = request.form['description']
    task.script = request.form.get('script')
    parent_id = request.form.get('parent_id')
    task.parent_id = int(parent_id) if parent_id else None

    # New features
    start_date_str = request.form.get('start_date')
    start_time_str = request.form.get('start_time')
    if start_date_str:
        start_date_obj = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        if start_time_str:
            start_time_obj = datetime.strptime(start_time_str, '%H:%M').time()
            task.start_date = datetime.combine(start_date_obj, start_time_obj)
        else:
            task.start_date = datetime.combine(start_date_obj, datetime.min.time())
    else:
        task.start_date = None
    task.recurrence_rule = request.form.get('recurrence_rule')
    task.recurrence_day = int(request.form['recurrence_day']) if request.form.get('recurrence_day') else None
    task.recurrence_template = request.form.get('recurrence_template')
    project_id = request.form.get('project_id')
    task.project_id = int(project_id) if project_id else None

    deadline_str = request.form.get('deadline')
    deadline_time_str = request.form.get('deadline_time')
    if deadline_str:
        deadline_date_obj = datetime.strptime(deadline_str, '%Y-%m-%d').date()
        if deadline_time_str:
            deadline_time_obj = datetime.strptime(deadline_time_str, '%H:%M').time()
            task.deadline = datetime.combine(deadline_date_obj, deadline_time_obj)
        else:
            task.deadline = datetime.combine(deadline_date_obj, datetime.min.time())
    else:
        task.deadline = None

    # Handle Tags
    task.tags.clear()
    tag_names = [name.strip() for name in request.form.get('tags', '').split(',') if name.strip()]
    for tag_name in tag_names:
        tag = Tag.query.filter_by(name=tag_name).first()
        if not tag:
            tag = Tag(name=tag_name)
            db.session.add(tag)
        task.tags.append(tag)

    # Handle Attributes
    for attr in task.attributes_rel:
        db.session.delete(attr)
    
    attr_idx = 0
    while f'attr_name_{attr_idx}' in request.form:
        attr_name = request.form[f'attr_name_{attr_idx}']
        attr_value = request.form[f'attr_value_{attr_idx}']
        if attr_name:
            new_attr = TaskAttribute(name=attr_name, value=attr_value, task_id=task.id)
            db.session.add(new_attr)
        attr_idx += 1

    try:
        db.session.commit()
        return jsonify(success=True)
    except Exception as e:
        db.session.rollback()
        return jsonify(success=False, error=str(e)), 500

@task_manager_bp.route("/update_field/<int:task_id>", methods=["POST"])
def update_field(task_id):
    data = request.get_json()
    field = data.get("field")
    value = data.get("value")

    task = Task.query.get_or_404(task_id)

    if field == "status":
        task.status = value
        if value == 'Terminé':
            task.progress = 100
            check_parent_completion(task)
            handle_recurrence(task)
    elif field == "priority":
        task.priority = value
    else:
        return jsonify({"error": "Invalid field"}), 400

    db.session.commit()
    return jsonify(success=True)

@task_manager_bp.route("/update_project_field/<int:project_id>", methods=["POST"])
def update_project_field(project_id):
    data = request.get_json()
    field = data.get("field")
    value = data.get("value")

    project = Project.query.get_or_404(project_id)

    if field == "status":
        project.status = value
    elif field == "priority":
        project.priority = value
    else:
        return jsonify({"error": "Invalid field"}), 400

    db.session.commit()
    return jsonify(success=True)

@task_manager_bp.route('/reorder', methods=['POST'])
def reorder():
    data = request.get_json()
    reordered = data.get('reordered', [])

    for idx, item in enumerate(reordered):
        task = Task.query.get(item['id'])
        if task:
            task.parent_id = item['parent_id']
            task.order = idx

    db.session.commit()
    return jsonify(success=True)


@task_manager_bp.route('/delete/<int:task_id>', methods=['POST'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify(success=True, redirect_url=url_for('task_manager.index'))



@task_manager_bp.route('/api/reassign_task', methods=['POST'])
def reassign_task():
    data = request.get_json()
    task_id = data.get('task_id')
    new_parent_id = data.get('new_parent_id')

    task = Task.query.get_or_404(task_id)
    task.parent_id = new_parent_id

    db.session.commit()
    return jsonify(success=True)

@task_manager_bp.route('/api/assign_task_to_project', methods=['POST'])
def assign_task_to_project():
    data = request.get_json()
    task_id = data.get('task_id')
    project_id = data.get('project_id')

    task = Task.query.get_or_404(task_id)
    task.project_id = project_id

    db.session.commit()
    return jsonify(success=True)

@task_manager_bp.route('/run-all-scripts', methods=['POST'])
@auth_required()
def run_all_scripts_combined():
    # Run all task scripts
    tasks_with_scripts = Task.query.filter(Task.script.isnot(None)).all()
    task_successful_runs = 0
    task_failed_runs = 0
    task_errors = []

    for task in tasks_with_scripts:
        runner = JinjaScriptRunner(task)
        message, success = runner.run()
        if success:
            task_successful_runs += 1
        else:
            task_failed_runs += 1
            task_errors.append(f"Task {task.id} ('{task.name}'): {message}")

    # Run all project scripts
    projects_with_scripts = Project.query.filter(Project.script.isnot(None)).all()
    project_successful_runs = 0
    project_failed_runs = 0
    project_errors = []

    for project in projects_with_scripts:
        runner = JinjaScriptRunner(project)
        message, success = runner.run()
        if success:
            project_successful_runs += 1
        else:
            project_failed_runs += 1
            project_errors.append(f"Project {project.id} ('{project.name}'): {message}")

    total_successful = task_successful_runs + project_successful_runs
    total_failed = task_failed_runs + project_failed_runs
    all_errors = task_errors + project_errors

    if total_failed == 0:
        return jsonify(success=True, message=f"Scripts exécutés avec succès pour {total_successful} éléments (tâches: {task_successful_runs}, projets: {project_successful_runs}).")
    else:
        return jsonify(success=False, message=f"Scripts exécutés pour {total_successful} éléments, {total_failed} échecs. Détails: {all_errors}")

    return jsonify(success=True)

@task_manager_bp.route('/task/<int:task_id>/run-script', methods=['POST'])
@auth_required()
def run_task_script(task_id):
    task = Task.query.get_or_404(task_id)
    if not task.script:
        return jsonify(success=False, message="No script found for this task.")

    runner = JinjaScriptRunner(task)
    message, success = runner.run()
    
    return jsonify(success=success, message=message)

@task_manager_bp.route('/project/<int:project_id>/run-script', methods=['POST'])
@auth_required()
def run_project_script(project_id):
    project = Project.query.get_or_404(project_id)
    if not project.script:
        return jsonify(success=False, message="No script found for this project.")

    runner = JinjaScriptRunner(project)
    message, success = runner.run()

    return jsonify(success=success, message=message)