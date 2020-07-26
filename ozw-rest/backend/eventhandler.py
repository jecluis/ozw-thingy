import logging
from abc import ABC, abstractmethod

# requirerments for openzwave integration
from openzwave.controller import ZWaveController
from openzwave.network import ZWaveNetwork
from openzwave.option import ZWaveOption
from openzwave.node import ZWaveNode
from openzwave.value import ZWaveValue
# requirement for catching events from openzwave lib
from pydispatch import dispatcher


logger = logging.getLogger(__name__)


class EventHandler(ABC):

    def __init__(self):

        dispatcher.connect(self.handle_value, ZWaveNetwork.SIGNAL_VALUE_ADDED)
        dispatcher.connect(self.handle_value, ZWaveNetwork.SIGNAL_VALUE_CHANGED)
        dispatcher.connect(self.handle_value,
                           ZWaveNetwork.SIGNAL_VALUE_REFRESHED)
        dispatcher.connect(self.handle_value, ZWaveNetwork.SIGNAL_VALUE_REMOVED)

        dispatcher.connect(self.handle_node_event,
                           ZWaveNetwork.SIGNAL_NODE_ADDED)
        dispatcher.connect(self.handle_node_event,
                           ZWaveNetwork.SIGNAL_NODE_NEW)


    def handle_value(self, signal, node, value):

        logger.info("node value: signal = {}, node = {}, value = {}".format(
            signal, node, value
        ))

        #self._handle_value(node.node_id, node, value)

    def handle_node_event(self, signal, **kwargs):

        logger.info("node event: signal = {}, kwargs = {}".format(
            signal, kwargs))

        if 'node' not in kwargs:
            return

        node: ZWaveNode = kwargs['node'] 
        self._handle_node(node.node_id, node)
        

    @abstractmethod
    def _handle_value(self, node, value):
        pass

    @abstractmethod
    def _handle_node(self, node):
        pass