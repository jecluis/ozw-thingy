import logging
from fastapi import APIRouter, HTTPException
from ..state import State, state
from ..network import NetworkController, NetworkRunningException, \
                      DeviceNotSetException, TryAgainLaterException
                      

logger = logging.getLogger(__name__)

router = APIRouter()

network_ctrl: NetworkController = state.get_network_controller()

@router.get('/status')
def get_network_status():
    assert network_ctrl
    server_state = {
        'is_running': network_ctrl.is_server_running(),
        'is_starting': network_ctrl.is_server_starting(),
        'is_stopping': network_ctrl.is_server_stopping(),
        'device': network_ctrl.get_device()
    }
    network_state = network_ctrl.get_network_state().to_dict()
    return {
        'server': server_state,
        'network': network_state
    }
    

@router.get('/device')
def get_network_device():
    assert network_ctrl
    if not network_ctrl.get_device():
        raise HTTPException(status_code=404, detail="network device not set")
    return network_ctrl.get_device()

@router.put('/device')
def put_network_device(device: str):
    assert network_ctrl

    try:
        network_ctrl.set_device(device)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="device not found")
    except NetworkRunningException:
        raise HTTPException(status_code=409, detail="network is running")
    except OSError as e:
        raise HTTPException(status_code=422, detail=str(e))
    assert network_ctrl.get_device() == '/dev/'+device
    return True


@router.put('/start')
def network_start():
    logger.info("starting network...")
    assert network_ctrl
    try:
        network_ctrl.start()
    except DeviceNotSetException:
        raise HTTPException(status_code=428, detail="network device not set")
    except NetworkRunningException:
        # be idempotent. it's running, so we achieved our purposes!
        pass
    except TryAgainLaterException as e:
        raise HTTPException(status=503, detail=str(e))
    return True

@router.put('/stop')
def network_stop():
    logger.info("stopping network...")
    # we'll always succeed because
    #   1) if it was running it will be stopped; and
    #   2) if it was not running we achieved our purpose.
    assert network_ctrl
    network_ctrl.stop()
    return True