#!/usr/bin/env -S make -f

all = name.txt description.json Hepani

all: $(all)

clean:
	$(RM) $(all)

name.txt description.json : Cache.py
	./$<

%: %.cpp
	g++ -O2 $(filter %.cpp,$^) -o $@ -lHepMC3
	strip $@

.PHONY: clean
