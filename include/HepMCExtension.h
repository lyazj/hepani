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

#ifndef HEPMCEXTENSION_HDR
#define HEPMCEXTENSION_HDR

#include <string>
#include <vector>
#include <iostream>
#include <fstream>
#include <memory>
#include <random>

#include <time.h>

#include <HepMC3/GenEvent.h>
#include <HepMC3/GenParticle.h>
#include <HepMC3/ReaderAscii.h>
#include <HepMC3/ReaderAsciiHepMC2.h>

namespace HepMC3 {

class HepMCIndex {
public:
  HepMCIndex(std::istream &);
  HepMCIndex(const std::string &);

  size_t size() const { return index.size(); }
  size_t operator[](size_t i) const { return index[i]; }

private:
  std::vector<size_t> index;
};

template<class Reader>
class HepMCRandomAccessor {
public:
  HepMCRandomAccessor(std::istream &);
  HepMCRandomAccessor(const std::string &);
  ~HepMCRandomAccessor() { delete pifs; }

  size_t size() const { return index.size(); }
  bool read_event(size_t, GenEvent &);
  bool read_event(GenEvent &);
  bool failed() { return input.failed(); }
  void close() { input.close(); }
  std::shared_ptr<GenRunInfo> run_info() const { return input.run_info(); }

private:
  std::ifstream *pifs = nullptr;
  std::istream is;
  HepMCIndex index;
  Reader input;
};

inline HepMCIndex::HepMCIndex(std::istream &is)
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

inline HepMCIndex::HepMCIndex(const std::string &filename)
{
  std::ifstream is(filename);
  operator=(is);
}

template<class Reader>
inline HepMCRandomAccessor<Reader>::HepMCRandomAccessor(std::istream &_is)
  : is(_is.rdbuf()),
  index(is), input((is.clear(), is))
{

}

template<class Reader>
inline HepMCRandomAccessor<Reader>::HepMCRandomAccessor(
    const std::string &filename)
  : pifs(new std::ifstream(filename)), is(pifs->rdbuf()),
  index(is), input((is.clear(), is))
{

}

template<class Reader>
inline bool HepMCRandomAccessor<Reader>::read_event(size_t i, GenEvent &evt)
{
  if(i >= size())
    return false;
  is.seekg(index[i]);
  return input.read_event(evt);
}

template<class Reader>
inline bool HepMCRandomAccessor<Reader>::read_event(GenEvent &evt)
{
  static std::default_random_engine dre(time(NULL));
  static size_t sz((dre.discard(1), size()));
  static std::uniform_int_distribution<size_t> uid(0, sz - 1);
  if(!sz)
    return false;
  return read_event(uid(dre), evt);
}

typedef HepMCRandomAccessor<ReaderAsciiHepMC2> HepMC2RandomAccessor;
typedef HepMCRandomAccessor<ReaderAscii> HepMC3RandomAccessor;

}  // namespace HepMC3

#endif  /* HEPMCEXTENSION_HDR */
