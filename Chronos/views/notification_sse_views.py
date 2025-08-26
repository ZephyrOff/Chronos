from flask import Blueprint, Response, request, jsonify
import time
import queue
import json

notification_sse_bp = Blueprint('notification_sse', __name__)

# A simple queue to hold notifications
notification_queue = queue.Queue()

@notification_sse_bp.route('/stream')
def stream():
    def generate_notifications():
        while True:
            if not notification_queue.empty():
                message = notification_queue.get()
                yield f"data: {json.dumps(message)}\n\n"
            time.sleep(0.5) # Check for new messages every second

    return Response(generate_notifications(), mimetype='text/event-stream')

# This function can be called from other parts of your application to push notifications
def push_notification(message, type):
    notification_queue.put({'message': message, 'type': type})
