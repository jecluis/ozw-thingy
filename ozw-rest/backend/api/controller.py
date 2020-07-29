import logging

from fastapi import APIRouter, HTTPException
from ..state import State, state
from ..network import NetworkController, NetworkRunningException, \
                      NetworkNotReadyException


logger = logging.getLogger(__name__)
router = APIRouter()

@router.put('/node/add')
def add_node():
    pass


@router.put('/node/rm')
def remove_node():
    pass


@router.put('/heal')
def heal_network():
    logger.info("controller > heal network")
    try:
        netctrl = state.get_network_controller()
        netctrl.heal()
    except (NetworkRunningException, NetworkNotReadyException) as e:
        logger.info("unable to heal network: "+str(e))
        raise HTTPException(status_code=428, detail=str(e))
    pass


@router.put('/neighbors/update')
def update_neighbors():
    logger.info("controller > update neighbors")
    pass


@router.put('/refresh')
def refresh_information():
    logger.info("controller > refresh informations")
    pass


def _get_neighbors(node_id=None):
    logger.info(f"controller > get neighbors, node: {node_id}")
    pass


@router.get('/neighbors')
def get_neighbors():
    return _get_neighbors()


@router.get('/neighbors/{node_id}')
def get_node_neighbors(node_id: int = None):
    return _get_neighbors(node_id)