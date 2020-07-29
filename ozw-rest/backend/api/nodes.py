import logging
from fastapi import APIRouter, HTTPException
from ..state import State, state
from ..network import NetworkRunningException, NetworkNotReadyException

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get('/')
def get_nodes(all: bool = False):
    try:
        if all:
            return state.get_nodes_dict()
        nodes = state.get_nodes_simple()
    except (NetworkRunningException, NetworkNotReadyException) as e:
        raise HTTPException(status_code=428, detail=str(e))

    logger.info("get nodes: {}".format(nodes))
    return nodes

@router.get('/roles')
def get_nodes_roles():
    try:
        nodes = state.get_nodes()
    except (NetworkRunningException, NetworkNotReadyException) as e:
        raise HTTPException(status_code=428, detail=str(e))
    
    logger.info("get node roles: nodes = {}".format(nodes))
    roles = {}
    for n in nodes.values():
        roles[n.node_id] = n.role

    return roles

@router.get('/types')
def get_nodes_types():
    try:
        nodes = state.get_nodes()
    except (NetworkRunningException, NetworkNotReadyException) as e:
        raise HTTPException(status_code=428, detail=str(e))
    logger.info("get node types: nodes = {}".format(nodes))
    types = {}
    for n in nodes.values():
        types[n.node_id] = n.type
    return types

@router.get('/{node_id}/scope/{scope}')
def get_node_scope(node_id: int, scope: str):
    logger.info("get scope '{}' for node id = {}".format(
        scope, node_id
    ))

    return get_node_values(node_id, scope)
 

@router.get('/{node_id}/values')
def get_node_values(node_id: int, scope: str = None):
    logger.info(f"get values for node id = {node_id} (scope: {scope})")

    # we are skipping openzwave's lib's get_values() function because
    # it kept returning a whole bunch of nothing for whatever genre we
    # tried. Thus, we're grabbing the values outselves.

    try:
        nodes = state.get_nodes()
    except (NetworkRunningException, NetworkNotReadyException) as e:
        raise HTTPException(status_code=428, detail=str(e))
    if node_id not in nodes:
        raise HTTPException(status_code=404, detail="node not found")

    node = nodes[node_id]
    all_values = node.get_values()

    genres = ['user', 'config', 'system']
    wanted = scope.lower() if scope else None
    if wanted and wanted not in genres:
        # these also happen to be the ones we're supporting ;)
        raise HTTPException(status_code=404, detail="scope not found")

    values = []
    value: ZWaveValue
    for value in all_values.values():
        if wanted and value.genre.lower() != wanted:
            continue

        # we are not interested in all the k/v in the dictionary.
        # let's parse out what we need.
        value_raw = value.to_dict(extras=[])
        value_proper = {
            'label': str(value_raw.get('label', '')),
            'units': str(value_raw.get('units', '')),
            'data':  str(value_raw.get('data', '')),
            'genre': str(value_raw.get('genre', '')).lower()
        }
        values.append(value_proper)

    return values