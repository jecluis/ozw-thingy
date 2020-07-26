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

from backend.controller import Controller, controller
from backend.api import nodes
from backend.api import network as api_network


app = FastAPI()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app.include_router(
    nodes.router,
    prefix='/api/nodes'
)

app.include_router(
    api_network.router,
    prefix='/network'
)

@app.get('/api/')
def read_root():
    return { 'hello': 'world' }


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

