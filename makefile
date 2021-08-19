#!/usr/bin/env -S make -f

all = cache \
      cache/name.txt \
      cache/description.json \
      Hepani \
      example/output.json \
      example/output.json.gz \
      example/py8log.json \
      example/hepmc2.json \

all: $(all)

clean:
	rm -rf $(all)

cache cache/name.txt cache/description.json : Cache.py
	./$<

Hepani:
	g++ -O2 src/* -o $@ -Iinclude -lHepMC3
	strip $@

example/py8log.json: Hepani
	./$< --type py8log --d0 0.001 --d1 5 < example/input.txt >$@

example/hepmc2.json: Hepani
	./$< --type hepmc2 --d0 0.001 --d1 5 < example/input.hepmc >$@

example/output.json: example/py8log.json
	ln -f $< $@

example/output.json.gz: example/output.json
	gzip -c $< > $@

.PHONY: clean
