from flask import Flask, render_template_string, request
import os
from flask_cors import CORS

from views.task_manager_views import task_manager_bp
from views.daily_views import daily_bp
from views.modal_views import modal_bp
from views.auth_views import auth_bp
from views.admin_views import admin_bp
from views.dashboard_views import dashboard_bp
from views.notification_sse_views import notification_sse_bp, push_notification

from waitress import serve

from models.app import db

from core.config import Config
import zpp_store
import __main__

from core.protect import Fail2Ban
from jinja_custom.app import get_css_name, get_project_progress, include_script_template
from core.error import error_404


class Backend():
    def __init__(self):
        self.app_settings = Config('settings.yaml').get()
        self.app_settings = zpp_store.structure(self.app_settings)


        template_dir = os.path.abspath(self.app_settings.get("template_dir", "templates"))
        static_dir = os.path.abspath(self.app_settings.get("static_dir", "static"))

        self.app = Flask("Chronos", template_folder=template_dir, static_folder=static_dir, instance_relative_config=True)
        CORS(self.app)

        self.auth_required = self.app_settings.get("app.auth", False)
        self.admin_enable = self.app_settings.get("app.admin", False)

        # Register Blueprints
        self.app.register_blueprint(task_manager_bp)
        self.app.register_blueprint(daily_bp)
        self.app.register_blueprint(modal_bp)
        self.app.register_blueprint(auth_bp)
        if self.admin_enable:
            self.app.register_blueprint(admin_bp)
        self.app.register_blueprint(dashboard_bp)
        self.app.register_blueprint(notification_sse_bp)

        # Config
        # Ensure the instance folder exists
        try:
            os.makedirs(self.app.instance_path)
        except OSError:
            pass

        self.app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(self.app.instance_path, "tasks.db")}'
        self.app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

        db.init_app(self.app) # Initialize db with the app

        self.server_address = self.app_settings.get('server.host', '127.0.0.1')
        self.port = self.app_settings.get('server.port', 4444)
        self.app.secret_key = self.app_settings.get("secret_key", None)

        self.app.config['SECRET_KEY'] = self.app.secret_key

        self.app_mode = self.app_settings.get("app.mode", "DEV")


        ## CONFIGURATION FAIL2BAN ##
        self.enable_auto_protect = self.app_settings.get("app.auto_protect", False)

        if self.enable_auto_protect:
            blacklist = self.app_settings.get("app.blacklist", [])
            whitelist = self.app_settings.get("app.whitelist", [])
            max_fail = self.app_settings.get("app.max_fail", 5)
            fail_interval = self.app_settings.get("app.fail_interval", 300)
            ban_time = self.app_settings.get("app.ban_time", 300)

            self.protect = Fail2Ban(self.app, blacklist, whitelist, max_fail, fail_interval, ban_time)
        ## CONFIGURATION FAIL2BAN ##
        
        #self.register_error_handlers()
        self.app.errorhandler(404)(self.page_not_found)
        self.app.errorhandler(500)(self.internal_server_error)



    def page_not_found(self, *args):
        whitelist_page = ["/.well-known/appspecific/com.chrome.devtools.json"]
        
        if self.enable_auto_protect and request.path not in whitelist_page:
            response = self.protect.auto_protect()
            if response:
                return response

        return render_template_string(error_404()), 404


    def internal_server_error(self, *args):
        whitelist_page = ["/.well-known/appspecific/com.chrome.devtools.json"]
        
        if self.enable_auto_protect and request.path not in whitelist_page:
            response = self.protect.auto_protect()
            if response:
                return response

        return render_template_string(error_404()), 500


    def setup_jinja_custom(self):
        self.app.jinja_env.globals.update(get_css_name=get_css_name, get_project_progress=get_project_progress, include_template=include_script_template)


    def run_server(self):
        with self.app.app_context():
            db.create_all()

            """
            from models.user import User
            username = "alex"
            password = ""
            role = "admin"
            user = User(username=username, role=role)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            print(f'User {username} created successfully with role {role}.')
            exit()
            """
        
        # Ajoute ProxyFix
        from werkzeug.middleware.proxy_fix import ProxyFix
        self.app.wsgi_app = ProxyFix(self.app.wsgi_app, x_for=1)

        if self.app_mode == "PROD":
            serve(self.app, host=self.server_address, port=self.port)
        else:
            self.app.run(host=self.server_address, port=self.port, debug=True)


if __name__ == '__main__':
    __main__.backend = Backend()
    __main__.backend.setup_jinja_custom()

    __main__.backend.run_server()