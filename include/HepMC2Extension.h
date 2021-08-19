/*  Copyright (C) 2021 @lyazj
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

#ifndef HEPMC2EXTENSION_HDR
#define HEPMC2EXTENSION_HDR

#include <string>
#include <vector>
#include <iostream>
#include <fstream>
#include <memory>
#include <random>

#include <time.h>

#include <HepMC3/GenEvent.h>
#include <HepMC3/GenParticle.h>
#include <HepMC3/ReaderAsciiHepMC2.h>

namespace HepMC3 {

class HepMC2Index {
public:
  HepMC2Index(std::istream &);
  HepMC2Index(const std::string &);

  size_t size() const { return index.size(); }
  size_t operator[](size_t i) const { return index[i]; }

private:
  std::vector<size_t> index;
};

class HepMC2RandomAccessor {
public:
  HepMC2RandomAccessor(std::istream &);
  HepMC2RandomAccessor(const std::string &);
  ~HepMC2RandomAccessor() { delete pifs; }

  size_t size() const { return index.size(); }
  bool read_event(size_t, GenEvent &);
  bool read_event(GenEvent &);
  bool failed() { return input.failed(); }
  void close() { input.close(); }
  std::shared_ptr<GenRunInfo> run_info() const { return input.run_info(); }

private:
  std::ifstream *pifs = nullptr;
  std::istream is;
  HepMC2Index index;
  ReaderAsciiHepMC2 input;
};

inline HepMC2Index::HepMC2Index(std::istream &is)
{
  std::string buf;
  size_t pos(is.tellg());
  while(getline(is, buf))
  {
    if(buf.substr(0, 2) == "E ")
      index.push_back(pos);
    pos = is.tellg();
  }
}

inline HepMC2Index::HepMC2Index(const std::string &filename)
{
  std::ifstream is(filename);
  operator=(is);
}

inline HepMC2RandomAccessor::HepMC2RandomAccessor(std::istream &_is)
  : is(_is.rdbuf()),
  index(is), input((is.clear(), is))
{

}

inline HepMC2RandomAccessor::HepMC2RandomAccessor(
    const std::string &filename)
  : pifs(new std::ifstream(filename)), is(pifs->rdbuf()),
  index(is), input((is.clear(), is))
{

}

inline bool HepMC2RandomAccessor::read_event(size_t i, GenEvent &evt)
{
  if(i >= size())
    return false;
  is.seekg(index[i]);
  return input.read_event(evt);
}

inline bool HepMC2RandomAccessor::read_event(GenEvent &evt)
{
  static std::default_random_engine dre(time(NULL));
  static size_t sz((dre.discard(1), size()));
  static std::uniform_int_distribution<size_t> uid(0, sz - 1);
  if(!sz)
    return false;
  return read_event(uid(dre), evt);
}

}  // namespace HepMC3

#endif  /* HEPMC2EXTENSION_HDR */
