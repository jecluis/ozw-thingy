#!/usr/bin/python

import time
import logging
import signal
import threading
from typing import Dict, List
from abc import ABC, abstractmethod

# requirerments for openzwave integration
from openzwave.controller import ZWaveController
from openzwave.network import ZWaveNetwork
from openzwave.option import ZWaveOption
from openzwave.node import ZWaveNode
from openzwave.value import ZWaveValue
# requirement for catching events from openzwave lib
from pydispatch import dispatcher

from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


class ControllerExit(Exception):
    pass

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

        self.controller = None      # type: BufferController

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


class NodeInfoSimple:
    node_id: int
    product_name: str
    node_type: str
    state: str
    proto_stage: str
    capabilities: []


class Controller(EventHandler):

    def __init__(self):
        super().__init__()
        self.network = None

    def handle_signal(signum, frame):
        if signum == signal.SIGINT:
            raise ControllerExit()

    def _handle_node(self, node_id, node):
        logger.debug(f"handle node {node_id}")
        self.nodes[node_id] = node
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


app = FastAPI()

origins = [
    'http://192.168.1.75'
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

controller = Controller()


def serve():
    app.run(
        host='0.0.0.0',
        port=31337,
        debug=True)

@app.get('/api/')
def read_root():
    return { 'hello': 'world' }

@app.get('/api/nodes')
def get_nodes(all: bool = False):
    #nodes = controller.get_nodes_dict()
    if all:
        return controller.get_nodes_dict()
    nodes = controller.get_nodes_simple()
    logger.info("get nodes: {}".format(nodes))
    return nodes

@app.get('/api/nodes/roles')
def get_nodes_roles():
    nodes = controller.get_nodes()
    logger.info("get node roles: nodes = {}".format(nodes))
    roles = {}
    for n in nodes.values():
        roles[n.node_id] = n.role

    return roles

@app.get('/api/nodes/types')
def get_nodes_types():
    nodes = controller.network.nodes
    logger.info("get node types: nodes = {}".format(nodes))
    types = {}
    for n in nodes.values():
        types[n.node_id] = n.type
    return types

@app.get('/api/node/{node_id}/scope/{scope}')
def get_node_scope(node_id: int, scope: str):
    logger.info("get scope '{}' for node id = {}".format(
        scope, node_id
    ))

    # we are skipping openzwave's lib's get_values() function because
    # it kept returning a whole bunch of nothing for whatever genre we
    # tried. Thus, we're grabbing the values outselves.

    genres = ['user', 'config', 'system']
    wanted = scope.lower()
    if wanted not in genres:
        # these also happen to be the ones we're supporting ;)
        raise HTTPException(status_code=404, detail="scope not found")

    nodes = controller.network.nodes
    if node_id not in nodes:
        raise HTTPException(status_code=404, detail="node not found")

    node = nodes[node_id]
    all_values = node.get_values()

    values = []
    value: ZWaveValue
    for value in all_values.values():
        if value.genre.lower() != wanted:
            continue

        # we are not interested in all the k/v in the dictionary.
        # let's parse out what we need.
        value_raw = value.to_dict(extras=[])
        value_proper = {
            'label': str(value_raw.get('label', '')),
            'units': str(value_raw.get('units', '')),
            'data':  str(value_raw.get('data', ''))
        }
        values.append(value_proper)

    return values

@app.on_event("startup")
def on_startup():

    logger.info("starting openzwave")
    thread = threading.Thread(target=main)
    thread.start()

def main():

    options = ZWaveOption(device='/dev/ttyACM0')
    options.set_log_file('ozw-rest.ozw.log')
    options.set_append_log_file(True)
    options.set_console_output(False)
    options.set_logging(True)
    options.lock()

    network = ZWaveNetwork(options, autostart=False)
    logger.info("starting zwave network")
    controller.set_ozw_network(network)

    network.start()

    # possibly refresh here?
    


if __name__ == '__main__':

    main()

