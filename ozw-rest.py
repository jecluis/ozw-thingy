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

# requirements to serve the API through flask
#from klein import Klein
import flask
#from flask_restful import Resource, Api

from typing import Optional
from fastapi import FastAPI


#app = Klein()
#app = flask.Flask(__name__)

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
        
    def get_nodes(self) -> Dict[int, ZWaveNode]:
        return self.network.nodes

    def get_nodes_simple(self) -> List[NodeInfoSimple]:
        lst = []

        nodes = self.get_nodes()
        node: ZWaveNode
        for nid, node in nodes.items():
            info = NodeInfoSimple()
            info.node_id = nid
            info.node_type = node.type
            info.state = node.query_stage
            info.capabilities = list(node.capabilities)
            lst.append(info)
        return lst          

    def get_nodes_dict(self):

        nodes = {}

        node: ZWaveNode
        for node in self.nodes.values():
            nodes[node.node_id] = node.to_dict(extras=["all"])

        return nodes


app = FastAPI()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

controller = Controller()


def serve():
    app.run(
        host='0.0.0.0',
        port=31337,
        debug=True)

@app.get('/')
def read_root():
    return { 'hello': 'world' }

@app.get('/nodes')
def get_nodes():
    #nodes = controller.get_nodes_dict()
    nodes = controller.get_nodes_simple()
    logger.info("get nodes: {}".format(nodes))
    return nodes

@app.get('/nodes/roles')
def get_nodes_roles():
    nodes = controller.get_nodes()
    logger.info("get node roles: nodes = {}".format(nodes))
    roles = {}
    for n in nodes.values():
        roles[n.node_id] = n.role

    return roles

@app.get('/nodes/types')
def get_nodes_types():
    nodes = controller.network.nodes
    logger.info("get node types: nodes = {}".format(nodes))
    types = {}
    for n in nodes.values():
        types[n.node_id] = n.type
    return types

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

