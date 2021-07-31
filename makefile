#!/usr/bin/env -S make -f

all = cache.json Hepani

all: $(all)

clean:
	$(RM) $(all)

cache.json: Cache.py
	./$<

%: %.cpp
	g++ -O2 $(filter %.cpp,$^) -o $@ -lHepMC3
	strip $@

.PHONY: clean
