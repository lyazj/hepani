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

#include "Hepani.h"

#include <map>
#include <sstream>
#include <fstream>
#include <iomanip>
#include <iterator>
#include <limits>
#include <stdexcept>
#include <algorithm>
#include <type_traits>

#include <stdlib.h>
#include <assert.h>

using namespace std;

double &Array::operator[](size_t i)
{
  return data[i];
}
const double &Array::operator[](size_t i) const
{
  return data[i];
}

Array Array::operator+() const
{
  return *this;
}
Array Array::operator-() const
{
  return -1 * *this;
}

Array &Array::operator+=(const Array &other)
{
  for(size_t i = 0; i < 3; ++i)
    data[i] += other.data[i];
  return *this;
}
Array &Array::operator-=(const Array &other)
{
  for(size_t i = 0; i < 3; ++i)
    data[i] -= other.data[i];
  return *this;
}
Array &Array::operator*=(double d)
{
  for(size_t i = 0; i < 3; ++i)
    data[i] *= d;
  return *this;
}
Array &Array::operator/=(double d)
{
  for(size_t i = 0; i < 3; ++i)
    data[i] /= d;
  return *this;
}

Array operator+(const Array &A, const Array &B)
{
  return Array(A) += B;
}
Array operator-(const Array &A, const Array &B)
{
  return Array(A) -= B;
}
Array operator*(const Array &A, double d)
{
  return Array(A) *= d;
}
Array operator*(double d, const Array &A)
{
  return Array(A) *= d;
}
Array operator/(const Array &A, double d)
{
  return Array(A) /= d;
}

// static inline istream &pass(istream &is, char c)
// {
//   return is.ignore(numeric_limits<streamsize>::max(), c);
// }
// 
// istream &operator>>(istream &is, Array &arr)
// {
//   pass(is, '[') >> arr[0];
//   for(size_t i = 1; i < 3; ++i)
//     pass(is, ',') >> arr[i];
//   return pass(is, ']');
// }

ojsonstream &Array::print(ojsonstream &ojs) const
{
  return ojs << data;
}

NameCache::NameCache(istream &is)
{
  int pid;
  char buf;
  string name;
  while(is >> pid && is >> buf)
  {
    if(buf != ':')
    {
      is.setstate(is.failbit);
      break;
    }
    if(!getline(is, name))
      break;
    data[pid] = name;
  }
}

NameCache::NameCache(const string &filename)
{
  ifstream ifs(filename);
  NameCache nc(ifs);
  if(ifs.eof())
    operator=(nc);
}

string *NameCache::find(int pid)
{
  auto iter(data.find(pid));
  if(iter == data.end())
    return nullptr;
  return &iter->second;
}

NameCache name_cache("name.txt");

inline void general_loading_assign(Particle &particle)
{
  particle.r = {0.0};
  if(particle.e)
    particle.v = particle.p / particle.e;
  else
    particle.v = {0.0};
  particle.birth = particle.death = phase_undef;
}

istream &operator>>(istream &is, Parpy8log &parpy8log)
{
  is >> parpy8log.no >> parpy8log.id;
  is >> parpy8log.name >> parpy8log.status;
  is >> parpy8log.mothers[0] >> parpy8log.mothers[1];
  is >> parpy8log.daughters[0] >> parpy8log.daughters[1];
  is >> parpy8log.colours[0] >> parpy8log.colours[1];
  is >> parpy8log.p[0] >> parpy8log.p[1] >> parpy8log.p[2];
  is >> parpy8log.e >> parpy8log.m;

  general_loading_assign(parpy8log);

  return is;
}

template<class T>
static auto get_birth(uint32_t i, T &pars) ->
  typename enable_if<is_base_of<Particle,
  typename remove_reference<decltype(pars[0])>::type
  >::value, uint32_t>::type
{
  if(pars[i].birth == phase_undef)
  {
    static unsigned depth = 0;
    if(depth >= pars.size())
      throw runtime_error("maximum recursive depth exceeded");
    ++depth;

    pars[i].birth = 0;
    for(uint32_t m : pars[i].momset)
      pars[i].birth = max(pars[i].birth, get_birth(m, pars) + 1);

    --depth;
  }
  return pars[i].birth;
}

/* parindex and pars undefined if false returned */
template<class T>
static auto general_process(Particles &particles, Parindex &parindex,
    T &pars, Durations &durations, Timeline &timeline) ->
  typename enable_if<is_base_of<Particle,
  typename remove_reference<decltype(pars[0])>::type
  >::value, bool>::type
{
  /* supply PDG information */
  for(Particle &par : pars)
  {
    string *pname(name_cache.find(par.id));
    if(pname)
      par.name = *pname;
  }

  /* build index */
  parindex.clear();
  try {
    for(uint32_t i = 0; i < pars.size(); ++i)
    {
      uint32_t birth(get_birth(i, pars));
      if(parindex.size() < birth + 1)
        parindex.resize(birth + 1);
      parindex[birth].push_back(i);
    }
  }
  catch(const runtime_error &) {
    return false;
  }
  if(parindex.size() < 2)
    return false;

  /* build timeline */
  timeline.assign(parindex.size(), duration);
  for(uint32_t i = 0; i < timeline.size(); ++i)
  {
    double val(durations[to_string(i)]);
    if(val)
      timeline[i] = val;
  }
  for(uint32_t i = 1; i < timeline.size(); ++i)
    timeline[i] += timeline[i - 1];

  /* do general calculation orderly */
  assert(parindex[0].size() == 1 && parindex[0][0] == 0);
  pars[0].death = 1;
  for(uint32_t i : parindex[1])
    pars[i].r = -pars[i].v * (timeline[1] - timeline[0]);
  for(uint32_t p = 2; p < parindex.size(); ++p)
    for(uint32_t i : parindex[p])
    {
      double e_sum = 0.0;
      for(uint32_t m : pars[i].momset)
      {
        e_sum += pars[m].e;
        pars[i].r += pars[m].e * (pars[m].r + pars[m].v *
            (timeline[p - 1] - timeline[pars[m].birth - 1]));
        pars[m].death = min(pars[m].death, p);
      }
      if(e_sum)
        pars[i].r /= e_sum;
    }

  /* make result copy */
  particles.clear();
  particles.resize(parindex.size());
  for(uint32_t i = 0; i < parindex.size(); ++i)
    for(uint32_t j = 0; j < parindex[i].size(); ++j)
      particles[i].push_back(pars[parindex[i][j]]);
      // for(uint32_t p = i;
      //     p < pars[parindex[i][j]].death && p < parindex.size(); ++p)
      // {
      //   particles[p].push_back(pars[parindex[i][j]]);
      //   if(p)
      //   {
      //     double time(timeline[p - 1]);
      //     uint32_t birth(particles[p].back().birth);
      //     if(birth)
      //       time -= timeline[birth - 1];
      //     particles[p].back().r += particles[p].back().v * time;
      //   }
      // }

  return true;
}

/* parpy8logs undefined if false returned */
static bool load_py8log(Parpy8logs &parpy8logs, const string &log)
{
  size_t start(log.find("PYTHIA Event Listing  (complete event)"));
  if(start == log.npos)
    return false;
  start = log.find("no", start);
  if(start == log.npos)
    return false;
  start = log.find("\n", start);
  if(start == log.npos)
    return false;

  size_t finish(log.find("End PYTHIA Event Listing", start));
  if(finish == log.npos)
    return false;
  finish = log.rfind("sum", finish);
  if(finish == log.npos)
    return false;
  finish = log.rfind("\n", finish);
  if(start == log.npos)
    return false;

  if(start > finish)
    return false;
  istringstream iss(log.substr(start, finish - start));
  istream_iterator<Parpy8log> it_beg(iss), it_end;
  parpy8logs.assign(it_beg, it_end);
  if(!iss.eof())                      // Check completeness
    return false;

  uint32_t idx(0);
  for(Parpy8log &parpy8log : parpy8logs)
  {
    if(parpy8log.no != idx)           // Check element orders
      return false;

    for(uint32_t m : parpy8log.mothers)  // Build hierachy
      if(m >= parpy8logs.size())         // Check indices
        return false;
      else if(m)                         // 0 can be a placeholder...
      {
        parpy8log.momset.insert(m);
        parpy8logs[m].dauset.insert(idx);
      }
    if(parpy8log.momset.empty() && idx)  // ...or a real mother...
    {
      parpy8log.momset.insert(0);
      parpy8logs[0].dauset.insert(idx);
    }

    for(uint32_t d : parpy8log.daughters)
      if(d >= parpy8logs.size())
        return false;
      else if(d)                         // ...but not a daughter
      {
        parpy8log.dauset.insert(d);
        parpy8logs[d].momset.insert(idx);
      }

    ++idx;
  }

  return true;
}


/* pars undefined if false returned */
static bool load_hepmc2(Pars &pars, istream &is, size_t index)
{
  HepMC2RandomAccessor h2ra(is);
  GenEvent evt;
  if(index == (size_t)-1)
  {
    if(!h2ra.read_event(evt))
      return false;
  }
  else
  {
    if(!h2ra.read_event(index, evt))
      return false;
  }

  pars = {{
    .no = 0,
    .id = 90,
    .name = "(system)",
    .status = 11,
    .colours = {0},
    .r = {0.0},
    .v = {0.0},
    .p = {0.0},
    .e = 0.0,
    .m = 0.0,
    .birth = phase_undef,
    .death = phase_undef,
  }};

  pars.resize(evt.particles().size() + 1);

  for(GenParticlePtr pparticle : evt.particles())
  {
    uint32_t no(pparticle->id());
    if(!no || no >= pars.size())
      return false;

    Particle &particle(pars[no]);

    particle.no = no;
    particle.id = pparticle->pid();
    particle.status = pparticle->status();

    unsigned int attribute_state(0);
    for(const string &name : pparticle->attribute_names())
    {
      if(name == "flow1")
      {
        particle.colours[0] =
          pparticle->attribute<IntAttribute>("flow1")->value();
        attribute_state |= 1U << 0;
      }
      else if(name == "flow2")
      {
        particle.colours[1] =
          pparticle->attribute<IntAttribute>("flow2")->value();
        attribute_state |= 1U << 1;
      }
      if(attribute_state == ~(~0U << 2))
        break;
    }
    for(int i = 0; i < 2; ++i)
      if(!(attribute_state & (1U << i)))
        particle.colours[i] = 0;

    const FourVector &momentum(pparticle->momentum());
    particle.p = {momentum.px(), momentum.py(), momentum.pz()};
    particle.e = momentum.e();
    particle.m = pparticle->generated_mass();

    for(GenParticlePtr pparent : pparticle->parents())
      particle.momset.insert(pparent->id());
    for(GenParticlePtr pchild : pparticle->children())
      particle.dauset.insert(pchild->id());
    if(particle.momset.empty())
    {
      particle.momset.insert(0);
      pars[0].dauset.insert(particle.no);
    }

    general_loading_assign(particle);
  }

  return true;
}

bool System::from_py8log(istream &is)
{
  ostringstream oss;
  oss << is.rdbuf();
  string log(oss.str());

  Parpy8logs parpy8tmps;
  if(!load_py8log(parpy8tmps, log))
    return false;

  Particles partitmps;
  Parindex paridxtmp;
  if(!general_process(
        partitmps, paridxtmp, parpy8tmps, durations, timeline))
    return false;

  swap(particles, partitmps);
  swap(parindex, paridxtmp);
  swap(parpy8logs, parpy8tmps);
  return true;
}

bool System::from_hepmc2(istream &is, size_t index)
{
  ostringstream oss;
  oss << is.rdbuf();
  istringstream iss(oss.str());

  Pars partmps;
  if(!load_hepmc2(partmps, iss, index))
    return false;

  Particles partitmps;
  Parindex paridxtmp;
  if(!general_process(
        partitmps, paridxtmp, partmps, durations, timeline))
    return false;

  swap(particles, partitmps);
  swap(parindex, paridxtmp);
  swap(pars, partmps);

  for(uint32_t i : parindex[1])
    pars[0].e += pars[i].e;
  particles[0][0].e = particles[0][0].m = pars[0].m = pars[0].e;

  return true;
}

ojsonstream &Particle::print(ojsonstream &ojs) const
{
  return prt_obj(
      ojs,
      KVP(no),
      KVP(id),
      KVP(name),
      KVP(status),
      KVP(colours),
      KVP(r),
      KVP(v),
      KVP(e),
      KVP(m),
      KVP(birth),
      KVP(death),
      KVP(momset),
      KVP(dauset)
  );
}

bool System::to_json(std::ostream &os) const
{
  ojsonstream ojs(os.rdbuf());
  ojs.setindent(0).setbreakline(0).setspace(0);
  ojs.base() << scientific << setprecision(3);
  return bool(prt_obj(ojs, KVP(timeline), KVP(particles)));
}

int main(int argc, char *argv[])
{
  System system;

  map<string, string> args;
  for(int i = 1; i < argc; ++i)
  {
    string key(argv[i]);
    if(key.substr(0, 2) != "--")
    {
      cerr << "Invalid argument: " + key << "." << endl;
      return 1;
    }
    key = key.substr(2);
    if(i == argc)
    {
      cerr << "Missing value of option: " << key << "." << endl;
      return 1;
    }
    if(key.substr(0, 1) == "d")
      system.durations[key.substr(1)] = atof(argv[++i]);
    else
      args[key] = argv[++i];
  }

  if(args["type"] == "py8log")
  {
    if(!system.from_py8log(cin))
    {
      cerr << "Invalid input file." << endl;
      return 1;
    }
  }
  else if(args["type"] == "hepmc2")
  {
    size_t index;
    if(args["event"] == "notset")
      index = -1;
    else
      index = atoll(args["event"].data());
    if(!system.from_hepmc2(cin, index))
    {
      cerr << "Invalid input file or index out of range." << endl;
      return 1;
    }
  }
  // else if(...)
  // {

  // }
  else
  {
    cerr << "Unsupported file type." << endl;
    return 1;
  }

  if(!system.to_json(cout))
  {
    cerr << "Error writing output." << endl;
    return 1;
  }
  cout << endl;

  // ojsonstream ojs(clog.rdbuf());
  // ojs << args;

  return 0;
}
