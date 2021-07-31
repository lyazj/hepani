#!/usr/bin/env python3

import particle
import json

particles = {}
for par in particle.particle.particle.Particle.all():
    particles[par.pdgid] = {
        'name': par.html_name,
        'describe': par.describe(),
    }

with open('cache.json', 'w') as cache:
    cache.write(json.dumps(particles))
