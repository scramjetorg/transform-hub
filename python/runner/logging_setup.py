import logging
from logging.handlers import MemoryHandler
import sys


class CustomFormatter(logging.Formatter):
    def formatTime(self, record, datefmt=None):
        # record.created is a float in seconds, we want ms.
        # Note that using timestamp gives us UTC, as desired.
        return round(record.created*1000)

class LoggingSetup():
    def __init__(self, temp_log_path, min_loglevel=logging.DEBUG) -> None:
        self._temp_logfile = open(temp_log_path, 'a+')
        self._temp_logfile.write('\n')
        sys.stdout = self._temp_logfile
        sys.stderr = self._temp_logfile

        self.logger = logging.getLogger('PythonRunner')
        self.logger.setLevel(min_loglevel)
        self.create_handlers(min_loglevel)
        self.adjust_levels()


    def get_formatter(self):
        log_format = (
            '{{"ts": {asctime}, "level": "{levelname}", '
            '"from": "{name}", "msg": "{message}"}}'
        )
        return CustomFormatter(fmt=log_format, style='{')


    def create_handlers(self, min_loglevel):
        formatter = self.get_formatter()

        self._main_handler = logging.StreamHandler(self._temp_logfile)
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


    def switch_to(self, target):
        self._main_handler.setStream(target)
        self._temp_logfile.close()


    def flush_temp_handler(self):
        self._temp_handler.setTarget(self._main_handler)
        self._temp_handler.close()
