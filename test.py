import time
import json
from datetime import datetime as dt, timedelta
from typing import Dict, List
import pprint

from pydispatch import dispatcher

from openzwave.controller import ZWaveController
from openzwave.network import ZWaveNetwork
from openzwave.option import ZWaveOption
from openzwave.node import ZWaveNode
from openzwave.value import ZWaveValue


def get_network_state(network):

    for attr in dir(network):
        if attr.startswith('STATE_'):
            state = getattr(network, attr)
            if network.state == state:
                return attr
    return "UNKNOWN"


def get_node_state(node):
    if node.is_ready:
        return "READY"
    elif node.is_awake:
        return "AWAKE"
    elif node.is_failed:
        return "FAILED"
    else:
        return "UNKNOWN"


class SetObjectEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            lst = [x for x in obj]
            return lst
        return obj


def print_node_values(values: Dict[int, Dict]):
    print("`-- values:")
    for v in values.values():
        for entry_id, entry in v.items(): # type: entry = ZWaveValue
            print("   `-- #{}:".format(entry_id))
            #print("        {}".format(str(entry)))
            entry: ZWaveValue
            print("       label: {}".format(entry.label))
            print("       units: {}".format(entry.units))
            print("       value: {}".format(entry.data))
            print("  value type: {} (type: {})".format(entry.type, str(type(entry.data))))
            print("")


def print_node(node: ZWaveNode, print_values=True):

    print("--- node #{}'s info ({}):".format(node.node_id, get_node_state(node)))
    print("            id: {}".format(node.node_id))
    print("       home id: {}".format(node.home_id))
    print("          name: {}".format(node.name))
    print("      location: {}".format(node.location))
    print("         state: {}".format(get_node_state(node)))
    print("  manufacturer: {}".format(node.manufacturer_name))
    print("  product name: {}".format(node.product_name))
    print("    product id: {}".format(node.product_id))
    print("     neighbors: {}".format(node.neighbors))
    print("")

    if print_values:
        values = node.get_values_by_command_classes(genre='User')
        print_node_values(values)


def grab_node_values(node: ZWaveNode):
    values_dict: Dict[str, float] = {}

    values = node.get_values_by_command_classes(genre='User')
    for v in values.values():
        for entry in v.values():
            entry: ZWaveValue
            units: str = entry.units
            if units == 'kWh' or units == 'W' or \
               units == 'V' or units == 'A':
                assert isinstance(entry.data, float)
                values_dict[units] = entry.data
    return values_dict


def grab_node_data(node: ZWaveNode, output=False):
    data: Dict[str, ZWaveNode] = {}
    values = node.get_values(genre='User')
    value: ZWaveValue

    if output:
        print("--> grab node data for {}".format(node.node_id))
        print(" -- num values: {}".format(len(values)))
    for value in values.values():
        if output:
            print(" -- value: ")
            print("   -  type: {}".format(type(value)))
            print("   - units: {}".format(value.units))
        units = value.units
        if units == 'kWh' or units == 'W' or \
           units == 'V' or units == 'A':
            assert(isinstance(value.data, float))
            data[units] = value
    return data


def want_this_value(value: ZWaveValue) -> bool:
    units = value.units
    if units == 'kWh' or units == 'W' or \
       units == 'V' or units == 'A':
        return True
    return False


class DataValue:

    timestamp: dt = None
    node_id: int = None
    node_name: str = None
    unit: str = None
    value: float = None

    def __init__(self, node: ZWaveNode, value: ZWaveValue):
        self.node_id = node.node_id
        self.node_name = node.name
        self.unit = value.units
        self.value = value.data
        self.timestamp = dt.utcnow()

    def __str__(self):
        return "[{}] -- node #{} name '{}': {} = {}".format(
            self.timestamp,
            self.node_id, self.node_name, self.unit, self.value
        )


class DataNode:
    node: ZWaveNode = None
    values: List[ZWaveValue]  # use this solely to trigger updates
    values_per_unit: Dict[str, List[DataValue]] # our time series
    last_values_timestamp: Dict[str, dt]


    def __init__(self, node):
        self.node = node
        self.init_from_node(node)
        self.values_per_unit = {}
        self.values = []
        self.last_values_timestamp = {}
    

    def init_from_node(self, node):
        values = node.get_values(genre='User')
        value: ZWaveValue
        for value in values.values():
            if not want_this_value(value):
                continue
            self.values.append(value)
            self.update_value(value)


    def handle_value(self, value: ZWaveValue):
        if not want_this_value(value):
            return

        if value.node.node_id != self.node.node_id:
            print("  [error!] node id mismatch!")
            return

        units = value.units
        if units not in self.values_per_unit:
            self.values_per_unit[units] = []

        print("[handle] node #{}, unit = '{}', value = {}".format(
            value.node.node_id, value.units, value.data
        ))
        self.update_value(value)


    def update_value(self, value: ZWaveValue):
        unit = value.units
        if unit not in self.values_per_unit:
            self.values_per_unit[unit] = []

        datavalue = DataValue(self.node, value)
        print("[update] {}".format(datavalue))
        if unit in self.last_values_timestamp:
            last_update = self.last_values_timestamp[unit]
            td = datavalue.timestamp - last_update
            if td < timedelta(seconds=5):
                # assume repeat
                return
        self.last_values_timestamp[unit] = datavalue.timestamp
        self.values_per_unit[unit].append(datavalue)
        self.values.append(datavalue)



class DataStore:

    datastore: Dict[int, DataNode] = {}
    is_evicting: bool = False

    def __init__(self):
        dispatcher.connect(self.handle_value, ZWaveNetwork.SIGNAL_VALUE)
        dispatcher.connect(self.handle_node_event, ZWaveNetwork.SIGNAL_NODE_ADDED)
        dispatcher.connect(self.handle_node_event, ZWaveNetwork.SIGNAL_NODE_NEW)


    def add_node(self, node: ZWaveNode):
        pass


    def get_node(self, node_id):
        if not node_id in self.datastore:
            return None
        return self.datastore[node_id]


    @classmethod
    def do_we_care(cls, node: ZWaveNode, value: ZWaveValue = None):

        if node.product_id != '0x0060':
            return False

        if not value or want_this_value(value):
            return True

        return False


    def dump_to_stdout(self):
        for node_id, datanode in self.datastore.items():
            print("--> node #{}".format(node_id))

            for values in datanode.values_per_unit.values():
                value: DataValue
                for value in values:
                    print("  [{}]  {} = {}".format(
                        value.timestamp, value.unit, value.value
                    ))
        return


    def dump_to_disk(self):

        for node_id, datanode in self.datastore.items():
            print("  [write] --> node {}".format(node_id))

            ts = dt.utcnow()
            #filename = "{}_{}.{}.log".format(ts.isoformat(), node_id, unit)

            for unit, values in datanode.values_per_unit.items():
                value_lst = []
                value: DataValue
                filename = "{}_{}.{}.log".format(ts.isoformat(), node_id, unit)
                for value in values:
                    print("         `-- {}, value: {}".format(unit, str(value)))
                    value_lst.append({
                        'node': value.node_id,
                        'name': value.node_name,
                        'unit': value.unit,
                        'value': value.value
                    })
                #pprint.pprint(value_lst)
                with open(filename, 'a') as f:
                    json.dump(value_lst, f)

        return


    def dump(self, stdout=False, disk=False):

        if stdout:
            self.dump_to_stdout()
        if disk:
            self.dump_to_disk()


    def evict(self):
        # this is probably overkill, and most definitely not safe ;)
        self.is_evicting = True
        self.datastore = {}
        self.is_evicting = False


    def refresh(self):
        #self.dump(stdout=True, disk=False)

        # clear in-memory cache first
        ds = self.datastore
        self.evict()

        node: DataNode
        for node in ds.values():
            value: ZWaveValue
            for value in node.values:
                value.refresh()


    def handle_value(self, signal, **kwargs):
        # print("--> handling value ({}): {}".format(signal, kwargs))

        if self.is_evicting: # don't handle while evicting
            return

        node: ZWaveNode = kwargs['node']
        value: ZWaveValue = kwargs['value']

        if not self.do_we_care(node, value):
            return

        if not node.node_id in self.datastore:
            return

        print("[changed] --> node #{}: units '{}' = {}".format(
            node.node_id, value.units, value.data
        ))
        return self.datastore[node.node_id].handle_value(value)


    def handle_node_event(self, signal, **kwargs):
        if self.is_evicting: # don't handle while evicting
            return

        node: ZWaveNode = kwargs['node']
        if not self.do_we_care(node):
            return

        if signal == ZWaveNetwork.SIGNAL_NODE_ADDED:
            print("   [node] --> added node #{}".format(node.node_id))
        elif signal == ZWaveNetwork.SIGNAL_NODE_NEW:
            print("   [node] --> new node #{}".format(node.node_id))

        if node.node_id in self.datastore:
            print("   [node] --- known node; ignore.")
            return
        
        datanode = DataNode(node)
        self.datastore[node.node_id] = datanode


if __name__ == '__main__':

    options = ZWaveOption(device='/dev/ttyACM0')
    options.set_log_file('test.log')
    options.set_append_log_file(True)
    options.set_console_output(False)
    options.set_logging(True)
    options.lock()

    network = ZWaveNetwork(options)

    ds = DataStore()

    init_start = dt.utcnow()
    cur_state=None
    while True:
        if cur_state != network.state:
            if cur_state is not None:
                print("")
            cur_state = network.state
            print("-> network state: {}".format(get_network_state(network)))
            if network.state == network.STATE_STARTED:
                print("-- starting network; this can take a while", end=" ", flush=True)

        if network.state == network.STATE_READY:
            print("-- network READY", flush=True)
            break
        elif network.state == network.STATE_AWAKED:
            print("\n-- network awoken; some devices may be missing :(", flush=True)
            break
        elif network.state == network.STATE_STARTED:
            print(".", end='', flush=True)
        time.sleep(1)
    init_end = dt.utcnow()
    print("-- initialization took {}".format(init_end - init_start))        


    backoff = 90 # seconds
    while True:
        ds.dump_to_disk()
        ds.refresh()
        time.sleep(backoff)

    import code
    code.interact(local=locals())