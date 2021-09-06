#!/usr/bin/env -S make -f

src = $(shell ls src/*.cpp)
obj = $(shell ls src/*.cpp | sed -e 's/\.cpp$$/\.o/')
dep = $(shell ls src/*.cpp | sed -e 's/\.cpp$$/\.d/')
all = cache \
      cache/name.txt \
      cache/description.json \
      bin/Hepani \
      example/output.json \
      example/output.json.gz \
      example/py8log.json \
      example/hepmc2.json \
      example/output.js \

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

example/py8log.json: example/input.txt bin/Hepani
	bin/Hepani --type py8log --d0 0.001 --d1 5 < $< > $@

example/hepmc2.json: example/input.hepmc bin/Hepani
	bin/Hepani --type hepmc2 --d0 0.001 --d1 5 --event 0 < $< > $@

example/output.json: example/py8log.json
	ln -f $< $@

example/output.json.gz: example/output.json
	gzip -c $< > $@

example/output.js: example/input.txt bin/Hepani
	bin/Hepani -l --type py8log --d0 0.001 --d1 5 < $< > $@

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
