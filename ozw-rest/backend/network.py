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

class NetworkNotReadyException(NetworkException):
    pass


"""
We are defining the state as a series of booleans, mutually exclusive,
not for our benefit but for the consumer's. This way they don't have to
have intimate knowledge of our internal representation for values, nor
are they obligated to handle strings. They get a set of booleans and do
whatever they wish with them.
"""
class NetworkState:

    def __init__(self):
        self.is_stopped: bool   = False
        self.is_failed: bool    = False
        self.is_resetted: bool  = False
        self.is_started: bool   = False
        self.is_awake: bool     = False
        self.is_ready: bool     = False
        self.state_str: str     = None
        
        
    def update(self, network: ZWaveNetwork):
        state = None
        if network:
            state = network.state
        else:
            self.is_stopped = True
            return

        if not state or state == ZWaveNetwork.STATE_STOPPED:
            self.is_stopped = True
        elif state == ZWaveNetwork.STATE_FAILED:
            self.is_failed = True
        elif state == ZWaveNetwork.STATE_RESETTED:
            self.is_resetted = True
        elif state == ZWaveNetwork.STATE_STARTED:
            self.is_started = True
        elif state == ZWaveNetwork.STATE_AWAKED:
            self.is_awake = True
        elif state == ZWaveNetwork.STATE_READY:
            self.is_ready = True
        else:
            self.is_stopped = True # assume default state is stopped.

        self.state_str = network.state_str

    def to_dict(self):
        return self.__dict__

    @classmethod
    def obtain(cls, network: ZWaveNetwork):
        state = cls()
        state.update(network)
        return state


class NetworkController:

    def __init__(self):
        self.network = None
        self.network_device = None
        self.network_is_running = False
        self.network_is_starting = False
        self.network_is_stopping = False
        self.network_lock = threading.Lock()


    def get_network_state(self):
        return NetworkState.obtain(self.network)


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
        self.network = None
        logger.info("stopped z-wave network")
        self.network_lock.release()

    def _find_best_device(self):

        from pathlib import Path
        p = Path('/dev')
        p.resolve()

        potential_matches = []
        for dev in p.iterdir():
            dev_name = str(dev)
            if not dev.is_char_device():
                continue

            if dev_name.startswith('/dev/ttyACM'):
                potential_matches.append(dev)

        if len(potential_matches) == 0:
            return False

        # Assume the latest device is the one we're looking for.
        # Our reasoning is simply due to past experience with plugging and
        # unplugging the device -- sometimes there's an artifact left behind
        # (say, ttyACM0) while the "new" device is now living on with a new
        # name (say, ttyACM1).
        #
        # At the moment we won't support multiple devices because
        #   1) we have no idea how to differentiate a real device
        #      from an artifact;
        #   2) we really don't want to ask the user to tell us.
        #
        # For now this works for our intended purposes, as we only
        # have one device and shows as an ACM. once we get our hands
        # on a second controller, we can play a bit more with this.
        self.network_device = str(potential_matches[-1])
        logger.info(f"found potential candidate: {self.network_device}")
        return True

    """
        While we return true if we schedule the thread, this is not an
        indication that the network has been started. It will be up to
        the user to check whether the network has been started, and
        when. It is nothing more than an indication that everything went
        according to plan.
    """
    def start(self):

        if self.is_server_running():
            raise NetworkRunningException("can't start a running network")

        if not self.network_device:
            logger.info("attempt to find best candidate device!")
            if not self._find_best_device():
                raise DeviceNotSetException(
                    "can't start network without a device")

        if self.is_server_starting():
            # someone else is already doing the same, leave.
            return True

        if self.is_server_stopping():
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

    def is_server_running(self):
        return self.network_is_running

    def is_server_starting(self):
        return self.network_is_starting

    def is_server_stopping(self):
        return self.network_is_stopping

    def is_server_started(self):
        return self.is_server_running() and \
            not self.is_server_starting() and not self.is_server_stopping()

    def is_ready(self):
        return self.get_network_state().is_ready

    def is_stopped(self):
        return self.get_network_state().is_stopped

    def is_started(self):
        return self.get_network_state().is_started

    def is_awake(self):
        return self.get_network_state().is_awake

    def get_controller(self):
        if not self.is_server_running():
            raise NetworkRunningException("network is not running")
        if not self.is_started():
            raise NetworkNotReadyException("network hasn't started yet")
        assert self.network
        return self.network.controller

    @property
    def nodes(self):
        if not self.is_server_running():
            assert(self.is_stopped())
            raise NetworkRunningException("network is not running")
    
        if not self.is_ready() and \
            not self.is_awake() and \
            not self.is_started():
            logger.info("nodes > can't obtain nodes yet!")
            logger.info(" net state: {}".format(self.get_network_state().to_dict()))
            raise NetworkNotReadyException("network is not ready yet")

        assert self.network
        return self.network.nodes
    

    def heal(self):
        if not self.is_server_running():
            raise NetworkRunningException("network is not running")
        if not self.is_started():
            raise NetworkNotReadyException("network hasn't started yet")
