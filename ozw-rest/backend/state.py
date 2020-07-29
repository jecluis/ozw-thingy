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
from .network import NetworkController


logger = logging.getLogger(__name__)



class StateException(Exception):
    pass


class State(EventHandler):

    def __init__(self):
        super().__init__()
        self.networkctrl = NetworkController()


    def handle_signal(signum, frame):
        if signum == signal.SIGINT:
            raise StateException
    ()

    def _handle_node(self, node_id, node):
        logger.debug(f"handle node {node_id}")
        pass

    def _handle_value(self, node_id, node, value):
        logger.debug(f"handle value for node {node_id}")
        pass

    def get_network_controller(self):
        return self.networkctrl

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
        ozw_controller = self.networkctrl.get_controller()
        if node.node_id == ozw_controller.node_id:
            ctrl_caps = {
                "is_primary": ozw_controller.is_primary_controller,
                "is_bridge": ozw_controller.is_bridge_controller,
                "is_static_update": ozw_controller.is_static_update_controller
            }
            caps["is_controller"] = True
            caps["controller"] = ctrl_caps

        return caps

        
    def get_nodes(self) -> Dict[int, ZWaveNode]:
        # this can throw. let the caller handle it.
        return self.networkctrl.nodes

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


# create global controller instance
# why? because we haven't, so far, figured out how to do fastapi without
# having pretty much all the important state as global. :(
# 
state = State()