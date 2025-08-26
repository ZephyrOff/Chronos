from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import or_
from datetime import datetime, date, timedelta
import calendar

db = SQLAlchemy() # This will be initialized with the app later

# --- Association Table for Tags ---
task_tags = db.Table('task_tags',
    db.Column('task_id', db.Integer, db.ForeignKey('task.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.id'), primary_key=True)
)

template_tags = db.Table('template_tags',
    db.Column('template_id', db.Integer, db.ForeignKey('template.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.id'), primary_key=True)
)

project_tags = db.Table('project_tags',
    db.Column('project_id', db.Integer, db.ForeignKey('project.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.id'), primary_key=True)
)

# --- Models ---
class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    icon = db.Column(db.Text, nullable=True)
    order = db.Column(db.Integer, default=0)
    status = db.Column(db.String(50), default="À commencer")
    priority = db.Column(db.String(50))
    description = db.Column(db.Text, nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    deadline = db.Column(db.Date, nullable=True)
    script = db.Column(db.Text, nullable=True)
    tasks = db.relationship('Task', backref='project', lazy='dynamic', cascade="all, delete-orphan")
    tags = db.relationship('Tag', secondary=project_tags, backref=db.backref('projects', lazy='dynamic'))
    attributes = db.relationship('ProjectAttribute', backref='project', lazy='dynamic', cascade="all, delete-orphan")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


    # Add a property to check if it's a project
    @property
    def is_project(self):
        return True

    @property
    def calculated_progress(self):
        if not self.tasks.count(): # Use .count() for efficiency with dynamic relationship
            return 0
        
        total_progress = 0
        for task in self.tasks:
            total_progress += task.calculated_progress
        return round(total_progress / self.tasks.count())

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'icon': self.icon,
            'priority': self.priority,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'is_project': True
        }

class Tag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

class ProjectAttribute(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    value = db.Column(db.Text, nullable=True)

class TaskAttribute(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    value = db.Column(db.Text, nullable=True)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(db.Integer, db.ForeignKey('task.id'), nullable=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=True)
    children = db.relationship('Task', backref=db.backref('parent', remote_side=[id]), lazy=True, order_by='Task.order', cascade="all, delete-orphan")

    name = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), default="À commencer")
    priority = db.Column(db.String(50))
    progress = db.Column(db.Float, default=0.0)
    deadline = db.Column(db.DateTime, nullable=True)
    remark = db.Column(db.Text, nullable=True)
    description = db.Column(db.Text, nullable=True)
    icon = db.Column(db.Text, nullable=True)
    order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # New fields for features
    start_date = db.Column(db.DateTime, nullable=True)
    recurrence_rule = db.Column(db.String(100), nullable=True)
    recurrence_day = db.Column(db.Integer, nullable=True) # For weekly (0-6) or monthly (1-31)
    recurrence_template = db.Column(db.Text, nullable=True)
    
    # Relationships
    tags = db.relationship('Tag', secondary=task_tags, backref=db.backref('tasks', lazy='dynamic'))
    attributes_rel = db.relationship('TaskAttribute', backref='task', lazy='dynamic', cascade="all, delete-orphan")

    # For script
    script = db.Column(db.Text, nullable=True)
    

    # Add a property to check if it's a project
    @property
    def is_project(self):
        return False

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'icon': self.icon,
            'priority': self.priority,
            'deadline': self.deadline.isoformat() if self.deadline else None
        }

    @property
    def calculated_progress(self):
        if self.children and len(self.children) > 0:
            total = len(self.children)
            progress_sum = sum(child.calculated_progress for child in self.children)
            return round(progress_sum / total)
        return round(self.progress or 0)

# --- Template Models ---
class Template(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(db.Integer, db.ForeignKey('template.id'), nullable=True)
    children = db.relationship('Template', backref=db.backref('parent', remote_side=[id]), lazy=True, cascade="all, delete-orphan")

    name = db.Column(db.String(255), nullable=False)
    priority = db.Column(db.String(50))
    remark = db.Column(db.Text, nullable=True)
    description = db.Column(db.Text, nullable=True)
    icon = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default="À commencer")
    script = db.Column(db.Text, nullable=True)
    
    tags = db.relationship('Tag', secondary=template_tags, backref=db.backref('templates', lazy='dynamic'))
    attributes = db.relationship('TemplateAttribute', backref='template', lazy='dynamic', cascade="all, delete-orphan")

class TemplateAttribute(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('template.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    value = db.Column(db.Text, nullable=True)

class ScriptTemplate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False)
    script_content = db.Column(db.Text, nullable=True)

class DailyReport(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    report_date = db.Column(db.Date, default=date.today, nullable=False)
    content = db.Column(db.Text, default="")
