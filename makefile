#!/usr/bin/env -S make -f

all = name.txt description.json Hepani output.json

all: $(all)

clean:
	$(RM) $(all)

name.txt description.json : Cache.py
	./$<

%: %.cpp
	g++ -O2 $(filter %.cpp,$^) -o $@ -lHepMC3
	strip $@

output.json: Hepani
	./$< --type py8log < input.txt >$@

.PHONY: clean
