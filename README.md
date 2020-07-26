ozw thingy
==========


This repository offers a small compilation of shenanigans in the pursuit of a
z-wave client thingy that allows one to grab information to be fed to
Prometheus.

While there are several ways of interacting with a z-wave network, in
particular through libopenzwave (as we rely on), we have found that the
overhead for something that ought to be as simple as grabbing information from
nodes, and having prometheus consuming it, is considerable.

While we understand the appeal of z-wave for home automation, our purpose
comes from an obsessive need to monitor our energy consumption. While we would
love to have the network to be controllable on something like Home Assistant,
the fact is that the interfaces currently provided do not suit our intents:
they focus a lot more on what we would take as a bonus, and not enough on what
we really want -- those juicy data points. Yes, we realize there's a
prometheus exporter for home assistant; but we also found that integrating it
with z-wave makes the data somewhat... weird? Then again, might be our
noobness.

Regardless, this happens to be a fun side-project. Might end up being useless.
Might end up being useful to no one else. But it is fun. :)


in this repo
-------------

In the repository one may find, at time of writing, three approaches:

1. a purely targetted approach to data gathering, that might, or it might
   not, be unfinished -- that would be living under `ozw-cli`.

2. a terminal user interface that does little more than showing the network
   nodes, and their states. It was fun to figure out, but it's very, very
   useless as is. Then again, I wouldn't consider its potential any smaller
   than a vnc-based openzwave client ;)

3. a still-being-much-worked-on rest api, along with a neat frontend.


It's on the latter, `ozw-rest`, that our efforts actively lie. To some extent,
this starts off as an attempt at mimicking open-zwave-control-panel for the
kicks of it, and to learn some new things, like Angular. Turns out we kind of
like the visuals, and decided to commit to it. At time of writing, the
interface does more or less absolutely nothing besides showing nodes and their
informations, in a very useless way might I add; but it is pretty.

The backend is, however, our main focus: we want to make an always-on rest api
to access the z-wave network. Around it we can implement a prometheus
exporter, and feed the frontend client. We could, technically, even feed home
assistant's integration (although it appears to exist efforts to replace the
native openzwave python library). Regardless of all the potential redundancy,
have we mentioned we're doing this mostly for the fun of it?


installation
------------

Well, here's the thing... we're not really sure at this point in time. We have
a vague idea that we are using

* blessed, for `ozw-tui`;
* openzwave's python bindings for pretty much everything
* pydispatcher for openzwave's python bindings events
* fastapi and uvicorn for `ozw-rest`

and possibly a few others. Should we not drop this project because a shinier
new thing has been found, we will make sure to update the dependencies for
every single project in this repo, and maybe even make it pythonesque, with
setups and the likes. Maybe even tests, someday.


LICENSE
-------

All this work, except things that we might lie in this repository licensed by
their authors (over which we claim no ownership) under different licenses, is
licensed under the European Union's Public License v1.2, as published by the
European Comission.

Please find, and read, the LICENSE file in this repository's root.


