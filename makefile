#!/usr/bin/env -S make -f

src = $(shell ls src/*.cpp)
obj = $(shell ls src/*.cpp | sed -e 's/\.cpp$$/\.o/')
dep = $(shell ls src/*.cpp | sed -e 's/\.cpp$$/\.d/')
log = $(shell ls example/*.log)
js = $(shell ls example/*.log | sed -e 's/\.log$$/\.js/')
all = cache \
      cache/name.txt \
      cache/description.json \
      bin/Hepani \
      example/output.json \
      example/output.json.gz \
      example/py8log.json \
      example/hepmc2.json \
      example/hepmc3.json \
      $(js)

CXX = g++
CXXFLAGS = -O2 -Wall -Wshadow -Wextra -Iinclude
LDFLAGS = -lHepMC3

all: $(all)

clean:
	rm -rf $(obj) $(dep) $(all)

cache cache/name.txt cache/description.json : bin/Cache
	./$<

bin/Hepani: $(obj)
	$(CXX) $(filter %.o,$^) -o $@ $(LDFLAGS)
	strip $@

example/%.json: example/%.log bin/Hepani
	bin/Hepani --type py8log --d0 0.001 --d1 5 < $< > $@

example/%.js: example/%.log bin/Hepani
	bin/Hepani --local --type py8log --d0 0.001 --d1 5 < $< > $@

example/py8log.json: example/input.txt bin/Hepani
	bin/Hepani --type py8log --d0 0.001 --d1 5 --event 0 < $< > $@

example/hepmc2.json: example/input.hepmc bin/Hepani
	bin/Hepani --type hepmc2 --d0 0.001 --d1 5 --event 0 < $< > $@

example/hepmc3.json: example/input.hepmc3 bin/Hepani
	bin/Hepani --type hepmc3 \
		--d0 0.001 --d1 3 --d2 3 --d3 3 --d4 3 --d5 3 \
		--event 0 < $< > $@

example/output.json: example/py8log.json
	ln -f $< $@

example/output.json.gz: example/output.json
	gzip -c $< > $@

%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(filter %.cpp,$^) -o $@ -c

%.d: %.cpp
	@set -e; dep=`$(CXX) $(CXXFLAGS) $< -MM | sed -e 's/\\\\$$//'`; \
	    (echo src/$$dep; echo src/$$dep | sed -e 's/\.o:/\.d:/') > $@

clean_obj:
	$(RM) $(obj)

clean_dep:
	$(RM) $(dep)

include $(dep)

.PHONY: clean clean_obj clean_dep
