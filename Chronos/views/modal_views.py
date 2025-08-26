from flask import Blueprint, render_template, request, jsonify, url_for
from datetime import datetime

from models.app import db, Task, Project, Template, Tag, ProjectAttribute, TaskAttribute, TemplateAttribute, ScriptTemplate
from views.utils import construct_context, copy_task_to_template, create_task_from_template

modal_bp = Blueprint('modal', __name__)


@modal_bp.route('/create_template', methods=['POST'])
def create_template():
    task_id = request.form.get('task_id')
    template_name = request.form.get('template_name')

    if not template_name:
        return jsonify(success=False, error="Le nom du modèle est requis."), 400

    if Template.query.filter_by(name=template_name).first():
        return jsonify(success=False, error="Un modèle avec ce nom existe déjà."), 400

    if task_id:
        task = Task.query.get_or_404(task_id)
        new_template = copy_task_to_template(task)
        new_template.name = template_name # Override with user-provided name
    else:
        # Create an empty template if no task is selected
        new_template = Template(name=template_name)
        db.session.add(new_template)

    db.session.commit()
    return jsonify(success=True)

@modal_bp.route('/add_from_template', methods=['POST'])
def add_from_template():
    template_id = request.form.get('template_id')
    task_name = request.form.get('task_name')
    reset_priority = request.form.get('reset_priority') == 'true'

    template = Template.query.get_or_404(template_id)

    new_task = create_task_from_template(template, reset_priority=reset_priority)
    if task_name:
        new_task.name = task_name

    db.session.commit()
    return jsonify(success=True)

@modal_bp.route('/manage_templates_form')
def manage_templates_form():
    templates = Template.query.filter_by(parent_id=None).order_by(Template.name).all()
    return render_template('modal/manage_templates_modal.html', templates=templates)

@modal_bp.route('/add_from_template_form')
def add_from_template_form():
    templates = Template.query.filter_by(parent_id=None).order_by(Template.name).all()
    return render_template('modal/add_from_template_modal.html', templates=templates)

@modal_bp.route('/create_template_form')
def create_template_form():
    tasks = Task.query.filter_by(parent_id=None).order_by(Task.name).all()
    return render_template('modal/create_template_modal.html', tasks=tasks)

@modal_bp.route('/template/<int:template_id>/delete', methods=['POST'])
def delete_template(template_id):
    template = Template.query.get_or_404(template_id)
    db.session.delete(template)
    db.session.commit()
    return jsonify(success=True, redirect_url=url_for('modal.manage_templates_form'))

@modal_bp.route('/modal/manage_scripts_form')
def manage_scripts_form():
    script_templates = ScriptTemplate.query.order_by(ScriptTemplate.name).all()
    return render_template('modal/manage_scripts_modal.html', script_templates=script_templates)

@modal_bp.route('/create_script', methods=['POST'])
def create_script():
    script_name = request.form.get('script_name')
    script_content = request.form.get('script_content')

    if not script_name:
        return jsonify(success=False, error="Le nom du script est requis."), 400

    if ScriptTemplate.query.filter_by(name=script_name).first():
        return jsonify(success=False, error="Un script avec ce nom existe déjà."), 400

    new_script_template = ScriptTemplate(name=script_name, script_content=script_content)
    db.session.add(new_script_template)
    db.session.commit()
    return jsonify(success=True)

@modal_bp.route('/create_script_form')
def create_script_form():
    return render_template('modal/create_script_modal.html')

@modal_bp.route('/script/<int:script_id>/edit', methods=['GET'])
def edit_script_form(script_id):
    script_template = ScriptTemplate.query.get_or_404(script_id)
    return render_template('modal/edit_script_modal.html', script_template=script_template)

@modal_bp.route('/script/<int:script_id>/update', methods=['POST'])
def update_script(script_id):
    script_template = ScriptTemplate.query.get_or_404(script_id)
    script_template.name = request.form.get('script_name')
    script_template.script_content = request.form.get('script_content')

    if not script_template.name:
        return jsonify(success=False, error="Le nom du script est requis."), 400

    # Check for duplicate name if name has changed
    existing_script = ScriptTemplate.query.filter_by(name=script_template.name).first()
    if existing_script and existing_script.id != script_template.id:
        return jsonify(success=False, error="Un script avec ce nom existe déjà."), 400

    db.session.commit()
    return jsonify(success=True)

@modal_bp.route('/script/<int:script_id>/delete', methods=['POST'])
def delete_script(script_id):
    script_template = ScriptTemplate.query.get_or_404(script_id)
    db.session.delete(script_template)
    db.session.commit()
    return jsonify(success=True, redirect_url=url_for('modal.manage_scripts_form'))

@modal_bp.route('/project/<int:project_id>/edit', methods=['GET'])
def edit_project_form(project_id):
    context = construct_context()

    context['project'] = Project.query.get_or_404(project_id)
    return render_template('modal/project_edit_modal.html', **context)

@modal_bp.route('/project/<int:project_id>/update', methods=['POST'])
def update_project(project_id):
    project = Project.query.get_or_404(project_id)
    project.name = request.form['name']
    project.icon = request.form.get('icon', '').strip()
    project.status = request.form['status']
    project.priority = request.form['priority']
    project.description = request.form.get('description', '')
    project.start_date = datetime.strptime(request.form['start_date'], '%Y-%m-%d').date() if request.form.get('start_date') else None
    project.deadline = datetime.strptime(request.form['deadline'], '%Y-%m-%d').date() if request.form.get('deadline') else None
    project.script = request.form.get('script')

    # Handle Tags
    project.tags.clear()
    tag_names = [name.strip() for name in request.form.get('tags', '').split(',') if name.strip()]
    for tag_name in tag_names:
        tag = Tag.query.filter_by(name=tag_name).first()
        if not tag:
            tag = Tag(name=tag_name)
            db.session.add(tag)
        project.tags.append(tag)

    # Handle Attributes
    for attr in project.attributes:
        db.session.delete(attr)
    
    attr_idx = 0
    while f'attr_name_{attr_idx}' in request.form:
        attr_name = request.form[f'attr_name_{attr_idx}']
        attr_value = request.form[f'attr_value_{attr_idx}']
        if attr_name:
            new_attr = ProjectAttribute(name=attr_name, value=attr_value, project_id=project.id)
            db.session.add(new_attr)
        attr_idx += 1

    db.session.commit()
    return jsonify(success=True)

@modal_bp.route('/project/<int:project_id>/delete', methods=['POST'])
def delete_project(project_id):
    project = Project.query.get_or_404(project_id)
    db.session.delete(project)
    db.session.commit()
    return jsonify(success=True)

@modal_bp.route('/add_project_form', methods=['GET'])
def add_project_form():
    context = construct_context()
    return render_template('modal/project_add_modal.html', **context)

@modal_bp.route('/add_project', methods=['POST'])
def add_project():
    name = request.form['name']
    icon = request.form.get('icon', '🚀').strip()
    
    new_project = Project(
        name=name,
        icon=icon,
        status=request.form['status'],
        priority=request.form['priority'],
        description=request.form.get('description', ''),
        script=request.form.get('script', ''),
        start_date=datetime.strptime(request.form['start_date'], '%Y-%m-%d').date() if request.form.get('start_date') else None,
        deadline=datetime.strptime(request.form['deadline'], '%Y-%m-%d').date() if request.form.get('deadline') else None
    )
    db.session.add(new_project)
    db.session.flush() # Flush to get new_project.id for attributes/tags

    # Handle Tags
    tag_names = [name.strip() for name in request.form.get('tags', '').split(',') if name.strip()]
    for tag_name in tag_names:
        tag = Tag.query.filter_by(name=tag_name).first()
        if not tag:
            tag = Tag(name=tag_name)
            db.session.add(tag)
        new_project.tags.append(tag)

    # Handle Attributes
    attr_idx = 0
    while f'attr_name_{attr_idx}' in request.form:
        attr_name = request.form[f'attr_name_{attr_idx}']
        attr_value = request.form[f'attr_value_{attr_idx}']
        if attr_name:
            new_attr = ProjectAttribute(name=attr_name, value=attr_value, project_id=new_project.id)
            db.session.add(new_attr)
        attr_idx += 1

    db.session.commit()
    return jsonify(success=True)

@modal_bp.route('/add_task_form', methods=['GET'])
def add_task_form():
    context = construct_context()
    # Create a dummy empty task for the form
    new_task = Task(name="")
    # Pass empty lists for tags and attributes
    new_task.tags = []
    new_task.attributes = []

    context['task'] = new_task
    script_templates = ScriptTemplate.query.order_by(ScriptTemplate.name).all()

    return render_template('modal/task_edit_modal.html', script_templates=script_templates, **context)


@modal_bp.route('/task/<int:task_id>/edit', methods=['GET'])
def edit_task_form(task_id):
    context = construct_context()

    task = Task.query.get_or_404(task_id)
    context['task'] = task
    script_templates = ScriptTemplate.query.order_by(ScriptTemplate.name).all()

    return render_template('modal/task_edit_modal.html', script_templates=script_templates, **context)


@modal_bp.route('/get_task_dynamic_fields/<int:task_id>', methods=['GET'])
def get_task_dynamic_fields(task_id):
    context = construct_context()

    task = Task.query.get_or_404(task_id)
    context['task'] = task

    return render_template('partials/task_fields.html', **context)


@modal_bp.route('/get_project_dynamic_fields/<int:project_id>', methods=['GET'])
def get_project_dynamic_fields(project_id):
    context = construct_context()

    context['project'] = Project.query.get_or_404(project_id)
    return render_template('partials/project_fields.html', **context)