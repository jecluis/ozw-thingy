import logging
from pathlib import Path
import threading

from openzwave.option import ZWaveOption
from openzwave.network import ZWaveNetwork

logger = logging.getLogger(__name__)


class NetworkException(Exception):
    pass

class NetworkRunningException(NetworkException):
    pass

class DeviceNotSetException(NetworkException):
    pass

class TryAgainLaterException(NetworkException):
    pass


class NetworkController:

    def __init__(self):
        self.network = None
        self.network_device = None
        self.network_is_running = False
        self.network_is_starting = False
        self.network_is_stopping = False
        self.network_lock = threading.Lock()

    def _ozw_start(self):

        logger.info("starting ozw network")

        self.network_lock.acquire()
        if self.network_is_running:
            # get out, we must be done.
            self.network_lock.release()
            return

        assert not self.network

        self.network_is_starting = True
        self.network_is_running = True
        try:
            options = ZWaveOption(self.network_device)
            options.set_log_file('ozw-rest.ozw.log')
            options.set_append_log_file(True)
            options.set_console_output(False)
            options.set_logging(True)
            options.lock()
        except Exception as e:
            logger.error("unable to start network: {}".format(e))
            self.network_is_running = False
            self.network_is_running = False
            return False

        self.network = ZWaveNetwork(options, autostart=True)
        self.network_is_starting = False
        logger.info("started z-wave network")
        self.network_lock.release()
        pass

    def _ozw_stop(self):
        logger.info("stopping ozw network")

        # always acquire the lock. This is going to be a slow operation
        # anyway, so might as well do it earlier and be sure nothing else
        # is going on.
        self.network_lock.acquire()
        if not self.network_is_running:
            self.network_lock.release()
            return

        assert self.network
        assert self.network_is_running
        # if it were stopping, we wouldn't have been able to acquire the lock
        assert not self.network_is_stopping

        self.network_is_stopping = True
        self.network.stop()
        self.network_is_stopping = False
        self.network_is_running = False
        logger.info("stopped z-wave network")
        self.network_lock.release()

    """
        While we return true if we schedule the thread, this is not an
        indication that the network has been started. It will be up to
        the user to check whether the network has been started, and
        when. It is nothing more than an indication that everything went
        according to plan.
    """
    def start(self):

        if self.is_running():
            raise NetworkRunningException("can't start a running network")

        if not self.network_device:
            raise DeviceNotSetException("can't start network with a device")

        if self.is_starting():
            # someone else is already doing the same, leave.
            return True

        if self.is_stopping():
            raise TryAgainLaterException("network being stopped")

        thread = threading.Thread(target=self._ozw_start)
        thread.start()
        return True
        

    def stop(self):

        logger.info("stopping z-wave network")
        thread = threading.Thread(target=self._ozw_stop)
        thread.start()
        return True

    def restart(self):
        self.stop()
        self.start()

    def set_device(self, device: str):
        netdev_path = Path('/dev') / device
        netdev_path.resolve()
        if not netdev_path.exists():
            raise FileNotFoundError()
        if not netdev_path.is_char_device():
            raise OSError("not a serial device")
        if self.network_is_running:
            raise NetworkRunningException(
                "can't set device while network is running")
        assert not self.network
        self.network_device = str(netdev_path)

    def get_device(self):
        return self.network_device if self.network_device else ''

    def is_running(self):
        return self.network_is_running

    def is_starting(self):
        return self.network_is_starting

    def is_stopping(self):
        return self.network_is_stopping

    def get_controller(self):
        if not self.is_running():
            raise NetworkRunningException("network is not running")
        assert self.network
        return self.network.controller

    @property
    def nodes(self):
        if not self.is_running():
            raise NetworkRunningException("network is not running")
        assert self.network
        return self.network.nodes
    