import logging
from fastapi import APIRouter, HTTPException
from ..controller import Controller, controller

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get('/status')
def get_network_status():
    return {
        'is_started': controller.is_network_started(),
        'device': controller.get_network_device()
    }

@router.get('/device')
def get_network_device():
    return controller.get_network_device()

@router.put('/device')
def put_network_device(device: str):
    pass

@router.put('/start')
def network_start():
    pass

@router.put('/stop')
def network_stop():
    pass

@router.put('/restart')
def network_restart():
    network_stop()
    network_start()