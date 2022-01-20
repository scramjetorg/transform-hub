import logging
from logging.handlers import MemoryHandler
from time import gmtime
import sys


class LoggingSetup():
    def __init__(self, temp_log_path, min_loglevel=logging.DEBUG) -> None:
        self._temp_logfile = open(temp_log_path, 'a+')
        self._temp_logfile.write('\n')
        sys.stdout = self._temp_logfile
        sys.stderr = self._temp_logfile

        self.configure_loglevels()
        self.logger = logging.getLogger('PythonRunner')
        self.logger.setLevel(min_loglevel)
        self.create_handlers(min_loglevel)


    def configure_loglevels(self):
        class Colors:
            red="\033[31m"
            green="\033[32m"
            yellow="\033[33m"
            blue="\033[34m"
            magenta="\033[35m"
            cyan="\033[36m"
            grey="\033[37m"

            bold="\033[1m"
            reset="\033[0m"

        def customize_name(level, text):
            colors = {
                logging.ERROR: Colors.red,
                logging.WARN:  Colors.magenta,
                logging.INFO:  Colors.cyan,
                logging.DEBUG: Colors.yellow,
            }
            logging.addLevelName(level, colors[level] + text + Colors.reset)

        customize_name(logging.ERROR, "error")
        customize_name(logging.WARN, "warn")
        customize_name(logging.INFO, "info")
        customize_name(logging.DEBUG, "debug")


    def get_formatter(self):
        logging.Formatter.converter = gmtime  # use UTC time
        date_format = "%Y-%m-%dT%H:%M:%S"  # ISO 8601 format (excl. miliseconds)
        log_format = '{asctime}.{msecs:03.0f}Z {levelname} ({name}) {message}'

        return logging.Formatter(fmt=log_format, datefmt=date_format, style='{')


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


    def switch_to(self, target):
        self._main_handler.setStream(target)
        self._temp_logfile.close()


    def flush_temp_handler(self):
        self._temp_handler.setTarget(self._main_handler)
        self._temp_handler.close()
