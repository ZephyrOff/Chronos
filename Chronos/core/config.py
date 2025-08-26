import os
import yaml

class Config:
    def __init__(self, path):
        self.path = os.path.expanduser(path)
        self.data = {}
        self._load()

    def _load(self):
        if os.path.exists(self.path):
            with open(self.path, "r", encoding="utf-8") as f:
                self.data = yaml.safe_load(f) or {}
        else:
            self.data = {}

    def _save(self):
        directory = os.path.dirname(self.path)
        if directory:
            os.makedirs(directory, exist_ok=True)

        with open(self.path, "w", encoding="utf-8") as f:
            yaml.safe_dump(self.data, f, default_flow_style=False, sort_keys=False)

    def _get_recursive(self, data, keys):
        if len(keys) == 1:
            return data.get(keys[0])
        if keys[0] in data:
            return self._get_recursive(data[keys[0]], keys[1:])
        return None

    def _set_recursive(self, data, keys, value):
        if len(keys) == 1:
            data[keys[0]] = value
            return data
        if keys[0] not in data or not isinstance(data[keys[0]], dict):
            data[keys[0]] = {}
        data[keys[0]] = self._set_recursive(data[keys[0]], keys[1:], value)
        return data

    def get(self, dotted_key=None, default=None, auto_set=False):
        if not dotted_key:
            return self.data
        
        keys = dotted_key.split(".")
        result = self._get_recursive(self.data, keys)

        if result is not None:
            return result

        if auto_set:
            self.set(dotted_key, default)
            return default

        return default

    def set(self, dotted_key, value):
        keys = dotted_key.split(".")
        self.data = self._set_recursive(self.data, keys, value)
        self._save()

    def delete(self, dotted_key):
        keys = dotted_key.split(".")
        parent = self._get_recursive(self.data, keys[:-1])
        if parent and keys[-1] in parent:
            del parent[keys[-1]]
            # Nettoie récursivement si parent vide :
            while keys[:-1]:
                keys = keys[:-1]
                parent = self._get_recursive(self.data, keys[:-1])
                if parent and not parent.get(keys[-1]):
                    del parent[keys[-1]]
            self._save()

    def has(self, dotted_key):
        return self.get(dotted_key) is not None