import time
from datetime import datetime, timedelta
from prometheus_client import CollectorRegistry, Gauge, pushadd_to_gateway

import random


if __name__ == '__main__':

    registry = CollectorRegistry()

    gauge_list = []
    n_nodes = 5
    gw_url = '172.20.3.20:9091'

    for x in range(1, n_nodes+1):

        gauge = Gauge(
            name='consumption_node_{}'.format(x),
            documentation="consumption of node {}".format(x),
            namespace='home',
            unit='watt',
            registry=registry)

        gauge_list.append(gauge)
    
    for x in range(1, n_nodes+1):
        g = gauge_list[x-1]
        value = 1000*random.uniform(0, 1.0)
        g.set(value)
        pushadd_to_gateway(gw_url, job='home_consumption', registry=registry)
        time.sleep(1)
        
