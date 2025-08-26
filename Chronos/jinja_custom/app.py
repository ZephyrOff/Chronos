from jinja2 import Environment
from datetime import datetime
from models.app import db, Tag, TaskAttribute, ProjectAttribute, ScriptTemplate
import requests
from views.notification_sse_views import push_notification
from jinja_custom.plugins.http_is_alive import IsAlive

def get_css_name(name, mapping):
    for item in mapping:
        if item['name'] == name:
            return item['css_name']
    return ''

def get_project_progress(project):
    """
    Calculates and returns the progress of a given project.
    Assumes the project object has a 'calculated_progress' property.
    """
    if hasattr(project, 'calculated_progress'):
        return project.calculated_progress
    return 0 # Or raise an error, depending on desired behavior

def include_script_template(env, template_name):
    script_template = ScriptTemplate.query.filter_by(name=template_name).first()
    if script_template:
        # Create a new template from the fetched content and render it
        included_template = env.from_string(script_template.script_content)
        return included_template.render()
    return "" # Return empty string if template not found

class JinjaScriptRunner:
    def __init__(self, obj):
        self.obj = obj # Can be a Task or a Project
        self.env = Environment(extensions=['jinja2.ext.do'])
        self._setup_environment()

    def _setup_environment(self):
        # --- Data Access Variables ---
        self.env.globals['tags'] = [t.name for t in self.obj.tags]
        self.env.globals['priority'] = self.obj.priority
        self.env.globals['status'] = self.obj.status

        # Conditional properties based on object type
        if hasattr(self.obj, 'calculated_progress'):
            self.env.globals['progress'] = self.obj.calculated_progress
        else:
            self.env.globals['progress'] = 0.0 # Fallback
        

        # --- Date Access Functions ---
        self.env.globals['now'] = self._now
        self.env.globals['deadline'] = self._deadline
        self.env.globals['start_date'] = self._start_date

        # --- Action Functions ---
        self.env.globals['add_tag'] = self._add_tag
        self.env.globals['remove_tag'] = self._remove_tag
        self.env.globals['set_priority'] = self._set_priority
        self.env.globals['set_status'] = self._set_status

        # Conditional action functions based on object type
        if hasattr(self.obj, 'progress'):
            self.env.globals['set_progress'] = self._set_progress

        self.env.globals['get_attribute'] = self._get_attribute
        self.env.globals['set_attribute'] = self._set_attribute
        self.env.globals['remove_attribute'] = self._remove_attribute
        self.env.globals['get_description'] = self._get_description
        self.env.globals['set_description'] = self._set_description
        self.env.globals['get_remarque'] = self._get_remarque
        self.env.globals['set_remarque'] = self._set_remarque
        

        # --- External function ---
        self.env.globals['http_check'] = self._http_check
        self.env.globals['notification'] = self._notification
        self.env.globals['include_template'] = lambda template_name: include_script_template(self.env, template_name)
        self.env.globals['http_is_alive'] = self._http_is_alive

    # --- DATA ACCESS IMPLEMENTATIONS ---
    def _now(self, fmt=None):
        # "%Y-%m-%d %H:%M:%S"
        if fmt:
            return datetime.now().strftime(fmt)
        else:
            return datetime.now()

    def _deadline(self, fmt=None):
        if self.obj.deadline:
            if fmt:
                return self.obj.deadline.strftime(fmt)
            else:
                dt = datetime(1970, 1, 1, 0, 0, 0)
                return datetime.combine(self.obj.deadline, datetime.min.time())
                return self.obj.deadline
        return None

    def _start_date(self, fmt=None):
        if self.obj.start_date:
            if fmt:
                return self.obj.start_date.strftime(fmt)
            else:
                dt = datetime(1970, 1, 1, 0, 0, 0)
                return datetime.combine(self.obj.start_date, datetime.min.time())
                return self.obj.start_date
        return None

    # --- ACTION IMPLEMENTATIONS ---
    def _add_tag(self, tag_name):
        if not tag_name or not isinstance(tag_name, str):
            return
        tag_name = tag_name.strip()
        existing_tags = [t.name for t in self.obj.tags]
        if tag_name and tag_name not in existing_tags:
            tag = Tag.query.filter_by(name=tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
                db.session.add(tag)
            self.obj.tags.append(tag)

    def _remove_tag(self, tag_name):
        if not tag_name or not isinstance(tag_name, str):
            return
        tag_name = tag_name.strip()
        tag_to_remove = None
        for tag in self.obj.tags:
            if tag.name == tag_name:
                tag_to_remove = tag
                break
        if tag_to_remove:
            self.obj.tags.remove(tag_to_remove)

    def _get_attribute(self, key):
        if not key or not isinstance(key, str):
            return None

        if hasattr(self.obj, 'is_project') and self.obj.is_project:
            attribute = ProjectAttribute.query.filter_by(project_id=self.obj.id, name=key).first()
        else: # Assume it's a Task
            attribute = TaskAttribute.query.filter_by(task_id=self.obj.id, name=key).first()
        
        return attribute.value if attribute else None

    def _set_attribute(self, key, value):
        if not key or not isinstance(key, str):
            return

        if hasattr(self.obj, 'is_project') and self.obj.is_project:
            attribute = ProjectAttribute.query.filter_by(project_id=self.obj.id, name=key).first()
            if attribute:
                attribute.value = value
            else:
                attribute = ProjectAttribute(project_id=self.obj.id, name=key, value=value)
                db.session.add(attribute)
        else: # Assume it's a Task
            attribute = TaskAttribute.query.filter_by(task_id=self.obj.id, name=key).first()
            if attribute:
                attribute.value = value
            else:
                attribute = TaskAttribute(task_id=self.obj.id, name=key, value=value)
                db.session.add(attribute)
        db.session.flush() # Use flush to ensure ID is available if needed later in the script

    def _remove_attribute(self, key):
        if not key or not isinstance(key, str):
            return

        if hasattr(self.obj, 'is_project') and self.obj.is_project:
            attribute = ProjectAttribute.query.filter_by(project_id=self.obj.id, name=key).first()
        else: # Assume it's a Task
            attribute = TaskAttribute.query.filter_by(task_id=self.obj.id, name=key).first()
        
        if attribute:
            db.session.delete(attribute)
            db.session.flush() # Use flush to ensure deletion is processed

    def _get_description(self):
        return self.obj.description

    def _set_description(self, description):
        if description and isinstance(description, str):
            self.obj.description = description

    def _get_remarque(self):
        if hasattr(self.obj, 'remarque'):
            return self.obj.remarque
        return None

    def _set_remarque(self, remarque):
        if hasattr(self.obj, 'remark'):
            if remarque and isinstance(remarque, str):
                self.obj.remark = remarque

    def _set_priority(self, priority):
        if priority and isinstance(priority, str):
            self.obj.priority = priority

    def _set_status(self, status):
        if status and isinstance(status, str):
            self.obj.status = status
        return ''

    def _set_progress(self, progress):
        if not hasattr(self.obj, 'progress'):
            return False
        try:
            progress_val = float(progress)
            self.obj.progress = max(0.0, min(100.0, progress_val))
            return ""
        except (ValueError, TypeError):
            return False

    def _http_check(self, url):
        try:
            r = requests.get(url)
            return r.status_code
        except Exception as err:
            print(err)
            return 500

    def _http_is_alive(self, url):
        cl_alive = IsAlive(url)
        cl_alive.run()
        return cl_alive.stats

    def _notification(self, message, type):
        push_notification(message, type)

    def run(self):
        script_content = getattr(self.obj, 'script', None)
        if not script_content:
            return "No script to run.", True
        
        try:
            template = self.env.from_string(script_content)
            a = template.render() # The rendering process executes the functions
            db.session.commit()
            return f"Script executed successfully: {a}", True
        except Exception as e:
            db.session.rollback()
            return f"Error during script execution: {e}", False