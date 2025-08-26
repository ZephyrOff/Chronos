from flask import session
from sqlalchemy import or_
from datetime import datetime, date, timedelta
import calendar
from flask import session, request, current_app
from sqlalchemy import or_
from views.config import priority_list, status_list, recurrence_list
from datetime import datetime, date, timedelta
import calendar
from models.app import db, Task, Project, Template, DailyReport, Tag, ProjectAttribute, TaskAttribute, TemplateAttribute
from models.user import User
from core.auth import verify_token
from core.auth import get_username, get_role
import __main__


def construct_context():
    context = {}

    # Read show_future from session, default to False
    show_future = session.get('show_future', False)

    today = date.today()

    # Fetch all projects
    projects = Project.query.order_by(Project.order).all()

    # Fetch top-level tasks that don't belong to any project
    tasks_query = Task.query.filter(Task.parent_id.is_(None), Task.project_id.is_(None))

    if not show_future:
        tasks_query = tasks_query.filter(or_(db.func.date(Task.start_date) <= today, Task.start_date.is_(None)))

        # A VOIR
        for p in projects:
            p.tasks = [task for task in p.tasks if not task.start_date or task.start_date.date() <= today]
        # A VOIR


    tasks_no_project = tasks_query.order_by(Task.order, db.func.date(Task.start_date)).all()

    # Combine projects and tasks for rendering
    items = sorted(projects + tasks_no_project, key=lambda x: x.order)

    templates = Template.query.filter_by(parent_id=None).order_by(Template.name).all()


    # Get dates with tasks for the calendar
    dates_with_tasks = get_calendar_dates_data()

    # Get urgent tasks and projects
    urgent_tasks = Task.query.filter_by(priority='04 - Urgent').order_by(db.func.date(Task.deadline)).all()
    urgent_projects = Project.query.filter_by(priority='04 - Urgent').order_by(db.func.date(Project.deadline)).all()
    

    # Combine and sort them by deadline
    urgent_items = sorted(urgent_tasks + urgent_projects, key=lambda x: (x.deadline.date() if isinstance(x.deadline, datetime) else x.deadline) or date.max)
    
    # Serialize them for the template
    urgent_items_serializable = [item.to_dict() for item in urgent_items[:5]]
    
    context = {
        "admin_enable": __main__.backend.admin_enable, 
        "items": items, 
        "templates": templates,
        "priority_list": priority_list,
        "status_list": status_list,
        "today": today,
        "show_future": show_future,
        "dates_with_tasks": dates_with_tasks,
        "urgent_tasks": urgent_items_serializable,
        "all_tasks": Task.query.order_by(Task.name).all(),
        "all_tags": Tag.query.order_by(Tag.name).all(),
        "recurrence_list": recurrence_list,
        "all_projects": Project.query.order_by(Project.name).all(),
        "username": get_username(),
        "role": get_role(),
    }

    return context


def copy_task_to_template(task, parent_template_id=None):
    """Recursively copies a task structure to the template tables."""
    new_template = Template(
        name=task.name,
        parent_id=parent_template_id,
        priority=task.priority,
        remark=task.remark,
        description=task.description,
        icon=task.icon,
        status=task.status,
        script=task.script
    )
    db.session.add(new_template)
    db.session.flush()

    for tag in task.tags:
        new_template.tags.append(tag)
    
    for attr in task.attributes_rel:
        new_attr = TemplateAttribute(name=attr.name, value=attr.value, template_id=new_template.id)
        db.session.add(new_attr)

    for child_task in task.children:
        copy_task_to_template(child_task, parent_template_id=new_template.id)

    return new_template


def create_task_from_template(template, parent_id=None, reset_priority=False):
    """Recursively creates a task structure from a template."""
    new_task = Task(
        name=template.name,
        parent_id=parent_id,
        status='À commencer' if reset_priority else template.status,
        progress=0.0,
        priority='—' if reset_priority else template.priority,
        remark=template.remark,
        description=template.description,
        icon=template.icon,
        script=template.script
    )
    db.session.add(new_task)
    db.session.flush()

    for tag in template.tags:
        new_task.tags.append(tag)

    for attr in template.attributes:
        new_attr = TaskAttribute(name=attr.name, value=attr.value, task_id=new_task.id)
        db.session.add(new_attr)

    for child_template in template.children:
        create_task_from_template(child_template, parent_id=new_task.id, reset_priority=reset_priority)

    return new_task


def check_parent_completion(task):
    parent = task.parent
    if not parent:
        return

    all_siblings_done = all(sibling.status == 'Terminé' for sibling in parent.children)
    
    if all_siblings_done:
        parent.status = 'Terminé'
        parent.progress = 100
        db.session.add(parent)
        # Recursively check the next parent
        check_parent_completion(parent)

def handle_recurrence(task):
    if not task.recurrence_rule:
        return

    # This task is done, create the next one
    new_task = Task(
        name=task.name,
        parent_id=task.parent_id,
        priority=task.priority,
        remark=task.remark,
        description=task.description,
        icon=task.icon,
        order=task.order,
        recurrence_rule=task.recurrence_rule,
        recurrence_day=task.recurrence_day,
        recurrence_template=task.recurrence_template,
    )

    new_start_date = None

    # --- Calculate the new start_date based on the new logic ---
    if task.start_date:
        # Logic 1: A start date exists, so we increment from it.
        base_date = task.start_date
        if task.recurrence_rule == 'daily':
            new_start_date = base_date + timedelta(days=1)
        elif task.recurrence_rule == 'weekly':
            new_start_date = base_date + timedelta(weeks=1)
        elif task.recurrence_rule == 'monthly':
            # Add one month, handling end-of-month cases
            next_month_year = base_date.year + (base_date.month // 12)
            next_month_month = base_date.month % 12 + 1
            day = min(base_date.day, calendar.monthrange(next_month_year, next_month_month)[1])
            new_start_date = date(next_month_year, next_month_month, day)
    else:
        # Logic 2: No start date, so we create a predictable future start date.
        base_date = date.today()
        if task.recurrence_rule == 'daily':
            new_start_date = base_date + timedelta(days=1)
        elif task.recurrence_rule == 'weekly':
            # Find the next Monday
            days_to_monday = (0 - base_date.weekday() + 7) % 7
            if days_to_monday == 0: # If today is Monday, start next week
                days_to_monday = 7
            new_start_date = base_date + timedelta(days=days_to_monday)
        elif task.recurrence_rule == 'monthly':
            # Find the first day of the next month
            next_month_year = base_date.year + (base_date.month // 12)
            next_month_month = base_date.month % 12 + 1
            new_start_date = date(next_month_year, next_month_month, 1)

    if not new_start_date:
        return # Could not determine next date

    new_task.start_date = new_start_date

    # Calculate the new deadline only if the original had one.
    if task.deadline:
        # If start_date also exists, we can calculate and preserve the duration.
        if task.start_date:
            duration = task.deadline - task.start_date
            new_task.deadline = new_start_date + duration
        else:
            # Fallback: If no start_date, we can't calculate duration,
            # so the new deadline is the same as the new start_date.
            new_task.deadline = new_start_date
    else:
        # The original task had no deadline, so the new one shouldn't either.
        new_task.deadline = None

    # Handle name templating using the new start_date
    if task.recurrence_template:
        template_vars = {"date": new_task.start_date.strftime('%Y-%m-%d')}
        new_name = new_task.name
        for key, value in template_vars.items():
            new_name = new_name.replace(f"{{{{{key}}}}}", value)
        new_task.name = new_name

    db.session.add(new_task)


def get_calendar_dates_data():
    """Helper function to get all scheduled and deadline dates for tasks and projects."""
    task_scheduled = db.session.query(Task.start_date).filter(Task.start_date.isnot(None)).distinct().all()
    task_deadlines = db.session.query(Task.deadline).filter(Task.deadline.isnot(None)).distinct().all()
    
    project_scheduled = db.session.query(Project.start_date).filter(Project.start_date.isnot(None)).distinct().all()
    project_deadlines = db.session.query(Project.deadline).filter(Project.deadline.isnot(None)).distinct().all()

    all_scheduled = task_scheduled + project_scheduled
    all_deadlines = task_deadlines + project_deadlines

    return {
        "scheduled": list(set([d[0].date().isoformat() for d in all_scheduled])),
        "deadline": list(set([d[0].date().isoformat() for d in all_deadlines]))
    }
