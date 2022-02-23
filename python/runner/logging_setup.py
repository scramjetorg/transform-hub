import logging
from logging.handlers import MemoryHandler
import sys
import json


class JsonFormatter(logging.Formatter):
    def formatMessage(self, record):
        # record.created is a float in seconds, we want ms.
        # Note that using timestamp gives us UTC, as desired.
        return json.dumps({
            "ts": round(record.created*1000),
            "level": record.levelname,
            "from": record.name,
            "msg": record.message,
        })


class LoggingSetup():
    def __init__(self, target, min_loglevel=logging.DEBUG) -> None:
        self._target = target
        self._target.write('\n')
        if self._target != sys.stdout:
            sys.stdout = self._target
            sys.stderr = self._target

        self.logger = logging.getLogger('PythonRunner')
        self.logger.setLevel(min_loglevel)
        self.create_handlers(min_loglevel)
        self.adjust_levels()


    def create_handlers(self, min_loglevel):
        formatter = JsonFormatter()

        self._main_handler = logging.StreamHandler(self._target)
        self._main_handler.setLevel(min_loglevel)
        self._main_handler.setFormatter(formatter)
        self.logger.addHandler(self._main_handler)

        self._temp_handler = MemoryHandler(1000)
        self._temp_handler.setLevel(logging.INFO)
        self._temp_handler.setFormatter(formatter)
        self.logger.addHandler(self._temp_handler)


    def adjust_levels(self):
        # Adjust level names according to transform hub convention.
        logging.addLevelName(logging.WARNING, "WARN")
        logging.addLevelName(logging.CRITICAL, "FATAL")

        # Un-deprecate "warn", as transform-hub uses "warn" rather than "warning".
        self.logger.warn = self.logger.warning


    def switch_target(self, new_target):
        old_target = self._target
        self._main_handler.setStream(new_target)
        self._target = new_target
        old_target.close()


    def flush_temp_handler(self):
        self._temp_handler.setTarget(self._main_handler)
        self._temp_handler.close()
