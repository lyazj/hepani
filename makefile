#!/usr/bin/env -S make -f

all = cache.json Hepani

all: $(all)
	@$(RM) depend

clean:
	$(RM) $(all)

cache.json: Cache.py
	./$<

Hepani: Hepani.cpp
	g++ -O2 $^ -o $@ -lHepMC3

depend: *.cpp
	@g++ -MM $^ | sed -e 's/.*\.o:/Hepani:/' > $@

include depend
