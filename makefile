#!/usr/bin/env -S make -f

all = name.txt description.json Hepani output.json py8log.json hepmc2.json

all: $(all)

clean:
	$(RM) $(all)

name.txt description.json : Cache.py
	./$<

%: %.cpp
	g++ -O2 $(filter %.cpp,$^) -o $@ -lHepMC3
	strip $@

py8log.json: Hepani
	./$< --type py8log < input.txt >$@

hepmc2.json: Hepani
	./$< --type hepmc2 < input.hepmc >$@

output.json: py8log.json
	ln -s $< $@

.PHONY: clean
