import logging
import signal
from typing import Dict, List, Optional

# requirerments for openzwave integration
from openzwave.controller import ZWaveController
from openzwave.network import ZWaveNetwork
from openzwave.option import ZWaveOption
from openzwave.node import ZWaveNode
from openzwave.value import ZWaveValue
# requirement for catching events from openzwave lib
from pydispatch import dispatcher

from .eventhandler import EventHandler
from .node import NodeInfoSimple


logger = logging.getLogger(__name__)



class ControllerExit(Exception):
    pass


class Controller(EventHandler):

    def __init__(self):
        super().__init__()
        self.network = None
        self.network_device = None
        self.network_has_started = False


    def handle_signal(signum, frame):
        if signum == signal.SIGINT:
            raise ControllerExit()

    def _handle_node(self, node_id, node):
        logger.debug(f"handle node {node_id}")
        pass

    def _handle_value(self, node_id, node, value):
        logger.debug(f"handle value for node {node_id}")
        pass

    def set_ozw_network(self, ozwnet : ZWaveNetwork):
        self.network = ozwnet

    def _get_state_str(self, node: ZWaveNode):

        state = "unknown"
        if node.is_ready:
            state = "ready"
        elif node.is_failed:
            state = "failed"
        elif node.is_awake:
            state = "awake"

        return state

    def _get_node_capabilities(self, node: ZWaveNode):
        caps = {
            "is_zwaveplus": node.is_zwave_plus,
            "is_routing": node.is_routing_device,
            "is_security": node.is_security_device,
            "is_beaming": node.is_beaming_device,
            "is_listening": node.is_listening_device,
            "is_frequent_listening": node.is_frequent_listening_device
        }
        if node.node_id == self.network.controller.node_id:
            caps["is_controller"] = True

        return caps

        
    def get_nodes(self) -> Dict[int, ZWaveNode]:
        return self.network.nodes

    def get_nodes_simple(self) -> List[NodeInfoSimple]:
        lst = []

        nodes = self.get_nodes()
        node: ZWaveNode
        for nid, node in nodes.items():
            info = NodeInfoSimple()
            info.node_id = nid
            info.product_name = node.product_name
            info.node_type = node.type
            info.state = self._get_state_str(node)
            info.proto_stage = node.query_stage
            info.capabilities = \
                self._get_node_capabilities(node)
            lst.append(info)
        return lst          

    def get_nodes_dict(self):

        nodes = self.get_nodes()

        node: ZWaveNode
        for node in nodes.values():
            nodes[node.node_id] = node.to_dict(extras=["all"])

        return nodes

    def is_network_started(self):
        return self.network_has_started

    def get_network_device(self):
        return self.network_device if self.network_device else ''


# create global controller instance
# why? because we haven't, so far, figured out how to do fastapi without
# having pretty much all the important state as global. :(
# 
controller = Controller()