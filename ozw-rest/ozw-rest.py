#!/usr/bin/python

import time
import logging
import signal
import threading
from typing import Dict, List
from abc import ABC, abstractmethod

# requirerments for openzwave integration
from openzwave.network import ZWaveNetwork
from openzwave.option import ZWaveOption
from openzwave.node import ZWaveNode
from openzwave.value import ZWaveValue
# requirement for catching events from openzwave lib
from pydispatch import dispatcher

from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.api import nodes as api_nodes
from backend.api import network as api_network
from backend.api import controller as api_controller


app = FastAPI()

origins = [
    'http://localhost',
    'http://192.168.1.88:4200',
    'http://192.168.1.75'
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app.include_router(
    api_nodes.router,
    prefix='/api/nodes'
)

app.include_router(
    api_network.router,
    prefix='/api/network'
)

app.include_router(
    api_controller.router,
    prefix='/api/controller'
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
    # we know this function is not needed, nor is its thread.
    # we're leaving it though, so we don't forget how to run an
    # on_startup event ;) and it dies out pretty quickly anyway.
    logger.info("starting ozw-rest...")

    # possibly refresh here?
    


if __name__ == '__main__':

    main()

