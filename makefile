#!/usr/bin/env -S make -f

all = name.txt description.json Hepani output.json output.json.gz py8log.json hepmc2.json

all: $(all)

clean:
	$(RM) $(all)

name.txt description.json : Cache.py
	./$<

%: %.cpp
	g++ -O2 $(filter %.cpp,$^) -o $@ -lHepMC3
	strip $@

py8log.json: Hepani
	./$< --type py8log --d0 0.001 --d1 5 < input.txt >$@

hepmc2.json: Hepani
	./$< --type hepmc2 --d0 0.001 --d1 5 < input.hepmc >$@

output.json: py8log.json
	ln -f $< $@

output.json.gz: output.json
	gzip -c $< > $@

.PHONY: clean
