#!/usr/bin/env python3

import particle
import json
import os

if not os.path.isdir('cache'):
    os.mkdir('cache')

description = { }
with open('cache/name.txt', 'w') as name:
    for par in particle.particle.particle.Particle.all():
        # name.write(f'{int(par.pdgid)}:{par.name}\n')
        name.write(f'{int(par.pdgid)}:{par.html_name}\n')
        description[par.pdgid] = par.describe()

with open('cache/description.json', 'w') as descript:
    descript.write(json.dumps(description))
