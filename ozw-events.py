#!/usr/bin/python3

import time
from datetime import datetime as dt, timedelta
from typing import Dict, List
from threading import Lock

from openzwave.controller import ZWaveController
from openzwave.network import ZWaveNetwork
from openzwave.option import ZWaveOption
from openzwave.node import ZWaveNode
from openzwave.value import ZWaveValue

from pydispatch import dispatcher
from blessed import Terminal

#from logview import LogView
from fancything.statusbuffer import StatusBuffer, Buffer
from fancything.composer import Composer, ComposerContext
from fancything.dialog import Dialog

def get_network_state(network):

    for attr in dir(network):
        if attr.startswith('STATE_'):
            state = getattr(network, attr)
            if network.state == state:
                return attr
    return "UNKNOWN"


class BufferController:

    def __init__(self, sb: StatusBuffer, network: ZWaveNetwork):
        self.sb = sb
        self.network = network
        self.term = sb.term
        self.update_lock = Lock()
        self.nodes = {}
        self.buffer_lst = []
        self.sb.buffer.append("foobar")

        self.network_last_known_state = None
        self.network_available_since = None
        self.network_starting_epochs = 0
        self.starting_time = dt.utcnow()
        

    def add_node(self, node: ZWaveNode):

        with self.update_lock:
            self.nodes[node.node_id] = node
            self.update_buffer()
        pass

    def update_value(self, node, value):
        pass


    def _get_network_status(self):

        status_msg:str = None
        network = self.network
        term = self.term

        if network.state == network.STATE_STOPPED:
            netstate = f"{term.red}STOPPED"
        elif network.state == network.STATE_STARTED:
            netstate = f"{term.grey}STARTING"

        elif network.state == network.STATE_READY:
            netstate = f"{term.green}READY"
        elif network.state == network.STATE_AWAKED:
            netstate = f"{term.yellow}AWAKED"

        status_msg = f"{term.bold}NETWORK STATE: {netstate}"
        return network.state, status_msg


    def update_status(self):
        term = self.term
        detail_msg = ''
        net_state, status_msg = self._get_network_status()

        cur_time = dt.utcnow()
        time_diff = (cur_time - self.starting_time).seconds

        if self.network_last_known_state != net_state:
            if self.network_last_known_state == self.network.STATE_AWAKED or \
                self.network_last_known_state == self.network.STATE_READY:
                self.network_available_since = None
            elif net_state == self.network.STATE_READY or \
                    net_state == self.network.STATE_AWAKED:
                self.network_available_since = cur_time

            last_known_state = net_state

        if net_state == self.network.STATE_STARTED:
            icon = '\u29d6' if self.network_starting_epochs%2 == 0 \
                            else '\u29d7'

            self.network_starting_epochs += 1
            detail_msg = \
                f"{term.grey} ({time_diff}s) " \
                f"{term.cyan}starting network; this can take a while {icon}"

        elif net_state == self.network.STATE_READY or \
             net_state == self.network.STATE_AWAKED:
            available_since = available_since
            secs = (cur_time - available_since).seconds
            detail_msg = \
                f"{term.cyan}network available since {available_since} "\
                f"({secs}s)"

        top_status_lst = [status_msg]
        top_status_lst.append(
            "total nodes: {}".format(len(self.nodes)))
        self.sb.set_top_status(top_status_lst)
        self.sb.set_bottom_status([detail_msg])
        pass


    def update_buffer(self):

        def _add_field(field, msg=''):
            res = msg + "   " + field
            return res

        self.buffer_lst = []
        node: ZWaveNode
        term = self.sb.term

        header = "{:9s}   {:25s}   {:9s}   {:15s}   {:7s}".format(
            "node ID", "product", "type", "stage", "state"
        )

        self.buffer_lst.append(f"{term.bold_slategray2}{header}")
        self.buffer_lst.append('-'*term.width)

        for nid in self.nodes.keys():
            node = "node #{0:=03d}".format(nid)
            msg = f"{term.bold_white}{node:9}"
            node = self.nodes[nid]
            msg = msg + _add_field(f"{node.product_name:25}")
            msg = msg + _add_field(f"{node.product_type:9}")            
            msg = msg + _add_field("{:15s}".format(node.query_stage[:15]))
            
            node_state = None
            if node.is_ready:
                node_state = f"{term.bold_green}READY"
            elif node.is_awake:
                node_state = f"{term.bold_yellow}AWAKE"
            elif node.is_failed:
                node_state = f"{term.bold_red}FAILED"
            if node_state:
                msg = msg + _add_field(f"{node_state:7}")

            self.buffer_lst.append(msg)

        self.sb.set_buffer(self.buffer_lst)

    def update(self):

        self.update_status()
        self.update_buffer()

    def node_add(self):
        pass

    def handled_buffer_events(self):
        return list('aAqQ')

    def handle_buffer_event(self, ch):
        if ch not in self.handled_buffer_events():
            return

        if ch in 'qQ':
            import sys
            sys.exit(0)
        elif ch in 'aA':
            self.node_add()

        pass


class EventHandler:

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

    def handle_value(self, signal, **kwargs):
        
        node: ZWaveNode = kwargs['node']
        value: ZWaveValue = kwargs['value']
        self.controller.add_node(node)



    def handle_node_event(self, signal, **kwargs):
        if not self.controller:
            return

        self.controller.add_node(kwargs['node'])
        pass
#        self.controller.add_node(kwargs['node'])

    def register(self, ctrl: BufferController):
        self.controller = ctrl


class HelpDialog:

    def __init__(self, term: Terminal):
        self.term = term
        self.dialog = Dialog(term)

        content = [
            "         HELP         ",
            " -------------------- ",
            "  q, Q     exit       ",
            "  a, A     add node   ",
            "  h, H     show help  ",
            "                      ",
        ]

        self.dialog.set_content(content)
        self.dialog.set_trigger(['h', 'H'], self.handle_event)

    def handle_event(self, ch):
        if ch not in 'hH':
            return
        self.dialog.toggle_show()


def main():

    term = Terminal()

    options = ZWaveOption(device='/dev/ttyACM0')
    options.set_log_file('test.log')
    options.set_append_log_file(True)
    options.set_console_output(False)
    options.set_logging(True)
    options.lock()

    network = ZWaveNetwork(options)
    event_handler = EventHandler()

    start_time = dt.utcnow()

    composer: Composer
    with ComposerContext(term) as composer:

        sb = StatusBuffer(term)
        help_dialog = HelpDialog(term)

        composer.add_widget(sb)
        composer.add_widget(help_dialog.dialog)

        sb.set_buffer_behavior(StatusBuffer.BEHAVIOR_TOP)
        controller = BufferController(sb, network)
        event_handler.register(controller)
        print("> {}".format(controller.handled_buffer_events()))
        sb.set_trigger(controller.handled_buffer_events(),
                       controller.handle_buffer_event)

        starting_spinner = 0
        available_since = None

        last_known_state = None
        while True:
            ch = term.inkey(timeout=0.25)
            if ch:
                composer.handle_inkey(ch)
            controller.update()
            composer.refresh()
            time.sleep(0.25)



if __name__ == '__main__':
    main()